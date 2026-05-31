import { create } from 'zustand';

// List of default tracking parameters
export const DEFAULT_B2B_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'wbraid',
  'gbraid',
  'yclid',
  'li_fat_id',
  'hubspotutk',
  '_mkto_trk',
  'pi_opt_in'
];

export const calculateHealthScore = (forms, redirects, storages, cookies, urlString, customB2BKeys = [], detectedScripts = {}, analyticsStatus = {}) => {
  forms = forms || [];
  redirects = redirects || [];
  storages = storages || { local: {}, session: {} };
  cookies = cookies || [];
  
  let score = 100;
  const penalties = [];
  
  const allTrackingKeys = [...DEFAULT_B2B_KEYS, ...customB2BKeys];
  
  let urlObj;
  try {
    urlObj = new URL(urlString);
  } catch (e) {
    return { score: 100, penalties: [] };
  }
  
  const urlParams = Array.from(urlObj.searchParams.keys());
  const activeTrackingParamsInUrl = urlParams.filter(key => 
    allTrackingKeys.map(k => k.toLowerCase()).includes(key.toLowerCase())
  );
  
  // 1. Critical: UTM in URL but missing in Form Hidden Fields or Storage
  if (activeTrackingParamsInUrl.length > 0) {
    let missingInFormsOrStorage = false;
    const missingDetails = [];
    
    // Check if storage has them
    const storageKeys = [
      ...Object.keys(storages.local || {}),
      ...Object.keys(storages.session || {}),
      ...cookies.map(c => c.name)
    ];

    activeTrackingParamsInUrl.forEach(param => {
      const inStorage = storageKeys.some(k => k.toLowerCase().includes(param.toLowerCase()));
      
      // Check in forms
      let inForms = false;
      if (forms.length > 0) {
        // If there are forms, we want at least one form to have the hidden input capturing this parameter
        // or check if it's generally missing in all forms
        const formHasIt = forms.some(form => 
          form.inputs.some(input => 
            input.name && input.name.toLowerCase().includes(param.toLowerCase()) && 
            (input.type === 'hidden' || input.style?.display === 'none' || input.style?.visibility === 'hidden')
          )
        );
        inForms = formHasIt;
      }

      if (!inStorage && !inForms) {
        missingInFormsOrStorage = true;
        missingDetails.push(param);
      }
    });

    if (missingInFormsOrStorage) {
      const penaltyVal = 40;
      score -= penaltyVal;
      penalties.push({
        type: 'critical',
        label: 'UTM missing in forms / Storage',
        desc: `Parameters are present in URL but missing in form hidden fields or local storage: ${missingDetails.join(', ')}`,
        penalty: penaltyVal,
        status: '🔴 Red'
      });
    }
  }

  // 2. Critical: Redirect chain stripped UTM parameters
  // If we have redirect logs and we can see that earlier URLs had UTM but the final URL does not.
  if (redirects && redirects.length > 0) {
    let utmWasStripped = false;
    let redirectStepInfo = '';
    
    // Check if the initial URL in the redirect chain had UTM parameters but the final one doesn't
    const firstRedirect = redirects[0];
    let firstUrlObj;
    try {
      firstUrlObj = new URL(firstRedirect.from);
    } catch(e) {}
    
    if (firstUrlObj) {
      const firstUrlTrackingParams = Array.from(firstUrlObj.searchParams.keys()).filter(key => allTrackingKeys.includes(key));
      if (firstUrlTrackingParams.length > 0 && activeTrackingParamsInUrl.length === 0) {
        utmWasStripped = true;
        redirectStepInfo = `Redirect from ${firstRedirect.from} stripped parameters.`;
      }
    }
    
    if (utmWasStripped) {
      const penaltyVal = 40;
      score -= penaltyVal;
      penalties.push({
        type: 'critical',
        label: 'Redirect stripped UTM parameters',
        desc: `A redirect was detected that stripped marketing parameters before the page loaded. ${redirectStepInfo}`,
        penalty: penaltyVal,
        status: '🔴 Red'
      });
    }
  }

  // 3. High: Hidden fields are present, but their values are empty when Sandbox submit runs
  // Note: we detect if forms have hidden tracking inputs, but their current value is empty
  // (and we have UTM parameters in the URL that should have filled them)
  if (activeTrackingParamsInUrl.length > 0 && forms.length > 0) {
    let emptyHiddenFields = false;
    const emptyDetails = [];
    
    forms.forEach((form, fIdx) => {
      form.inputs.forEach(input => {
        const isHidden = input.type === 'hidden' || input.style?.display === 'none' || input.style?.visibility === 'hidden';
        const isTrackingName = input.name && allTrackingKeys.some(key => input.name.toLowerCase().includes(key.toLowerCase()));
        
        if (isHidden && isTrackingName && (!input.value || input.value.trim() === '')) {
          emptyHiddenFields = true;
          emptyDetails.push(`Form #${fIdx + 1} (${input.name || 'unnamed'})`);
        }
      });
    });

    if (emptyHiddenFields) {
      const penaltyVal = 30;
      score -= penaltyVal;
      penalties.push({
        type: 'high',
        label: 'UTM hidden fields are empty',
        desc: `Hidden fields are detected but their values are empty, despite UTMs in URL: ${emptyDetails.join(', ')}`,
        penalty: penaltyVal,
        status: ' 🟠 Orange'
      });
    }
  }

  // 4. Medium: No UTM parameters in URL, and the form has NO fields/slots for capturing them
  // This is a marketing tracking omission (lack of hidden fields for tracking)
  if (activeTrackingParamsInUrl.length === 0 && forms.length > 0) {
    let hasNoTrackingSlots = false;
    
    forms.forEach(form => {
      const hasTrackingInput = form.inputs.some(input => 
        input.name && allTrackingKeys.some(key => input.name.toLowerCase().includes(key.toLowerCase()))
      );
      if (!hasTrackingInput) {
        hasNoTrackingSlots = true;
      }
    });

    if (hasNoTrackingSlots) {
      const penaltyVal = 15;
      score -= penaltyVal;
      penalties.push({
        type: 'medium',
        label: 'Form not ready to capture UTM',
        desc: 'Forms do not contain hidden fields to capture marketing parameters. Incoming campaign traffic will lose attribution.',
        penalty: penaltyVal,
        status: '🟡 Yellow'
      });
    }
  }

  // 5. Warning: Core analytics cookies missing, though script indicators might exist
  const activeCookies = cookies.map(c => c.name.toLowerCase());
  const hasGa = activeCookies.some(name => name.includes('_ga'));
  const hasYm = activeCookies.some(name => name.includes('_ym_uid') || name.startsWith('_ym_'));
  const hasHubSpot = activeCookies.some(name => name.includes('hubspotutk'));
  const hasMarketo = activeCookies.some(name => name.includes('_mkto_trk'));
  
  const missingCookies = [];
  // For enterprise B2B stack, don't penalize GA/YM missing if HubSpot or Marketo tracking is active
  if (!hasGa && !hasHubSpot && !hasMarketo) missingCookies.push('Google Analytics (_ga)');
  if (!hasYm && !hasHubSpot && !hasMarketo) missingCookies.push('Yandex Metrica (_ym_uid)');
  
  if (missingCookies.length > 0) {
    const penaltyVal = 10;
    score -= penaltyVal;
    penalties.push({
      type: 'warning',
      label: 'Analytics cookies are missing',
      desc: `Core web analytics cookies not found: ${missingCookies.join(', ')}. Check if scripts are installed.`,
      penalty: penaltyVal,
      status: '🔵 Blue'
    });
  }

  // 6. Diagnostics: Script detected but not initialized (e.g. AdBlock, CSP error, or load failure)
  if (detectedScripts && analyticsStatus) {
    const checkSystems = [
      { key: 'gtm', label: 'Google Tag Manager' },
      { key: 'ga4', label: 'Google Analytics 4' },
      { key: 'ym', label: 'Yandex Metrica' },
      { key: 'fbq', label: 'Facebook Pixel' },
      { key: 'ttq', label: 'TikTok Pixel' },
      { key: 'hsq', label: 'HubSpot Tracking' },
      { key: 'mkt', label: 'Marketo Tracking' },
      { key: 'prd', label: 'Salesforce Pardot' }
    ];

    checkSystems.forEach(sys => {
      if (detectedScripts[sys.key] && !analyticsStatus[sys.key]) {
        const penaltyVal = 10;
        score -= penaltyVal;
        penalties.push({
          type: 'warning',
          label: `${sys.label} not initialized`,
          desc: `The ${sys.label} script is present in page DOM but its global window object is not initialized. Loading might be blocked by an ad blocker or privacy extension.`,
          penalty: penaltyVal,
          status: '🔵 Blue'
        });
      }
    });
  }

  return {
    score: Math.max(0, score),
    penalties
  };
};

