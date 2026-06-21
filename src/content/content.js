let isSandboxModeActive = false;
let observer;
let scanTimeout;
let currentAnalyticsStatus = { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false };
let customPIIKeys = [];

// Helper to check if the extension context is still valid
function isContextValid() {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest());
  } catch (e) {
    return false;
  }
}

// Cleanup function to stop listening and observing when extension reloads/uninstalls
function cleanupExtensionListeners() {
  if (observer) {
    try {
      observer.disconnect();
    } catch(e) {}
  }
  document.removeEventListener('submit', handleSubmit, true);
}

// Safe wrapper for sending messages to avoid throwing invalidated context errors
function safeSendMessage(message, callback) {
  if (!isContextValid()) {
    cleanupExtensionListeners();
    return;
  }
  try {
    if (callback) {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError;
        if (!err) {
          callback(response);
        }
      });
    } else {
      chrome.runtime.sendMessage(message);
    }
  } catch (e) {
    cleanupExtensionListeners();
  }
}

// Utility to search for forms recursively in Shadow DOM — O(n) single pass
function scanShadowDOM(root, formsList = []) {
  if (!root) return formsList;

  // Collect all forms at this level
  root.querySelectorAll('form').forEach(form => {
    formsList.push(parseForm(form, root !== document));
  });

  // Single-pass TreeWalker — faster than querySelectorAll('*') at every level
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.shadowRoot) {
      scanShadowDOM(node.shadowRoot, formsList);
    }
  }

  return formsList;
}

// Helper to safely get form attributes without colliding with named inputs (e.g. name="action")
function getFormAttributeSafe(form, attr) {
  if (!form) return '';
  if (typeof form.getAttribute === 'function') {
    return form.getAttribute(attr) || '';
  }
  const val = form[attr];
  return typeof val === 'string' ? val : '';
}

// Parse a form element into a serialized format
function parseForm(form, isShadow = false) {
  const inputs = [];
  const formElements = form.querySelectorAll('input, select, textarea');
  
  formElements.forEach(el => {
    // ── Cheap attribute-first checks (zero reflow cost) ──────────────────────
    const isHiddenCheap =
      el.type === 'hidden' ||
      el.hasAttribute('hidden') ||
      el.getAttribute('aria-hidden') === 'true';

    // ── Expensive computed style — only when cheap check passes ───────────────
    const isHidden = isHiddenCheap || (() => {
      const s = window.getComputedStyle(el);
      return s.display === 'none' || s.visibility === 'hidden';
    })();

    const style = isHidden ? { display: 'none', visibility: 'hidden' }
      : { display: 'block', visibility: 'visible' };

    inputs.push({
      id: typeof el.id === 'string' ? el.id : (el.getAttribute && el.getAttribute('id')) || '',
      name: typeof el.name === 'string' ? el.name : (el.getAttribute && el.getAttribute('name')) || '',
      className: typeof el.className === 'string' ? el.className : (el.getAttribute && el.getAttribute('class')) || '',
      type: typeof el.type === 'string' ? el.type : (el.tagName ? el.tagName.toLowerCase() : 'input'),
      value: typeof el.value === 'string' ? el.value : '',
      placeholder: typeof el.placeholder === 'string' ? el.placeholder : (el.getAttribute && el.getAttribute('placeholder')) || '',
      isHidden: isHidden,
      style,
    });
  });


  return {
    id: getFormAttributeSafe(form, 'id'),
    action: getFormAttributeSafe(form, 'action'),
    className: getFormAttributeSafe(form, 'class'),
    isShadow: isShadow,
    isIframe: window.self !== window.top,
    inputs: inputs
  };
}

// Only capture storage keys relevant to UTM / analytics attribution & privacy consent
const UTM_STORAGE_PREFIXES = [
  'utm_', 'sf_utm_', '_ga', '_ym', 'gclid', 'li_fat', 'hubspot',
  'wbraid', 'gbraid', 'yclid', 'mkto', '_fbp', '_fbc', 'ttclid', 'pi_opt',
  'consent', 'cookie', 'gdpr', 'ccpa', 'klaro'
];

function isRelevantStorageKey(key) {
  if (!key) return false;
  const lower = key.toLowerCase();
  return UTM_STORAGE_PREFIXES.some(prefix => lower.includes(prefix));
}

// Scan the page storage and cookies
function scanStorageAndCookies() {
  const local = {};
  const session = {};
  const cookies = [];

  // Read localStorage — only keys matching UTM/analytics patterns
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (isRelevantStorageKey(key)) {
        local[key] = localStorage.getItem(key);
      }
    }
  } catch (e) {}

  // Read sessionStorage — same allowlist filter
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (isRelevantStorageKey(key)) {
        session[key] = sessionStorage.getItem(key);
      }
    }
  } catch (e) {}

  // Read cookies — use indexOf instead of split('=') to preserve Base64/JWT values containing '='
  try {
    const rawCookies = document.cookie.split(';');
    rawCookies.forEach(cookie => {
      const eqIdx = cookie.indexOf('=');
      if (eqIdx > -1) {
        cookies.push({
          name: cookie.slice(0, eqIdx).trim(),
          value: cookie.slice(eqIdx + 1).trim()
        });
      }
    });
  } catch (e) {}

  return { local, session, cookies };
}


