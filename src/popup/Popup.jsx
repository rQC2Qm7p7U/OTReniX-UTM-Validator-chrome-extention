import React, { useEffect, useState, useRef } from 'react';
import { 
  useStore, 
  DEFAULT_B2B_KEYS 
} from './store';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  FileText, 
  Check, 
  Copy, 
  Download, 
  RefreshCw, 
  Sliders, 
  Zap, 
  ExternalLink,
  Eye
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

export default function Popup() {
  const {
    url,
    forms,
    cookies,
    storages,
    redirects,
    healthScore,
    penalties,
    sandboxMode,
    webhookUrl,
    customB2BKeys,
    webhookLogs,
    isLoading,
    loadSettings,
    setPageData,
    toggleSandboxMode,
    addWebhookLog,
    clearWebhookLogs,
    whiteLabel,
    detectedScripts,
    analyticsStatus
  } = useStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [copiedDevs, setCopiedDevs] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const reportRef = useRef(null);

  // Load configuration and data on popup open
  useEffect(() => {
    loadSettings();
    triggerScanAndFetch();

    // Listen to reactive updates from content script / service worker
    const messageListener = (message) => {
      if (message.type === 'PAGE_DATA_UPDATED') {
        fetchTabData();
      } else if (message.type === 'WEBHOOK_SUBMITTED_LOG') {
        // Trigger settings load to fetch updated logs
        loadSettings();
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const triggerScanAndFetch = async () => {
    setIsScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id || tab.url?.startsWith('chrome://')) {
        setIsScanning(false);
        return;
      }

      // 1. Tell content script to scan
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_MANUAL_SCAN' }, () => {
        // Safe check for error
        if (chrome.runtime.lastError) {
          console.log('Content script not loaded or active yet');
        }
        // 2. Fetch the data from background session storage
        setTimeout(fetchTabData, 200);
      });
    } catch (e) {
      console.error(e);
      setIsScanning(false);
    }
  };

  const fetchTabData = async () => {
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
        detectedScripts: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false },
        analyticsStatus: { gtm: false, ga4: false, ym: false, fbq: false, ttq: false, hsq: false }
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
  };

  const handleAutoFillMocks = async () => {
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
      
      chrome.tabs.update(tab.id, { url: currentUrl.toString() }, () => {
        setTimeout(triggerScanAndFetch, 500);
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleHighlightForm = async (index) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FORM', formIndex: index });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const captureCurrentTabScreenshot = () => {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
          chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.log('Screenshot capture error:', chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(dataUrl);
            }
          });
        } else {
          resolve(null);
        }
      } catch (err) {
        console.warn('Screenshot capture exception:', err);
        resolve(null);
      }
    });
  };

  const resizeScreenshot = (dataUrl) => {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 480;
        let width = img.width;
        let height = img.height;
        if (width > maxW) {
          const ratio = maxW / width;
          width = maxW;
          height = height * ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  };

  const generateDevCodeSnippet = () => {
    const keys = [...DEFAULT_B2B_KEYS, ...customB2BKeys];
    
    let htmlInputs = '<!-- Add these hidden fields inside your <form> tag -->\n';
    keys.forEach(k => {
      htmlInputs += `<input type="hidden" name="${k}" id="sf_${k}" value="">\n`;
    });
    
    let jsScript = '<script>\n';
    jsScript += '(function() {\n';
    jsScript += '  var params = new URLSearchParams(window.location.search);\n';
    jsScript += `  var keys = ${JSON.stringify(keys)};\n`;
    jsScript += '  keys.forEach(function(k) {\n';
    jsScript += '    var val = params.get(k);\n';
    jsScript += '    if (val) {\n';
    jsScript += '      var el = document.querySelector(\'input[name="\' + k + \'"], #sf_\' + k);\n';
    jsScript += '      if (el) el.value = val;\n';
    jsScript += '      localStorage.setItem(\'sf_utm_\' + k, val);\n';
    jsScript += '    } else {\n';
    jsScript += '      var cached = localStorage.getItem(\'sf_utm_\' + k);\n';
    jsScript += '      if (cached) {\n';
    jsScript += '        var el = document.querySelector(\'input[name="\' + k + \'"], #sf_\' + k);\n';
    jsScript += '        if (el) el.value = cached;\n';
    jsScript += '      }\n';
    jsScript += '    }\n';
    jsScript += '  });\n';
    jsScript += '})();\n';
    jsScript += '</script>';
    
    return { htmlInputs, jsScript };
  };

  // Generate Technical Markdown (Tech Spec for developers)
  const generateMarkdownReport = () => {
    const allKeys = [...DEFAULT_B2B_KEYS, ...customB2BKeys];
    let md = `# Technical Specification: Fixing UTM and Lead Source Attribution\n`;
    md += `**Page:** ${url}\n`;
    md += `**Audit Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    md += `**Health Score:** ${healthScore}/100\n\n`;

    md += `## ⚠️ Identified Issues:\n`;
    if (penalties.length === 0) {
      md += `* No issues found. Forms are correctly configured with hidden fields to capture traffic.\n`;
    } else {
      penalties.forEach(p => {
        md += `### [${p.status}] ${p.label} (Penalty: -${p.penalty} points)\n`;
        md += `${p.desc}\n\n`;
      });
    }

    md += `\n## 📋 Detected Forms on Page:\n`;
    if (forms.length === 0) {
      md += `* No forms found on the page (or they are nested inside secure external iframes).\n`;
    } else {
      forms.forEach((form, idx) => {
        const formIdStr = typeof form.id === 'string' ? form.id : '';
        const formClassStr = typeof form.className === 'string' ? form.className : '';
        const formActionStr = typeof form.action === 'string' ? form.action : '';

        md += `### Form #${idx + 1}\n`;
        md += `- **ID Selector:** \`${formIdStr || 'none'}\`\n`;
        md += `- **Class Selector:** \`${formClassStr || 'none'}\`\n`;
        md += `- **Action:** \`${formActionStr || 'none'}\`\n`;
        md += `- **Details:** ${form.isShadow ? 'Inside Shadow DOM' : 'Standard DOM'}${form.isIframe ? ' (Inside iframe)' : ''}\n`;
        md += `- **Fields List:**\n`;
        
        if (form.inputs && Array.isArray(form.inputs)) {
          form.inputs.forEach(input => {
            const inputNameStr = typeof input.name === 'string' ? input.name : '';
            const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
            const inputValueStr = typeof input.value === 'string' ? input.value : '';

            const isTrackingName = inputNameStr && allKeys.some(k => inputNameStr.toLowerCase().includes(k.toLowerCase()));
            const marker = isTrackingName ? '🔹 [UTM slot]' : '🔸';
            md += `  - ${marker} \`${inputNameStr || 'unnamed'}\` | type: \`${inputTypeStr}\` | value: \`${inputValueStr || 'empty'}\` | visibility: \`${input.isHidden ? 'hidden' : 'visible'}\`\n`;
          });
        }
        md += `\n`;
      });
    }

    md += `\n## ⚙️ Recommended Capture Parameters:\n`;
    md += `Make sure all forms have hidden inputs for the following keys:\n`;
    allKeys.forEach(k => {
      md += `- \`${k}\`\n`;
    });

    md += `\n---\n*Report automatically generated by Dynamic UTM & Lead Source Validator.*`;
    return md;
  };

  const copyToClipboardDevs = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md).then(() => {
      setCopiedDevs(true);
      setTimeout(() => setCopiedDevs(false), 2000);
    });
  };

  // Generate Executive Report (PDF)
  const downloadPdfReport = async () => {
    setGeneratingPdf(true);
    
    try {
      const rawScreenshot = await captureCurrentTabScreenshot();
      if (rawScreenshot) {
        const resized = await resizeScreenshot(rawScreenshot);
        setScreenshotUrl(resized);
      } else {
        setScreenshotUrl(null);
      }
    } catch (e) {
      console.warn('Failed to capture screenshot:', e);
      setScreenshotUrl(null);
    }
    
    // Wait for React to render the screenshot img in the hidden container
    setTimeout(() => {
      const element = reportRef.current;
      
      const opt = {
        margin:       0,
        filename:     `UTM_Audit_Report_${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#050b14', // OTReniX Premium slate dark bg
          width: 794,
          height: 1122
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      html2pdf().from(element).set(opt).save().then(() => {
        setGeneratingPdf(false);
      }).catch(err => {
        console.error(err);
        setGeneratingPdf(false);
      });
    }, 450);
  };

  // Determine color theme based on score
  const getScoreColor = () => {
    if (healthScore >= 80) return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (healthScore >= 60) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  };

  const theme = getScoreColor();
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col relative select-none">
      {/* Header */}
      <header className="px-4 py-3 bg-slate-900/60 border-b border-white/5 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <h1 className="text-sm font-bold tracking-wider bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
            UTM VALIDATOR
          </h1>
        </div>
        <button 
          onClick={handleOpenSettings} 
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </header>

      {/* Navigation */}
      <nav className="flex px-3 py-2 bg-slate-950 border-b border-white/5 gap-1 z-10">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${
            activeTab === 'dashboard'
              ? 'bg-white/5 text-white shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('tree')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${
            activeTab === 'tree'
              ? 'bg-white/5 text-white shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
          }`}
        >
          Data Tree ({forms.length})
        </button>
        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 relative ${
            activeTab === 'sandbox'
              ? 'bg-white/5 text-white shadow-sm border border-white/10'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/2'
          }`}
        >
          Sandbox
          {sandboxMode && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-500 rounded-full animate-ping"></span>
          )}
        </button>
      </nav>

      {/* Main Content Area */}
      <div className={`flex-1 p-4 flex flex-col gap-4 min-h-0 ${activeTab === 'sandbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm font-medium tracking-wide text-cyan-300">Analyzing DOM structure...</span>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Health Score Card */}
            <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">Health Score</span>
                <span className={`text-lg font-bold ${theme.text}`}>
                  {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Warning' : 'Critical'}
                </span>
                <span className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
                  {forms.length === 0 
                    ? 'No forms found on the current page.' 
                    : `Forms audited: ${forms.length}. Redirects recorded: ${redirects.length}`}
                </span>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-slate-800"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    stroke={theme.stroke}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                    style={{
                      filter: `drop-shadow(0 0 4px ${theme.stroke}60)`
                    }}
                  />
                </svg>
                <div className="absolute text-center flex flex-col">
                  <span className="text-2xl font-black tracking-tight">{healthScore}</span>
                  <span className="text-[8px] text-slate-400 uppercase tracking-widest font-semibold">score</span>
                </div>
              </div>
            </div>

            {/* URL Info */}
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-lg px-3 py-2 text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                <span className="font-semibold text-slate-300">URL:</span>
                <span className="truncate flex-1">{url || 'Loading...'}</span>
              </div>
              <button 
                onClick={handleAutoFillMocks}
                className="px-2.5 py-2 bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Generate test UTM parameters in tab URL"
              >
                <Zap className="w-3.5 h-3.5" /> UTM
              </button>
            </div>

            {/* Analytics Scripts Diagnostics */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Analytics Systems Audit</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: 'GTM', key: 'gtm' },
                  { name: 'GA4', key: 'ga4' },
                  { name: 'Yandex', key: 'ym' },
                  { name: 'FB Pixel', key: 'fbq' },
                  { name: 'TikTok', key: 'ttq' },
                  { name: 'HubSpot', key: 'hsq' }
                ].map(sys => {
                  const initialized = analyticsStatus && analyticsStatus[sys.key];
                  const detected = (detectedScripts && detectedScripts[sys.key]) || initialized;
                  
                  let statusText = 'Not Found';
                  let statusClass = 'border-white/5 text-slate-500 bg-white/2';
                  
                  if (detected) {
                    if (initialized) {
                      statusText = 'Active';
                      statusClass = 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5';
                    } else {
                      statusText = 'Failed';
                      statusClass = 'border-red-500/25 text-red-400 bg-red-500/5 animate-pulse';
                    }
                  }
                  
                  return (
                    <div key={sys.name} className={`border rounded-lg p-2 flex flex-col gap-0.5 text-center ${statusClass}`}>
                      <span className="text-[10px] font-bold">{sys.name}</span>
                      <span className="text-[8px] font-medium">{statusText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Audit Log / Penalties */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Audit Log</span>
              {penalties.length === 0 ? (
                <div className="glass-panel border-emerald-500/10 rounded-lg p-4 flex flex-col items-center justify-center text-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-400">Marketing Tags Protected</span>
                  <p className="text-[10px] text-slate-400 max-w-[280px]">
                    Forms contain hidden fields, and UTM parameters are securely captured and stored in local storage.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {penalties.map((item, idx) => (
                    <div key={idx} className="glass-panel rounded-lg p-3 flex gap-3 border-l-3 items-start" style={{ borderLeftColor: item.type === 'critical' ? '#ef4444' : item.type === 'high' ? '#f97316' : item.type === 'medium' ? '#eab308' : '#3b82f6' }}>
                      <div className="mt-0.5">
                        {item.type === 'critical' && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse-neon" />}
                        {item.type === 'high' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {item.type === 'medium' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-blue-500" />}
                      </div>
                      <div className="flex-1 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-200 leading-none">{item.label}</span>
                          <span className="text-[9px] font-black text-slate-400">-{item.penalty} {item.penalty === 1 ? 'point' : 'points'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agency-First CTA Section */}
            {healthScore < 60 && (
              <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-3 flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-red-400">End-to-End Attribution Broken</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  A potential lead from paid ads will lose their traffic source when entering your CRM. Generate a tech spec for developers or download the audit report.
                </p>
                <div className="flex gap-2 mt-1">
                  <button 
                    onClick={copyToClipboardDevs}
                    className="flex-1 py-1.5 px-2 bg-slate-900 border border-white/10 rounded-md text-[10px] font-medium flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors cursor-pointer text-slate-200"
                  >
                    {copiedDevs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedDevs ? 'Copied!' : 'Copy Tech Spec (MD)'}
                  </button>
                  <button 
                    onClick={downloadPdfReport}
                    disabled={generatingPdf}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 rounded-md text-[10px] font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {generatingPdf ? 'Exporting...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Data Tree Tab */}
        {activeTab === 'tree' && (
          <div className="flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fields Structure</span>
              <button 
                onClick={triggerScanAndFetch}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Rescan DOM
              </button>
            </div>

            {forms.length === 0 ? (
              <div className="glass-panel rounded-lg p-6 text-center flex flex-col items-center justify-center gap-2">
                <AlertTriangle className="w-8 h-8 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">No Forms Detected</span>
                <p className="text-[10px] text-slate-500 max-w-[240px]">
                  No open HTML forms found on this page. The extension will keep monitoring the DOM.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {forms.map((form, fIdx) => (
                  <div key={fIdx} className="glass-panel rounded-xl overflow-hidden">
                    {/* Form Title bar */}
                    <div className="bg-slate-900/50 px-3 py-2 border-b border-white/5 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200">
                          Form #{fIdx + 1} {form.id && typeof form.id === 'string' ? `#${form.id}` : (form.id ? `#${String(form.id)}` : '')}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleHighlightForm(fIdx)}
                            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer"
                            title="Highlight form on page"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
                            {form.isShadow ? 'Shadow DOM' : 'Standard'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        Action: <span className="font-mono text-slate-300">
                          {typeof form.action === 'string' ? form.action : (form.action ? String(form.action) : 'none')}
                        </span>
                      </div>
                      {form.isIframe && (
                        <div className="text-[9px] text-amber-400 flex items-center gap-1 mt-0.5">
                          <ExternalLink className="w-2.5 h-2.5" /> Embedded via Iframe: {typeof form.iframeUrl === 'string' ? form.iframeUrl : String(form.iframeUrl)}
                        </div>
                      )}
                    </div>

                    {/* Inputs table */}
                    <div className="p-2 flex flex-col gap-1.5">
                      {form.inputs && form.inputs.map((input, iIdx) => {
                        const inputNameStr = typeof input.name === 'string' ? input.name : '';
                        const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                        const inputValueStr = typeof input.value === 'string' ? input.value : '';

                        const isTrackingKey = inputNameStr && [...DEFAULT_B2B_KEYS, ...customB2BKeys].some(
                          k => inputNameStr.toLowerCase().includes(k.toLowerCase())
                        );

                        // Highlight rule:
                        // - tracking field + hidden + has value = emerald/green
                        // - tracking field + hidden + empty value = red/orange
                        // - non-tracking field = transparent/slate
                        let highlightClass = 'bg-transparent border-white/2';
                        if (isTrackingKey) {
                          if (inputValueStr && inputValueStr.trim() !== '') {
                            highlightClass = 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400';
                          } else {
                            highlightClass = 'bg-red-500/5 border-red-500/20 text-red-400';
                          }
                        }

                        return (
                          <div key={iIdx} className={`border rounded p-2 flex items-center justify-between text-[10px] ${highlightClass}`}>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                              <span className="font-semibold text-slate-200 truncate">
                                {inputNameStr || 'unnamed'}
                              </span>
                              <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                                <span>Type: {inputTypeStr}</span>
                                <span>•</span>
                                <span>{input.isHidden ? 'Hidden' : 'Visible'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end min-w-[120px] max-w-[150px]">
                              <span className="text-[9px] font-mono truncate w-full text-right" title={inputValueStr}>
                                {inputValueStr ? `value: "${inputValueStr}"` : 'value: ""'}
                              </span>
                              {isTrackingKey && (
                                <span className={`text-[7px] font-black uppercase tracking-wider ${
                                  inputValueStr ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                  {inputValueStr ? 'Tag Active' : 'Slot Empty'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sandbox Tab */}
        {activeTab === 'sandbox' && (
          <div className="flex flex-col gap-4 animate-fadeIn flex-1 min-h-0">
            {/* Enable switch */}
            <div className="glass-panel rounded-xl p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-200">Sandbox Mode 2.0</span>
                <span className="text-[10px] text-slate-400 leading-normal max-w-[240px]">
                  Intercepts form submissions to emulate and send a test webhook.
                </span>
              </div>
              <button
                onClick={() => toggleSandboxMode(!sandboxMode)}
                className={`w-11 h-6 rounded-full transition-all duration-300 relative focus:outline-none cursor-pointer flex-shrink-0 ${
                  sandboxMode ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all duration-300 ${
                  sandboxMode ? 'left-5.75' : 'left-0.75'
                }`} />
              </button>
            </div>

            {/* Configured webhook */}
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">Webhook URL</label>
              <div className="bg-slate-900/50 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-slate-300 truncate flex-1">{webhookUrl}</span>
                <button 
                  onClick={handleOpenSettings}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Sandbox Logs */}
            <div className="flex flex-col gap-2 flex-grow min-h-0">
              <div className="flex items-center justify-between px-1 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Submission Logs</span>
                {webhookLogs.length > 0 && (
                  <button 
                    onClick={clearWebhookLogs} 
                    className="text-[9px] text-slate-500 hover:text-slate-400 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {webhookLogs.length === 0 ? (
                <div className="border border-dashed border-white/5 rounded-lg p-6 text-center flex flex-col items-center justify-center gap-2 flex-grow">
                  <Terminal className="w-8 h-8 text-slate-700" />
                  <span className="text-xs font-medium text-slate-500">No logs found</span>
                  <p className="text-[9px] text-slate-500 leading-normal max-w-[200px]">
                    Enable Sandbox Mode and submit a form on the current website to see the webhook log.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 flex-grow min-h-0 overflow-y-auto pr-1">
                  {webhookLogs.map((log, idx) => (
                    <div key={log.id || idx} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 flex flex-col gap-2 flex-shrink-0 flex-grow min-h-[220px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-200">
                          Form: <span className="font-mono text-cyan-400">{log.formId}</span>
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          HTTP {log.responseStatus} {log.status === 'SUCCESS' ? 'OK' : 'ERR'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-0.5 text-[8px] text-slate-400 font-mono">
                        <div>Time: {log.timestamp}</div>
                        <div className="truncate">Webhook: {log.webhookUrl}</div>
                      </div>

                      {/* Micro payload preview */}
                      <div className="bg-black/35 rounded p-2 text-[9px] font-mono text-slate-300 flex-grow overflow-y-auto min-h-[120px]">
                        <span className="text-slate-500">// Payload</span>
                        <pre className="m-0 leading-normal">{JSON.stringify(log.payload?.form_data || {}, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Persistent Global Footer for agency sales */}
      <footer className="px-4 py-3 bg-slate-900/40 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 z-10 shrink-0">
        <span>Dynamic UTM Validator</span>
        <div className="flex gap-2">
          <button 
            onClick={copyToClipboardDevs}
            className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1"
          >
            {copiedDevs ? 'Copied!' : 'Copy Tech Spec (MD)'}
          </button>
          <span>•</span>
          <button 
            onClick={downloadPdfReport}
            className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
          >
            Download PDF Report
          </button>
        </div>
      </footer>

      {/* Hidden Document Template strictly rendered for A4 PDF Output */}
      <div style={{ position: 'fixed', left: '-9999px', top: '0px', width: '794px', zIndex: -9999 }}>
        <div ref={reportRef} className="text-slate-100 bg-[#050b14] font-sans" style={{ width: '794px', boxSizing: 'border-box' }}>
          
          {/* ================= PAGE 1: COVER PAGE ================= */}
          <div className="p-10 flex flex-col justify-between" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', position: 'relative' }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                {whiteLabel && whiteLabel.logoBase64 ? (
                  <img src={whiteLabel.logoBase64} alt="Agency Logo" className="max-w-[120px] max-h-[60px] object-contain" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                    <Zap className="w-5 h-5 text-white fill-current" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                    {whiteLabel?.agencyName || 'LEAD GENERATION AUDIT REPORT'}
                  </span>
                  <h1 className="text-base font-black tracking-tight text-white uppercase leading-tight">
                    Dynamic UTM & Lead Source Validator
                  </h1>
                </div>
              </div>
              <div className="text-right flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Audit Date</span>
                <span className="text-xs font-mono text-slate-200 font-bold">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0, 5)}
                </span>
              </div>
            </div>

            {/* Audit URL Info */}
            <div className="bg-slate-900/50 border border-white/5 rounded-lg p-3.5 text-[11px] mt-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Audited URL:</span>
                <span className="text-white font-mono break-all font-bold">{url || 'Loading...'}</span>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-3 gap-5 mt-2">
              {/* Score Box */}
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Health Index</span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <span className="text-3xl font-black text-white">{healthScore}</span>
                </div>
                <span className={`text-xs font-bold ${theme.text} uppercase tracking-wide`}>
                  {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Warning' : 'Critical'}
                </span>
              </div>

              {/* Stats Box */}
              <div className="col-span-2 bg-slate-900/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 block">Summary Audit Statistics</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[10px]">Forms Detected:</span>
                    <span className="text-white text-xs font-bold">{forms.length}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[10px]">URL Parameters:</span>
                    <span className="text-white text-xs font-bold">
                      {url ? new URL(url).searchParams.size : 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[10px]">Analytics Cookies:</span>
                    <span className="text-white text-xs font-bold">{cookies.length}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[10px]">Redirects in Chain:</span>
                    <span className="text-white text-xs font-bold">{redirects.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Site Screenshot */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1">Website Page Screenshot</span>
              {screenshotUrl ? (
                <div className="border border-white/10 rounded-lg overflow-hidden shadow-lg bg-slate-900" style={{ height: '220px' }}>
                  <img src={screenshotUrl} alt="Page Screenshot" className="w-full h-full object-cover object-top" />
                </div>
              ) : (
                <div className="w-full h-[220px] rounded-lg bg-gradient-to-br from-slate-900 to-slate-950 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">Page Screenshot</span>
                  <span className="text-[9px] text-slate-500">Automatically generated when exporting report</span>
                </div>
              )}
            </div>

            {/* Analytics Pixels Checklist Matrix */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1">Advertising Trackers & Pixels Status</span>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries({
                  'Google Tag Manager': { key: 'gtm', name: 'GTM' },
                  'Google Analytics 4': { key: 'ga4', name: 'GA4' },
                  'Yandex.Metrica': { key: 'ym', name: 'Yandex' },
                  'Facebook Pixel': { key: 'fbq', name: 'FB Pixel' },
                  'TikTok Pixel': { key: 'ttq', name: 'TikTok' },
                  'HubSpot Tracking': { key: 'hsq', name: 'HubSpot' }
                }).map(([fullName, details]) => {
                  const isActive = analyticsStatus[details.key];
                  const isDetected = detectedScripts[details.key] || isActive;
                  
                  let statusText = 'Not Found';
                  let badgeClass = 'bg-red-500/10 text-red-400 border border-red-500/20';
                  
                  if (isDetected) {
                    if (isActive) {
                      statusText = 'Active';
                      badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                    } else {
                      statusText = 'Counter Error';
                      badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                    }
                  }

                  return (
                    <div key={details.key} className="bg-slate-900/30 border border-white/5 rounded-lg p-2.5 flex flex-col justify-between gap-1.5">
                      <span className="text-[10px] font-bold text-slate-300 leading-tight">{fullName}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full text-center tracking-wider uppercase ${badgeClass}`}>
                        {statusText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer page 1 */}
            <div className="text-center text-[9px] text-slate-500 mt-4 border-t border-white/5 pt-3">
              Page 1 of 3 • Generated by OTReniX UTM & Lead Source Validator
            </div>
          </div>

          <div className="html2pdf__page-break"></div>

          {/* ================= PAGE 2: TECHNICAL DETAILS ================= */}
          <div className="p-10 flex flex-col justify-between" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', position: 'relative' }}>
            <div className="flex flex-col gap-4 flex-grow min-h-0">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  {whiteLabel?.agencyName || 'AUDIT REPORT'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Audit Results Breakdown
                </span>
              </div>

              {/* Penalty List (Max 3 critical errors) */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1">Key Violations</span>
                {penalties.length === 0 ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 leading-tight">No issues found</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">All forms are ready to receive marketing traffic.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {penalties.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 flex gap-3">
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'critical' && <span className="text-red-500 font-bold text-base leading-none">●</span>}
                          {item.type === 'high' && <span className="text-orange-500 font-bold text-base leading-none">●</span>}
                          {item.type === 'medium' && <span className="text-yellow-500 font-bold text-base leading-none">●</span>}
                          {item.type === 'warning' && <span className="text-blue-500 font-bold text-base leading-none">●</span>}
                        </div>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-200">{item.label}</span>
                            <span className="text-[9px] font-semibold text-slate-400">Penalty: -{item.penalty} points</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Fields Analysis Table */}
              <div className="flex flex-col gap-2 mt-2 flex-grow min-h-0 overflow-hidden">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1">Structure of Detected Form Fields</span>
                {forms.length === 0 ? (
                  <div className="bg-slate-900/30 border border-dashed border-white/10 rounded-lg p-6 text-center text-xs text-slate-400">
                    No forms found on this page.
                  </div>
                ) : (
                  <div className="border border-white/5 rounded-lg overflow-hidden bg-slate-900/20 max-h-[480px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-900 border-b border-white/10 text-slate-400 font-bold">
                          <th className="p-2.5">Form / ID / Selector</th>
                          <th className="p-2.5">Field Name (name)</th>
                          <th className="p-2.5">Type</th>
                          <th className="p-2.5 font-mono">Value (value)</th>
                          <th className="p-2.5 text-right">Slot Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forms.map((form, fIdx) => {
                          const inputsList = form.inputs || [];
                          return (
                            <React.Fragment key={fIdx}>
                              <tr className="bg-slate-950/60 border-b border-white/5 font-bold text-cyan-400">
                                <td colSpan={5} className="p-2 font-mono">
                                  Form #{fIdx + 1} {form.id ? `#${form.id}` : ''} {form.action ? `[Action: ${String(form.action).slice(0, 35)}...]` : ''}
                                </td>
                              </tr>
                              {inputsList.length === 0 ? (
                                <tr className="border-b border-white/5 text-slate-500 italic">
                                  <td colSpan={5} className="p-2 text-center">No fields detected</td>
                                </tr>
                              ) : (
                                inputsList.map((input, iIdx) => {
                                  const inputNameStr = typeof input.name === 'string' ? input.name : '';
                                  const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                                  const inputValueStr = typeof input.value === 'string' ? input.value : '';

                                  const isTracking = inputNameStr && [...DEFAULT_B2B_KEYS, ...customB2BKeys].some(
                                    k => inputNameStr.toLowerCase().includes(k.toLowerCase())
                                  );
                                  const hasVal = inputValueStr && inputValueStr.trim() !== '';

                                  return (
                                    <tr key={iIdx} className="border-b border-white/5 text-slate-300 hover:bg-white/2">
                                      <td className="p-2 font-mono truncate max-w-[120px]" title={input.id}>{input.id || '—'}</td>
                                      <td className="p-2 font-semibold text-slate-200">{inputNameStr || '—'}</td>
                                      <td className="p-2 text-slate-400">{inputTypeStr}</td>
                                      <td className="p-2 font-mono max-w-[140px] truncate text-slate-400">{inputValueStr ? `"${inputValueStr}"` : '""'}</td>
                                      <td className="p-2 text-right">
                                        {isTracking ? (
                                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                            hasVal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                          }`}>
                                            {hasVal ? 'Active' : 'Slot Empty'}
                                          </span>
                                        ) : (
                                          <span className="text-[8px] text-slate-500">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footnote page 2 */}
            <div className="text-center text-[9px] text-slate-500 mt-4 border-t border-white/5 pt-3">
              Page 2 of 3 • Generated by OTReniX UTM & Lead Source Validator
            </div>
          </div>

          <div className="html2pdf__page-break"></div>

          {/* ================= PAGE 3: DEVELOPER SOLUTION ================= */}
          <div className="p-10 flex flex-col justify-between" style={{ width: '794px', height: '1122px', boxSizing: 'border-box', position: 'relative' }}>
            <div className="flex flex-col gap-4 flex-grow">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  {whiteLabel?.agencyName || 'AUDIT REPORT'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Recommended Solution for Developers
                </span>
              </div>

              {/* Dev instructions and code patches */}
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 1. Implementing Hidden Fields</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Add the following hidden `&lt;input&gt;` tags inside your website's HTML `&lt;form&gt;` to capture tags:
                  </p>
                  <div className="bg-slate-900 border border-white/5 rounded-lg p-2.5 mt-1.5 text-[8px] font-mono text-slate-300">
                    <pre className="m-0 leading-normal overflow-x-auto whitespace-pre">{generateDevCodeSnippet().htmlInputs}</pre>
                  </div>
                </div>

                <div className="mt-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 2. Capture & Fill (JavaScript)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                    Insert this script before the closing `&lt;/body&gt;` tag on your website. The script reads parameters from the URL, stores them in the browser session (to protect against data loss during redirects), and populates the forms:
                  </p>
                  <div className="bg-slate-900 border border-white/5 rounded-lg p-2.5 mt-1.5 text-[8px] font-mono text-slate-300 max-h-[300px] overflow-y-auto">
                    <pre className="m-0 leading-normal overflow-x-auto whitespace-pre">{generateDevCodeSnippet().jsScript}</pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium CTA Promo Box on bottom of page 3 */}
            <div className="flex flex-col gap-4">
              <div className="bg-gradient-to-r from-blue-700 to-cyan-600 rounded-xl p-5 flex items-center justify-between shrink-0">
                <div className="flex flex-col gap-1 max-w-[450px]">
                  <span className="text-[8px] uppercase tracking-widest text-cyan-200 font-bold">
                    {whiteLabel?.agencyName ? `CONSULTING BY ${whiteLabel.agencyName}` : 'TRACKING OPTIMIZATION'}
                  </span>
                  <h3 className="text-xs font-bold text-white leading-snug">
                    Want to configure reliable attribution and reduce lead loss?
                  </h3>
                  <p className="text-[10px] text-blue-100 leading-relaxed">
                    Contact our analytics team for professional setup of end-to-end tracking and CRM integrations.
                  </p>
                </div>
                <div className="flex flex-col gap-0.5 text-right shrink-0">
                  <span className="text-[8px] text-cyan-200 font-medium">Free Express Consultation</span>
                  <span className="text-xs font-bold text-white">
                    {whiteLabel?.email || 'consult@youragency.com'}
                  </span>
                  {whiteLabel?.phone && (
                    <span className="text-[10px] text-blue-100 font-semibold">{whiteLabel.phone}</span>
                  )}
                  {whiteLabel?.website && (
                    <span className="text-[10px] text-cyan-200 underline">{whiteLabel.website.replace(/^https?:\/\//, '')}</span>
                  )}
                </div>
              </div>

              {/* Footer page 3 */}
              <div className="text-center text-[9px] text-slate-500 border-t border-white/5 pt-3">
                Page 3 of 3 • Generated by OTReniX UTM & Lead Source Validator
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
