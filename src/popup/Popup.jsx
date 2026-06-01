import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useStore } from './store';
import { 
  Settings, 
  Terminal, 
  FileText, 
  Sliders, 
  Zap, 
  RefreshCw 
} from 'lucide-react';
import DashboardTab from './tabs/DashboardTab';
import DataTreeTab from './tabs/DataTreeTab';
import SandboxTab from './tabs/SandboxTab';
import PdfReport from './PdfReport';
import { useScanData } from './hooks/useScanData';

export default function Popup() {
  const {
    url,
    forms,
    cookies,
    redirects,
    healthScore,
    penalties,
    sandboxMode,
    webhookUrl,
    customB2BKeys,
    webhookLogs,
    isLoading,
    loadSettings,
    toggleSandboxMode,
    clearWebhookLogs,
    whiteLabel,
    detectedScripts,
    analyticsStatus,
    geminiApiKey
  } = useStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [copiedDevs, setCopiedDevs] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState(null);
  const reportRef = useRef(null);

  const {
    isScanning,
    fetchTabData,
    triggerScanAndFetch,
    handleAutoFillMocks,
    handleHighlightForm
  } = useScanData();

  // Load configuration and data on popup open
  useEffect(() => {
    loadSettings();
    triggerScanAndFetch();

    // Listen to reactive updates from content script / service worker
    const messageListener = (message) => {
      if (message.type === 'PAGE_DATA_UPDATED') {
        fetchTabData();
      } else if (message.type === 'WEBHOOK_SUBMITTED_LOG') {
        loadSettings();
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [loadSettings, triggerScanAndFetch, fetchTabData]);

  // ─── Fire html2pdf after PDF template is mounted into DOM ───────────────────
  useEffect(() => {
    if (!generatingPdf || !reportRef.current) return;

    (async () => {
      try {
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin:      0,
          filename:    `UTM_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
          image:       { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#050b14', width: 794, height: 1122 },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:   { mode: ['css', 'legacy'] },
        };
        await html2pdf().from(reportRef.current).set(opt).save();
      } catch (err) {
        console.error('PDF export failed:', err);
      } finally {
        setGeneratingPdf(false);
        setScreenshotUrl(null);
      }
    })();
  }, [generatingPdf]);

  // ─── Capture screenshot and prepare PDF mounting ───
  const captureCurrentTabScreenshot = useCallback(() => {
    return new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
          chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 }, (dataUrl) => {
            if (chrome.runtime.lastError) {
              console.log('Screenshot capture failed:', chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(dataUrl);
            }
          });
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    });
  }, []);

  const resizeScreenshot = useCallback((dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const targetWidth = 714;
        const targetHeight = (img.height / img.width) * targetWidth;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(null);
    });
  }, []);

  const downloadPdfReport = useCallback(async () => {
    try {
      const rawScreenshot = await captureCurrentTabScreenshot();
      const resized = rawScreenshot ? await resizeScreenshot(rawScreenshot) : null;
      setScreenshotUrl(resized);
    } catch (e) {
      console.warn('Failed to capture screenshot:', e);
      setScreenshotUrl(null);
    }
    setGeneratingPdf(true);
  }, [captureCurrentTabScreenshot, resizeScreenshot]);

  // ─── Developer snippets ───
  const devCodeSnippet = useMemo(() => {
    const allKeys = [...new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id', 'hubspotutk', '_mkto_trk', 'pi_opt_in', ...customB2BKeys])];
    
    let htmlInputs = '';
    allKeys.forEach(k => {
      htmlInputs += `<!-- Hidden input slot for tracking parameter: ${k} -->\n`;
      htmlInputs += `<input type="hidden" name="${k}" id="attr_${k}" value="" />\n`;
    });

    let jsScript = `(function() {
  const trackingKeys = ${JSON.stringify(allKeys)};
  
  // 1. Capture parameters from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const gathered = {};
  
  trackingKeys.forEach(key => {
    const val = urlParams.get(key);
    if (val) {
      gathered[key] = val;
      // Backup to Session Storage to survive page navigation
      try {
        sessionStorage.setItem('otrenix_attr_' + key, val);
      } catch(e) {}
    }
  });

  // 2. Load from Session Storage if query parameters were lost
  trackingKeys.forEach(key => {
    if (!gathered[key]) {
      try {
        const cached = sessionStorage.getItem('otrenix_attr_' + key);
        if (cached) gathered[key] = cached;
      } catch(e) {}
    }
  });

  // 3. Inject values into all matching form fields on DOM Load
  function populateTrackingFields() {
    trackingKeys.forEach(key => {
      const value = gathered[key];
      if (value) {
        // Find inputs by name or id attributes
        const inputs = document.querySelectorAll('input[name="' + key + '"], #' + key + ', #attr_' + key);
        inputs.forEach(input => {
          input.value = value;
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateTrackingFields);
  } else {
    populateTrackingFields();
  }
})();`;

    return { htmlInputs, jsScript };
  }, [customB2BKeys]);

  // ─── Markdown report ───
  const markdownReport = useMemo(() => {
    const allKeys = [...new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id', 'hubspotutk', '_mkto_trk', 'pi_opt_in', ...customB2BKeys])];
    let md = `# OTReniX Lead Attribution Audit Log\n`;
    md += `**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    md += `**Target URL:** ${url || 'unknown'}\n`;
    md += `**Attribution Health Score:** **${healthScore}/100**\n\n`;

    md += `## 📊 Penalty Audit Breakdown:\n`;
    if (penalties.length === 0) {
      md += `- ✅ No errors detected. Page forms have active attribution slots.\n`;
    } else {
      penalties.forEach(p => {
        md += `- ❌ **[-${p.penalty} pts]** ${p.label}: ${p.desc}\n`;
      });
    }

    md += `\n## 📝 Form Structure Log:\n`;
    if (forms.length === 0) {
      md += `No HTML forms found on page.\n`;
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
    allKeys.forEach(k => { md += `- \`${k}\`\n`; });
    md += `\n---\n*Report automatically generated by Dynamic UTM & Lead Source Validator.*`;
    return md;
  }, [forms, penalties, url, healthScore, customB2BKeys]);

  const copyToClipboardDevs = useCallback(() => {
    navigator.clipboard.writeText(markdownReport).then(() => {
      setCopiedDevs(true);
      setTimeout(() => setCopiedDevs(false), 2000);
    });
  }, [markdownReport]);

  const handleOpenSettings = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full bg-[#050b14] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Booting Diagnostics Store...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#050b14] text-slate-100 flex flex-col overflow-hidden relative font-sans border border-white/5">
      {/* Dynamic Background Premium Glows */}
      <div className="absolute top-[-100px] left-[-50px] w-[250px] h-[250px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-50px] w-[250px] h-[250px] bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header bar */}
      <header className="px-4 py-3.5 bg-slate-900/40 border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          {whiteLabel && whiteLabel.logoBase64 ? (
            <img src={whiteLabel.logoBase64} alt="Agency Logo" className="max-w-[100px] max-h-[30px] object-contain" />
          ) : (
            <div className="w-6.5 h-6.5 rounded bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/15">
              <Zap className="w-3.5 h-3.5 text-white fill-current animate-pulse-neon" />
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <span className="text-[7.5px] uppercase tracking-wider text-cyan-400 font-extrabold leading-none">
              {whiteLabel?.agencyName || 'OTReniX B2B Agency'}
            </span>
            <span className="text-xs font-black text-white tracking-tight leading-none">UTM Validator</span>
          </div>
        </div>
        <button 
          onClick={handleOpenSettings}
          className="p-1.5 rounded-lg bg-white/2 border border-white/5 hover:bg-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Nav Tab switches */}
      <nav className="px-4 py-2 bg-slate-950/20 border-b border-white/5 flex gap-1 z-10 shrink-0">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Sliders },
          { id: 'tree', label: 'Forms Tree', icon: FileText },
          { id: 'sandbox', label: 'Sandbox 2.0', icon: Terminal }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                active 
                  ? 'bg-gradient-to-r from-blue-600/15 to-cyan-600/15 border border-cyan-500/20 text-cyan-400 font-bold' 
                  : 'bg-transparent border border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Primary Tab Workspace Content */}
      <div className={`flex-1 p-4 flex flex-col gap-4 min-h-0 ${activeTab === 'sandbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {isScanning && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm font-medium tracking-wide text-cyan-300">Analyzing DOM structure...</span>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardTab
            healthScore={healthScore}
            forms={forms}
            cookies={cookies}
            redirects={redirects}
            url={url}
            detectedScripts={detectedScripts}
            analyticsStatus={analyticsStatus}
            penalties={penalties}
            copiedDevs={copiedDevs}
            generatingPdf={generatingPdf}
            handleAutoFillMocks={handleAutoFillMocks}
            copyToClipboardDevs={copyToClipboardDevs}
            downloadPdfReport={downloadPdfReport}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'tree' && (
          <DataTreeTab
            forms={forms}
            customB2BKeys={customB2BKeys}
            triggerScanAndFetch={triggerScanAndFetch}
            handleHighlightForm={handleHighlightForm}
            geminiApiKey={geminiApiKey}
            currentUrl={url}
            cookies={cookies}
            detectedScripts={detectedScripts}
          />
        )}

        {activeTab === 'sandbox' && (
          <SandboxTab
            sandboxMode={sandboxMode}
            webhookUrl={webhookUrl}
            webhookLogs={webhookLogs}
            toggleSandboxMode={toggleSandboxMode}
            clearWebhookLogs={clearWebhookLogs}
            handleOpenSettings={handleOpenSettings}
          />
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

      {/* Hidden Document Template — mounted only during PDF export */}
      {generatingPdf && (
        <PdfReport
          ref={reportRef}
          whiteLabel={whiteLabel}
          url={url}
          healthScore={healthScore}
          forms={forms}
          cookies={cookies}
          redirects={redirects}
          screenshotUrl={screenshotUrl}
          analyticsStatus={analyticsStatus}
          detectedScripts={detectedScripts}
          penalties={penalties}
          customB2BKeys={customB2BKeys}
          devCodeSnippet={devCodeSnippet}
        />
      )}
    </div>
  );
}