// Scan DOM for marketing scripts
function scanDetectedScripts() {
  return {
    gtm: !!document.querySelector('script[src*="gtm.js"]'),
    ga4: !!document.querySelector('script[src*="gtag/js"], script[src*="analytics.js"]'),
    ym: !!document.querySelector('script[src*="watch.js"], script[src*="tag.js"]'),
    fbq: !!document.querySelector('script[src*="fbevents.js"], script[src*="connect.facebook.net"]'),
    ttq: !!document.querySelector('script[src*="tiktok.com/i18n/pixel"]'),
    hsq: !!document.querySelector('script[src*="js.hs-scripts.com"], script[src*="js.hs-analytics.net"]'),
    mkt: !!document.querySelector('script[src*="munchkin.js"]'),
    prd: !!document.querySelector('script[src*="pardot.com"], script[src*="pd.js"]')
  };
}

// Perform a full scan and report to the service worker
function performScan() {
  if (!isContextValid()) {
    cleanupExtensionListeners();
    return;
  }
  const forms = scanShadowDOM(document);
  const storageData = scanStorageAndCookies();
  const detectedScripts = scanDetectedScripts();
  
  safeSendMessage({
    type: 'DOM_SCANNED_REPORT',
    url: window.location.href,
    forms: forms,
    cookies: storageData.cookies,
    storages: {
      local: storageData.local,
      session: storageData.session
    },
    isIframe: window.self !== window.top,
    detectedScripts: detectedScripts,
    analyticsStatus: currentAnalyticsStatus
  });
}

// Initialize sandbox and PII config state from storage safely
if (isContextValid()) {
  try {
    chrome.storage.local.get('sandboxMode', (data) => {
      const err = chrome.runtime.lastError;
      if (!err) {
        isSandboxModeActive = !!data.sandboxMode;
      }
    });
    chrome.storage.sync.get('customPIIKeys', (data) => {
      const err = chrome.runtime.lastError;
      if (!err && data && data.customPIIKeys) {
        customPIIKeys = data.customPIIKeys;
      }
    });
    // Listen for storage changes to sync custom PII keys dynamically
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes.customPIIKeys) {
        customPIIKeys = changes.customPIIKeys.newValue || [];
      }
    });
  } catch(e) {
    cleanupExtensionListeners();
  }
}

// Highlight form element visual feedback
function highlightFormInPage(formIndex) {
  const formsList = [];
  function getRawForms(root) {
    if (!root) return;
    const forms = root.querySelectorAll('form');
    forms.forEach(f => formsList.push(f));
    const all = root.querySelectorAll('*');
    all.forEach(el => {
      if (el.shadowRoot) {
        getRawForms(el.shadowRoot);
      }
    });
  }
  getRawForms(document);
  
  const form = formsList[formIndex];
  if (form) {
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    const originalTransition = form.style.transition;
    const originalOutline = form.style.outline;
    const originalBoxShadow = form.style.boxShadow;
    
    form.style.transition = 'all 0.3s ease';
    form.style.outline = '4px solid #06b6d4';
    form.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.8)';
    
    setTimeout(() => {
      form.style.outline = '4px solid #2563eb';
      form.style.boxShadow = '0 0 25px rgba(37, 99, 235, 0.8)';
      setTimeout(() => {
        form.style.outline = '4px solid #06b6d4';
        form.style.boxShadow = '0 0 25px rgba(6, 182, 212, 0.8)';
        setTimeout(() => {
          form.style.outline = originalOutline;
          form.style.boxShadow = originalBoxShadow;
          form.style.transition = originalTransition;
        }, 1000);
      }, 500);
    }, 500);
  }
}

// Mask sensitive information (PII) before proxying to webhooks
function maskValue(fieldName, value) {
  if (typeof value !== 'string') return value;
  
  const nameLower = fieldName.toLowerCase();
  
  // Custom user PII masking
  const isCustomMask = customPIIKeys.some(key => nameLower.includes(key.toLowerCase()));
  if (isCustomMask) {
    return '***';
  }

  // Passwords, credit cards, CVV
  const fullMaskPatterns = ['password', 'pwd', 'card', 'cvv', 'cc_', 'passport', 'secret', 'token', 'key'];
  const isFullMask = fullMaskPatterns.some(p => {
    if (p === 'key') {
      return nameLower === 'key' || 
             nameLower.startsWith('key_') || 
             nameLower.endsWith('_key') || 
             nameLower.includes('-key') || 
             nameLower.includes('key-');
    }
    return nameLower.includes(p);
  });
  if (isFullMask) {
    return '***';
  }
  
  // Email masking: only trigger when the field name indicates an email field
  // (bare includes('@') would incorrectly mask twitter handles like '@company')
  if (nameLower.includes('email') || (value.includes('@') && nameLower.includes('email'))) {
    const atIdx = value.indexOf('@');
    if (atIdx > -1) {
      const name = value.slice(0, atIdx);
      const domain = value.slice(atIdx + 1);
      if (name.length <= 2) {
        return name[0] + '***@' + domain;
      }
      return name[0] + '***' + name[name.length - 1] + '@' + domain;
    }
  }
  
  // Phone masking
  if (nameLower.includes('phone') || nameLower.includes('tel')) {
    const cleanVal = value.trim();
    if (cleanVal.length <= 4) return '***';
    return cleanVal.slice(0, 2) + '***' + cleanVal.slice(-2);
  }

  return value;
}

