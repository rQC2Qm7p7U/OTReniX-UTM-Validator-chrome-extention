// Service worker state stored in chrome.storage.session with fallback to local (MV3 compliant)
const sessionStore = typeof chrome !== 'undefined' && chrome.storage && (chrome.storage.session || chrome.storage.local);

// Set default Side Panel behavior if supported
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

// Initialize session storage configuration
chrome.runtime.onInstalled.addListener(() => {
  // Set default values if not defined
  chrome.storage.sync.get(['webhookUrl', 'customB2BKeys'], (syncData) => {
    if (!syncData.webhookUrl) {
      chrome.storage.sync.set({ webhookUrl: 'https://n8n.yourservice.com/webhook/test-lead' });
    }
    if (!syncData.customB2BKeys) {
      chrome.storage.sync.set({ customB2BKeys: [] });
    }
  });

  chrome.storage.local.get(['sandboxMode', 'webhookLogs'], (localData) => {
    if (localData.sandboxMode === undefined) {
      chrome.storage.local.set({ sandboxMode: false });
    }
    if (!localData.webhookLogs) {
      chrome.storage.local.set({ webhookLogs: [] });
    }
  });
});

// --- Redirect Tracking with webRequest API ---
if (typeof chrome !== 'undefined' && chrome.webRequest) {
  chrome.webRequest.onBeforeRedirect.addListener(
    async (details) => {
      if (details.tabId === -1) return; // Ignore requests not associated with a tab
      
      const tabId = details.tabId;
      const storageKey = `redirects_${tabId}`;
      
      try {
        const result = await sessionStore.get(storageKey);
        const chain = result[storageKey] || [];
        
        chain.push({
          from: details.url,
          to: details.redirectUrl,
          timestamp: details.timeStamp
        });
        
        await sessionStore.set({ [storageKey]: chain });
      } catch (e) {
        console.warn('Error saving redirect chain:', e);
      }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] }
  );

  // --- Network-level Analytics Script Tracking ---
  chrome.webRequest.onBeforeRequest.addListener(
    async (details) => {
      if (details.tabId === -1) return;
      const tabId = details.tabId;
      const url = details.url;
      const urlLower = url.toLowerCase();
      
      let system = null;
      if (urlLower.includes('google-analytics.com') || urlLower.includes('/g/collect') || urlLower.includes('analytics.google.com')) {
        system = 'ga4';
      } else if (urlLower.includes('googletagmanager.com/gtm.js') || urlLower.includes('gtm.js?id=')) {
        system = 'gtm';
      } else if (urlLower.includes('mc.yandex.ru') || urlLower.includes('watch.js') || urlLower.includes('tag.js')) {
        system = 'ym';
      } else if (urlLower.includes('facebook.net') || urlLower.includes('facebook.com/tr/')) {
        system = 'fbq';
      } else if (urlLower.includes('tiktok.com/i18n/pixel') || urlLower.includes('analytics.tiktok.com')) {
        system = 'ttq';
      } else if (urlLower.includes('hs-analytics.net') || urlLower.includes('hs-scripts.com') || urlLower.includes('js.hs-analytics.net')) {
        system = 'hsq';
      } else if (urlLower.includes('marketo.net') || urlLower.includes('mktorespond.com')) {
        system = 'mkt';
      } else if (urlLower.includes('pardot.com')) {
        system = 'prd';
      }
      
      if (system) {
        const networkKey = `network_detected_${tabId}`;
        const pageDataKey = `page_data_${tabId}`;
        try {
          const netRes = await sessionStore.get(networkKey);
          const detected = netRes[networkKey] || { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false };
          
          if (!detected[system]) {
            detected[system] = true;
            await sessionStore.set({ [networkKey]: detected });
            
            // Proactively update active page_data if it exists
            const pageDataRes = await sessionStore.get(pageDataKey);
            const pageData = pageDataRes[pageDataKey];
            if (pageData) {
              pageData.analyticsStatus = pageData.analyticsStatus || { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false };
              pageData.detectedScripts = pageData.detectedScripts || { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false };
              
              pageData.analyticsStatus[system] = true;
              pageData.detectedScripts[system] = true;
              
              await sessionStore.set({ [pageDataKey]: pageData });
            }

            // Sync variable back to page content script if active
            chrome.tabs.sendMessage(tabId, { type: 'NETWORK_PIXEL_DETECTED', system }, () => {
              void chrome.runtime.lastError;
            });
            
            // Notify UI popup to update visual state
            chrome.runtime.sendMessage({ type: 'PAGE_DATA_UPDATED', tabId }, () => {
              void chrome.runtime.lastError;
            });
          }
        } catch (e) {
          console.warn('Error saving network analytics:', e);
        }
      }
    },
    { urls: ["<all_urls>"] }
  );
}