export const useStore = create((set, get) => ({
  // State
  url: '',
  forms: [],
  cookies: [],
  storages: { local: {}, session: {} },
  redirects: [],
  healthScore: 100,
  penalties: [],
  sandboxMode: false,
  webhookUrl: 'https://n8n.yourservice.com/webhook/test-lead',
  customB2BKeys: [],
  webhookLogs: [],
  isLoading: false,
  
  // Custom branding & tracking
  whiteLabel: { agencyName: '', email: '', phone: '', website: '', logoBase64: '' },
  customPIIKeys: [],
  detectedScripts: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false },
  analyticsStatus: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false },

  // Setters/Actions
  setPageData: (data) => {
    const { url, forms, cookies, storages, redirects, detectedScripts, analyticsStatus } = data;
    const customKeys = get().customB2BKeys;
    const { score, penalties } = calculateHealthScore(
      forms,
      redirects,
      storages,
      cookies,
      url,
      customKeys,
      detectedScripts || {},
      analyticsStatus || {}
    );
    
    set({
      url,
      forms,
      cookies,
      storages,
      redirects,
      detectedScripts: detectedScripts || { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false },
      analyticsStatus: analyticsStatus || { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false },
      healthScore: score,
      penalties
    });
  },

  setWebhookUrl: (url) => {
    set({ webhookUrl: url });
    chrome.storage.sync.set({ webhookUrl: url });
  },

  setCustomB2BKeys: (keys) => {
    set({ customB2BKeys: keys });
    chrome.storage.sync.set({ customB2BKeys: keys });
    
    const state = get();
    const { score, penalties } = calculateHealthScore(
      state.forms, 
      state.redirects, 
      state.storages, 
      state.cookies, 
      state.url, 
      keys,
      state.detectedScripts,
      state.analyticsStatus
    );
    set({ healthScore: score, penalties });
  },

  setWhiteLabel: (wl) => {
    const merged = {
      agencyName: wl?.agencyName || '',
      email: wl?.email || '',
      phone: wl?.phone || '',
      website: wl?.website || '',
      logoBase64: wl?.logoBase64 || ''
    };
    set({ whiteLabel: merged });
    chrome.storage.local.set({ whiteLabel: merged });
  },

  setCustomPIIKeys: (keys) => {
    const cleanKeys = Array.isArray(keys) ? keys : [];
    set({ customPIIKeys: cleanKeys });
    chrome.storage.sync.set({ customPIIKeys: cleanKeys });
  },

  toggleSandboxMode: (enabled) => {
    set({ sandboxMode: enabled });
    chrome.storage.local.set({ sandboxMode: enabled });

    // Notify only the currently active tab — no need to broadcast to all N tabs
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SANDBOX', enabled }, () => {
          void chrome.runtime.lastError; // suppress expected error if content script not loaded
        });
      }
    });
  },


  addWebhookLog: (log) => {
    const newLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      ...log
    };
    set((state) => {
      const logs = [newLog, ...state.webhookLogs].slice(0, 50);
      chrome.storage.local.set({ webhookLogs: logs });
      return { webhookLogs: logs };
    });
  },

  clearWebhookLogs: () => {
    set({ webhookLogs: [] });
    chrome.storage.local.set({ webhookLogs: [] });
  },

  loadSettings: async () => {
    set({ isLoading: true });
    
    const syncData = await new Promise(resolve => {
      chrome.storage.sync.get(['webhookUrl', 'customB2BKeys', 'customPIIKeys'], (data) => resolve(data || {}));
    });
    
    const localData = await new Promise(resolve => {
      chrome.storage.local.get(['sandboxMode', 'webhookLogs', 'whiteLabel'], (data) => resolve(data || {}));
    });

    const wl = localData.whiteLabel;
    const mergedWhiteLabel = {
      agencyName: wl?.agencyName || '',
      email: wl?.email || '',
      phone: wl?.phone || '',
      website: wl?.website || '',
      logoBase64: wl?.logoBase64 || ''
    };

    set({
      webhookUrl: syncData.webhookUrl || 'https://n8n.yourservice.com/webhook/test-lead',
      customB2BKeys: Array.isArray(syncData.customB2BKeys) ? syncData.customB2BKeys : [],
      whiteLabel: mergedWhiteLabel,
      customPIIKeys: Array.isArray(syncData.customPIIKeys) ? syncData.customPIIKeys : [],
      sandboxMode: !!localData.sandboxMode,
      webhookLogs: Array.isArray(localData.webhookLogs) ? localData.webhookLogs : [],
      isLoading: false
    });
  }
}));