// Intercept form submissions
function handleSubmit(event) {
  if (!isContextValid()) {
    cleanupExtensionListeners();
    return;
  }

  if (!isSandboxModeActive) return;

  const form = event.target;
  event.preventDefault();
  event.stopPropagation();

  // Extract form inputs and values
  const payload = {};
  const formElements = form.querySelectorAll('input, select, textarea');
  
  formElements.forEach(el => {
    if (el.name && el.type !== 'submit' && el.type !== 'button') {
      if (el.type === 'checkbox') {
        payload[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) payload[el.name] = maskValue(el.name, el.value);
      } else {
        payload[el.name] = maskValue(el.name, el.value);
      }
    }
  });

  // Extract storage values as part of the payload
  const storageData = scanStorageAndCookies();
  
  safeSendMessage({
    type: 'SIMULATE_WEBHOOK_SUBMIT',
    formId: getFormAttributeSafe(form, 'id') || getFormAttributeSafe(form, 'class') || 'unnamed_form',
    action: getFormAttributeSafe(form, 'action'),
    payload: payload,
    cookies: storageData.cookies,
    storages: {
      local: storageData.local,
      session: storageData.session
    }
  });

  // Show visual notification
  showInterceptNotification();
}

document.addEventListener('submit', handleSubmit, true);

function showInterceptNotification() {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '999999';
  container.style.backgroundColor = 'rgba(15, 23, 42, 0.95)';
  container.style.backdropFilter = 'blur(10px)';
  container.style.border = '1px solid rgba(6, 182, 212, 0.5)';
  container.style.color = '#fff';
  container.style.padding = '14px 20px';
  container.style.borderRadius = '8px';
  container.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(6, 182, 212, 0.3)';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.fontSize = '14px';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '10px';
  container.style.transition = 'all 0.3s ease';
  container.style.transform = 'translateY(100px)';
  container.style.opacity = '0';

  container.innerHTML = `
    <span style="color: #06b6d4; font-weight: bold; font-size: 16px;">⚡ Sandbox 2.0:</span>
    <span>Form submission intercepted. Report sent to extension.</span>
  `;

  document.body.appendChild(container);
  
  requestAnimationFrame(() => {
    container.style.transform = 'translateY(0)';
    container.style.opacity = '1';
  });

  setTimeout(() => {
    container.style.transform = 'translateY(20px)';
    container.style.opacity = '0';
    setTimeout(() => container.remove(), 300);
  }, 4000);
}

// Function to request analytics scan from the main-world inject.js script
function requestInjectedScan() {
  document.dispatchEvent(new CustomEvent('TRIGGER_INJECTED_SCAN'));
}

// --- Dynamic Mutation Observer to track SPA loading ---
observer = new MutationObserver(() => {
  if (!isContextValid()) {
    cleanupExtensionListeners();
    return;
  }
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => {
    requestInjectedScan();
    performScan();
  }, 300);
});

try {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
} catch(e) {}

// Run scan immediately on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestInjectedScan();
    performScan();
  });
} else {
  requestInjectedScan();
  performScan();
}

// Listen for messages from popup / background
if (isContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_SANDBOX') {
        isSandboxModeActive = message.enabled;
        sendResponse({ status: 'OK' });
      } else if (message.type === 'TRIGGER_MANUAL_SCAN') {
        requestInjectedScan();
        performScan();
        sendResponse({ status: 'SCAN_STARTED' });
      } else if (message.type === 'HIGHLIGHT_FORM') {
        highlightFormInPage(message.formIndex);
        sendResponse({ status: 'OK' });
      } else if (message.type === 'NETWORK_PIXEL_DETECTED') {
        currentAnalyticsStatus[message.system] = true;
        performScan();
        sendResponse({ status: 'OK' });
      }
      return false;
    });
  } catch(e) {
    cleanupExtensionListeners();
  }
}

// Receive analytics status reports from inject.js
// Store as named function so it can be removed in cleanupExtensionListeners if needed
function handleAnalyticsDiagnostics(event) {
  if (event.detail) {
    currentAnalyticsStatus = { ...currentAnalyticsStatus, ...event.detail };
    performScan();
  }
}
document.addEventListener('ANALYTICS_DIAGNOSTICS', handleAnalyticsDiagnostics);