// --- Navigation Tracking to Clear Stale Redirects ---
if (typeof chrome !== 'undefined' && chrome.webNavigation) {
  chrome.webNavigation.onCommitted.addListener(async (details) => {
    if (details.frameId !== 0) return; // Track main frame navigation only
    
    const tabId = details.tabId;
    const storageKey = `redirects_${tabId}`;
    const networkKey = `network_detected_${tabId}`;
    
    const isRedirect = details.transitionQualifiers.includes('server_redirect') || 
                       details.transitionQualifiers.includes('client_redirect');
                       
    if (!isRedirect) {
      try {
        await sessionStore.remove(storageKey);
        await sessionStore.remove(networkKey);
      } catch (e) {
        console.warn('Error removing redirect/network data:', e);
      }
    } else {
      // Clear network pixels from previous site even on redirect
      try {
        await sessionStore.remove(networkKey);
      } catch (e) {}
    }
  });
}

// --- DOM Scanned Reports Aggregation ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === 'DOM_SCANNED_REPORT') {
    if (!tabId) {
      sendResponse({ status: 'NO_TAB_ID' });
      return;
    }
    sendResponse({ status: 'ACK' });
    (async () => {
      const storageKey = `page_data_${tabId}`;
      let pageData;
      
      try {
        const result = await sessionStore.get(storageKey);
        pageData = result[storageKey];
      } catch (e) {
        console.warn('Error reading page_data:', e);
      }

      if (message.isIframe === false) {
        // Main page scan resets the data - fetch and merge network-level detected pixels
        let networkDetected = {};
        try {
          const netRes = await sessionStore.get(`network_detected_${tabId}`);
          networkDetected = netRes[`network_detected_${tabId}`] || {};
        } catch (e) {}

        const mergedAnalyticsStatus = {
          gtm: message.analyticsStatus.gtm || !!networkDetected.gtm,
          ga4: message.analyticsStatus.ga4 || !!networkDetected.ga4,
          ym: message.analyticsStatus.ym || !!networkDetected.ym,
          fbq: message.analyticsStatus.fbq || !!networkDetected.fbq,
          ttq: message.analyticsStatus.ttq || !!networkDetected.ttq,
          hsq: message.analyticsStatus.hsq || !!networkDetected.hsq,
          mkt: message.analyticsStatus.mkt || !!networkDetected.mkt,
          prd: message.analyticsStatus.prd || !!networkDetected.prd
        };

        const mergedDetectedScripts = {
          gtm: message.detectedScripts.gtm || !!networkDetected.gtm,
          ga4: message.detectedScripts.ga4 || !!networkDetected.ga4,
          ym: message.detectedScripts.ym || !!networkDetected.ym,
          fbq: message.detectedScripts.fbq || !!networkDetected.fbq,
          ttq: message.detectedScripts.ttq || !!networkDetected.ttq,
          hsq: message.detectedScripts.hsq || !!networkDetected.hsq,
          mkt: message.detectedScripts.mkt || !!networkDetected.mkt,
          prd: message.detectedScripts.prd || !!networkDetected.prd
        };

        pageData = {
          url: message.url,
          forms: message.forms,
          cookies: message.cookies,
          storages: message.storages,
          detectedScripts: mergedDetectedScripts,
          analyticsStatus: mergedAnalyticsStatus,
          timestamp: Date.now()
        };
      } else {
        // Subframe (iframe) form reports are appended
        if (!pageData) {
          pageData = {
            url: sender.tab?.url || '',
            forms: [],
            cookies: [],
            storages: { local: {}, session: {} },
            timestamp: Date.now()
          };
        }
        
        // Tag subframe forms so we know where they came from
        const subframeForms = message.forms.map(form => ({
          ...form,
          iframeUrl: message.url
        }));

        pageData.forms = [...pageData.forms, ...subframeForms];
      }

      try {
        await sessionStore.set({ [storageKey]: pageData });
      } catch (e) {
        console.warn('Error writing page_data:', e);
      }
      
      // Notify popup with a callback to suppress unhandled rejections
      chrome.runtime.sendMessage({ type: 'PAGE_DATA_UPDATED', tabId }, () => {
        void chrome.runtime.lastError; // suppress "Receiving end does not exist"
      });
    })();
    return;
  }

  // --- Sandbox Webhook Simulation Proxy ---
  if (message.type === 'SIMULATE_WEBHOOK_SUBMIT') {
    sendResponse({ status: 'ACK' });
    (async () => {
      // Get the configured Webhook URL
      const syncData = await chrome.storage.sync.get('webhookUrl');
      const webhookUrl = syncData.webhookUrl || 'https://n8n.yourservice.com/webhook/test-lead';

      // Assemble payload including analytical variables
      const cleanUrl = sender.tab?.url || '';
      let urlObj;
      const utmParams = {};
      try {
        urlObj = new URL(cleanUrl);
        urlObj.searchParams.forEach((value, key) => {
          utmParams[key] = value;
        });
      } catch (e) {}

      // Identify marketing cookies & storage variables
      const analyticsVariables = {};
      message.cookies.forEach(c => {
        if (c.name.includes('_ga') || c.name.includes('_ym') || c.name.includes('li_fat') || c.name.includes('hubspot') || c.name.includes('_mkto_trk') || c.name.includes('pardot')) {
          analyticsVariables[c.name] = c.value;
        }
      });
      Object.keys(message.storages.local).forEach(k => {
        if (k.includes('roistat') || k.includes('utm') || k.includes('_ga') || k.includes('_mkto_trk') || k.includes('hubspot') || k.includes('pardot')) {
          analyticsVariables[k] = message.storages.local[k];
        }
      });

      const payload = {
        meta: {
          timestamp: new Date().toISOString(),
          source_url: cleanUrl,
          form_id: message.formId,
          target_action: message.action
        },
        form_data: message.payload,
        utm_params: utmParams,
        analytics_variables: analyticsVariables
      };

      let responseStatus = 0;
      let responseText = '';
      let success = false;

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        responseStatus = response.status;
        responseText = await response.text();
        success = response.ok;
      } catch (err) {
        responseText = err.message || 'Network error';
        responseStatus = 500;
        success = false;
      }

      // Add log to local storage
      const localData = await chrome.storage.local.get('webhookLogs');
      const logs = localData.webhookLogs || [];
      const newLog = {
        // crypto.randomUUID() is available in MV3 service workers — collision-free vs Math.random()
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        formId: message.formId,
        url: cleanUrl,
        webhookUrl: webhookUrl,
        payload: payload,
        status: success ? 'SUCCESS' : 'FAILURE',
        responseStatus: responseStatus,
        responseText: responseText.slice(0, 500)
      };

      logs.unshift(newLog);
      await chrome.storage.local.set({ webhookLogs: logs.slice(0, 50) });

      // Notify popup and options tabs with callback
      chrome.runtime.sendMessage({ 
        type: 'WEBHOOK_SUBMITTED_LOG', 
        log: newLog 
      }, () => {
        void chrome.runtime.lastError; // suppress "Receiving end does not exist"
      });
    })();
    return false;
  }
  // Explicit fallback — no response needed for unrecognized message types
  return false;
});