let isStorageListenerRegistered = false;

// Real-time synchronization of Chrome storage updates (sync and local) into Zustand store
if (typeof chrome !== 'undefined' && chrome.storage && !isStorageListenerRegistered) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
      const stateUpdate = {};
      if (changes.webhookUrl) stateUpdate.webhookUrl = changes.webhookUrl.newValue;
      if (changes.customB2BKeys) {
        stateUpdate.customB2BKeys = Array.isArray(changes.customB2BKeys.newValue) ? changes.customB2BKeys.newValue : [];
      }
      if (changes.customPIIKeys) {
        stateUpdate.customPIIKeys = Array.isArray(changes.customPIIKeys.newValue) ? changes.customPIIKeys.newValue : [];
      }
      
      useStore.setState(stateUpdate);
    }
    if (areaName === 'local') {
      const stateUpdate = {};
      if (changes.sandboxMode) stateUpdate.sandboxMode = !!changes.sandboxMode.newValue;
      if (changes.webhookLogs) {
        stateUpdate.webhookLogs = Array.isArray(changes.webhookLogs.newValue) ? changes.webhookLogs.newValue : [];
      }
      if (changes.whiteLabel) {
        const wl = changes.whiteLabel.newValue;
        stateUpdate.whiteLabel = {
          agencyName: wl?.agencyName || '',
          email: wl?.email || '',
          phone: wl?.phone || '',
          website: wl?.website || '',
          logoBase64: wl?.logoBase64 || ''
        };
      }
      
      useStore.setState(stateUpdate);
    }
  });
  isStorageListenerRegistered = true;
}
