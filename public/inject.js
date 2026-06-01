(function() {
  const status = { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false };

  function checkAnalytics() {
    try {
      status.gtm = status.gtm || !!(window.google_tag_manager && window.dataLayer);
      
      status.ga4 = status.ga4 || !!(
        window.gtag || 
        window.gaDevIds || 
        window.google_tag_data || 
        (window.google_tag_manager && Array.isArray(window.dataLayer) && window.dataLayer.some(e => e && (e[0] === 'js' || (e.event && e.event.includes('gtm')))))
      );
      
      status.ym = status.ym || typeof window.ym === 'function' || !!(window.Ya && (window.Ya.Metrika || window.Ya.Metrika2));
      
      status.fbq = status.fbq || typeof window.fbq === 'function' || typeof window._fbq === 'function';
      
      status.ttq = status.ttq || typeof window.ttq === 'function' || typeof window._ttq === 'function';
      
      status.hsq = status.hsq || typeof window._hsq === 'object' || typeof window.hbspt === 'object';
      
      status.mkt = status.mkt || typeof window.Munchkin === 'object' || typeof window.Munchkin === 'function';
      
      status.prd = status.prd || typeof window.piAId !== 'undefined' || typeof window.piCId !== 'undefined';

      document.dispatchEvent(new CustomEvent('ANALYTICS_DIAGNOSTICS', {
        detail: status
      }));
    } catch (e) {
      console.warn('[UTM Validator Inject] Error scanning main world analytics:', e);
    }
  }

  // Intercept URLs to catch tracking requests
  function detectAnalyticsFromUrl(url) {
    if (!url || typeof url !== 'string') return;
    let system = null;
    const urlLower = url.toLowerCase();
    
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
    
    if (system && !status[system]) {
      status[system] = true;
      checkAnalytics(); // Dispatch update immediately
    }
  }

  // Guard monkey-patches against double-wrapping on SPA re-navigation
  // Using Symbol.for() prevents leaking a named key to the page's window object
  const PATCH_SENTINEL = Symbol.for('__utmValidatorPatched');
  if (!window[PATCH_SENTINEL]) {
    window[PATCH_SENTINEL] = true;
    try {
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = args[0];
        detectAnalyticsFromUrl(url);
        return originalFetch.apply(this, args);
      };

      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...args) {
        detectAnalyticsFromUrl(url);
        return originalOpen.apply(this, [method, url, ...args]);
      };

      if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
          detectAnalyticsFromUrl(url);
          return originalSendBeacon.apply(this, [url, data]);
        };
      }
    } catch (err) {
      console.warn('[UTM Validator Inject] Network interceptor hook failed:', err);
    }
  }

  // Poll for analytics scripts initialization
  checkAnalytics();
  
  // Run checks repeatedly to catch delayed scripts
  let checkCount = 0;
  const interval = setInterval(() => {
    checkAnalytics();
    checkCount++;
    if (checkCount >= 10) { // Poll for 5 seconds total (10 * 500ms)
      clearInterval(interval);
    }
  }, 500);

  // { once: true } automatically removes the listener after first fire — no manual cleanup needed
  window.addEventListener('load', checkAnalytics, { once: true });
  window.addEventListener('DOMContentLoaded', checkAnalytics, { once: true });

  // Trigger checks on user interaction events (since optimization plugins like WP Rocket delay scripts until interaction)
  const interactionEvents = ['scroll', 'mousemove', 'keydown', 'click', 'touchstart'];
  
  const triggerInteractionCheck = () => {
    // Delay-check to catch dynamically loading scripts post-interaction
    setTimeout(checkAnalytics, 500);
    setTimeout(checkAnalytics, 3000);
    
    // Remove listeners from all interaction events immediately
    interactionEvents.forEach(eventName => {
      window.removeEventListener(eventName, triggerInteractionCheck);
    });
  };

  interactionEvents.forEach(eventName => {
    window.addEventListener(eventName, triggerInteractionCheck, { passive: true });
  });

  // Listen for manually triggered scan requests from the content script
  document.addEventListener('TRIGGER_INJECTED_SCAN', checkAnalytics);
})();
