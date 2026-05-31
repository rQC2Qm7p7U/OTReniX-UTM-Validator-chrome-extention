import { useState, useCallback } from 'react';
import { useStore } from '../store';

export function useScanData() {
  const [isScanning, setIsScanning] = useState(false);
  const setPageData = useStore((state) => state.setPageData);

  const fetchTabData = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const pageDataKey = `page_data_${tab.id}`;
      const redirectsKey = `redirects_${tab.id}`;
      
      const sessionStore = chrome.storage.session || chrome.storage.local;
      const sessionData = await sessionStore.get([pageDataKey, redirectsKey]);
      const pageData = sessionData[pageDataKey] || { 
        url: tab.url, 
        forms: [], 
        cookies: [], 
        storages: { local: {}, session: {} },
        detectedScripts: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false },
        analyticsStatus: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false, mkt: false, prd: false }
      };
      const tabRedirects = sessionData[redirectsKey] || [];

      setPageData({
        url: pageData.url,
        forms: pageData.forms,
        cookies: pageData.cookies,
        storages: pageData.storages,
        redirects: tabRedirects,
        detectedScripts: pageData.detectedScripts,
        analyticsStatus: pageData.analyticsStatus
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  }, [setPageData]);

  const triggerScanAndFetch = useCallback(async () => {
    setIsScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || tab.url?.startsWith('chrome://')) {
        setIsScanning(false);
        return;
      }

      // 1. Tell content script to scan
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_MANUAL_SCAN' }, () => {
        if (chrome.runtime.lastError) {
          console.log('Content script not loaded or active yet');
          fetchTabData();
        }
      });
    } catch (e) {
      console.error(e);
      setIsScanning(false);
    }
  }, [fetchTabData]);

  const handleAutoFillMocks = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      
      const currentUrl = new URL(tab.url);
      currentUrl.searchParams.set('utm_source', 'google');
      currentUrl.searchParams.set('utm_medium', 'cpc');
      currentUrl.searchParams.set('utm_campaign', 'audit_lead_validator');
      currentUrl.searchParams.set('gclid', 'test_gclid_999');
      currentUrl.searchParams.set('li_fat_id', 'test_linkedin_888');
      currentUrl.searchParams.set('hubspotutk', 'test_hubspot_777');
      currentUrl.searchParams.set('_mkto_trk', 'test_marketo_555');
      currentUrl.searchParams.set('pi_opt_in', 'true');
      
      chrome.tabs.update(tab.id, { url: currentUrl.toString() }, () => {
        setTimeout(triggerScanAndFetch, 500);
      });
    } catch (e) {
      console.error(e);
    }
  }, [triggerScanAndFetch]);

  const handleHighlightForm = useCallback(async (index) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FORM', formIndex: index });
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    isScanning,
    fetchTabData,
    triggerScanAndFetch,
    handleAutoFillMocks,
    handleHighlightForm
  };
}
