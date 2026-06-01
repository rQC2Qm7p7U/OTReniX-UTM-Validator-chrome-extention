import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  ExternalLink,
  Copy,
  Zap,
  Check
} from 'lucide-react';
import { DEFAULT_B2B_KEYS } from '../store';

const generatePromptText = (form, fIdx, allKeys, currentUrl, cookies, detectedScripts) => {
  // Guard: form.inputs can be undefined on Shadow DOM or malformed scan responses
  const inputs = form.inputs || [];
  const attributionInputs = [];
  inputs.forEach(input => {
    const inputNameStr = typeof input.name === 'string' ? input.name : '';
    const isTrackingKey = inputNameStr && allKeys.some(
      k => inputNameStr.toLowerCase().includes(k.toLowerCase())
    );
    if (isTrackingKey) attributionInputs.push(input);
  });

  const missingSlots = allKeys.filter(key => {
    return !attributionInputs.some(input => {
      const inputNameStr = typeof input.name === 'string' ? input.name : '';
      return inputNameStr.toLowerCase().includes(key.toLowerCase());
    });
  });

  // Filter and extract tracking cookies for metadata representation
  const trackingCookies = (cookies || []).filter(c => {
    const nameLower = c.name.toLowerCase();
    return nameLower.includes('utm') || 
           nameLower.includes('_ga') || 
           nameLower.includes('_ym') || 
           nameLower.includes('hubspot') || 
           nameLower.includes('gclid') || 
           nameLower.includes('mkto') ||
           nameLower.includes('pi_opt');
  });

  // Extract detected scripts list
  const activeScripts = [];
  if (detectedScripts) {
    if (detectedScripts.gtm) activeScripts.push("Google Tag Manager (GTM)");
    if (detectedScripts.ga4) activeScripts.push("Google Analytics 4 (GA4)");
    if (detectedScripts.ym) activeScripts.push("Yandex Metrika");
    if (detectedScripts.fbq) activeScripts.push("Facebook Pixel");
    if (detectedScripts.ttq) activeScripts.push("TikTok Pixel");
    if (detectedScripts.hsq) activeScripts.push("HubSpot Tracker");
    if (detectedScripts.mkt) activeScripts.push("Marketo Munchkin");
    if (detectedScripts.prd) activeScripts.push("Pardot Tracker");
  }

  return `You are a Staff B2B Marketing Attribution Engineer. Your task is to write a highly professional, enterprise-ready, defensive JavaScript patch to capture UTM campaign parameters and populate them into the target form specified below.

Form Details:
- Form Index: ${fIdx + 1}
- DOM ID: ${form.id || 'none'}
- DOM Class: ${form.className || 'none'}
- Action: ${form.action || 'none'}
- Inside Shadow DOM: ${form.isShadow ? 'Yes' : 'No'}
- Inputs:
${inputs.map(inp => `  * name="${inp.name || ''}", id="${inp.id || ''}", class="${inp.className || ''}", type="${inp.type || ''}", hidden=${inp.isHidden ? 'Yes' : 'No'}`).join('\n')}

Contextual Page Metadata:
- Current Page URL: ${currentUrl || 'unknown'}
- Detected Active Scripts/Systems: ${activeScripts.length > 0 ? activeScripts.join(', ') : 'none'}
- Active Cookies (Names): ${cookies && cookies.length > 0 ? cookies.map(c => c.name).join(', ') : 'none'}
- Active Attribution Cookies (sampled formatting):
${trackingCookies.length > 0 ? trackingCookies.map(c => `  * ${c.name}: "${c.value.substring(0, 30)}${c.value.length > 30 ? '...' : ''}"`).join('\n') : '  * none'}

Required Attributions to capture:
${allKeys.join(', ')}

Missing Parameters specifically for this form (you MUST write logic to inject these):
${missingSlots.join(', ')}

Your JavaScript code must adhere to these strict enterprise rules:
1. **Namespace & Scope Isolation**: Wrap the entire implementation inside an Immediately Invoked Function Expression (IIFE) with 'use strict'; to ensure zero pollution of the host window's global scope.
2. **Defensive Error Isolation**: Wrap all operations (URL parsing, sessionStorage/cookie reads, DOM queries, and input insertions) in try-catch blocks. Under no circumstances must a failure in this script trigger an unhandled exception that disrupts the host page's core features (e.g. payment buttons, scrolling, or page loading).
3. **Idempotence & Duplicate Prevention**: The script must be idempotent. If executed multiple times, it must not append duplicate hidden fields or bind duplicate listeners. Use a sentinel flag on the form object (e.g. form.__otrenix_init = true) to prevent duplicate runs.
4. **SPA State Synchronization (React/Vue/HubSpot)**: Setting input values must trigger React, Vue, Angular, and HubSpot state listeners. Explicitly dispatch 'input' and 'change' events:
   const ev = new Event('input', { bubbles: true });
   input.dispatchEvent(ev);
   const cev = new Event('change', { bubbles: true });
   input.dispatchEvent(cev);
5. **Dynamic DOM Resolution (Dynamic Forms)**: B2B forms are often loaded dynamically or rendered lazily. Use a polling function (retrying up to 5 times at 500ms intervals) or a MutationObserver to locate the form and inputs if they aren't immediately present.
6. **No Cumulative Layout Shift (CLS)**: Appended hidden inputs must have zero impact on the visual page structure. Ensure they use type="hidden", or are hidden with inline CSS (display: none !important) and appended cleanly to the bottom of the form.
7. **JSDoc and Style Guidelines**: Write clean, modern, well-commented ES6+ code. Use JSDoc comments to document key utility functions.
8. **Specialized Integration Strategy**:
   * If HubSpot is detected on the page, check for HubSpot form-specific classes or API hooks.
   * If classes are present on the fields, prefer querySelectors matching those specific classes when names or IDs are dynamic.

Format: Return ONLY the JavaScript code block wrapped in \`\`\`javascript ... \`\`\` and a brief 2-sentence explanation of where to paste it. Do not include any other conversational text.`;
};

export default function DataTreeTab({
  forms,
  customB2BKeys = [],
  triggerScanAndFetch,
  handleHighlightForm,
  geminiApiKey = '',
  currentUrl = '',
  cookies = [],
  detectedScripts = {}
}) {
  // Use DEFAULT_B2B_KEYS from store to stay in sync — previously a hardcoded list was missing wbraid, gbraid, yclid
  const allKeys = useMemo(
    () => [...new Set([...DEFAULT_B2B_KEYS, ...customB2BKeys])],
    [customB2BKeys]
  );
  const [aiPatches, setAiPatches] = useState({});

  const handleCopyPrompt = (fIdx, form) => {
    const promptText = generatePromptText(form, fIdx, allKeys, currentUrl, cookies, detectedScripts);
    navigator.clipboard.writeText(promptText).then(() => {
      setAiPatches(prev => ({
        ...prev,
        [fIdx]: { ...prev[fIdx], promptCopied: true }
      }));
      setTimeout(() => {
        setAiPatches(prev => ({
          ...prev,
          [fIdx]: { ...prev[fIdx], promptCopied: false }
        }));
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy prompt:", err);
    });
  };

  const handleGeneratePatch = async (fIdx, form) => {
    setAiPatches(prev => ({
      ...prev,
      [fIdx]: { isLoading: true, error: null, result: null }
    }));

    const promptText = generatePromptText(form, fIdx, allKeys, currentUrl, cookies, detectedScripts);

    const onSuccess = (text) => {
      setAiPatches(prev => ({
        ...prev,
        [fIdx]: { isLoading: false, error: null, result: text }
      }));
    };

    const onError = (errMsg) => {
      setAiPatches(prev => ({
        ...prev,
        [fIdx]: { isLoading: false, error: errMsg, result: null }
      }));
    };

    // 1. Try Gemini API key if present
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            onError("Invalid Gemini API Key. Please verify settings in Options.");
          } else if (response.status === 429) {
            onError("Rate limit exceeded. Please wait a moment or copy the prompt for manual LLM use.");
          } else {
            onError(`Gemini API returned error code ${response.status}.`);
          }
          return;
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          onSuccess(text);
        } else {
          onError("Empty response payload received from Gemini API.");
        }
      } catch (err) {
        onError("Network request failed: " + (err.message || String(err)));
      }
      return;
    }

    // 2. Try window.ai (local Gemini Nano)
    const hasWindowAI = typeof window !== 'undefined' && window.ai;
    if (hasWindowAI) {
      try {
        let assistant;
        if (window.ai.languageModel) {
          assistant = await window.ai.languageModel.create();
        } else if (window.ai.assistant) {
          assistant = await window.ai.assistant.create();
        } else {
          throw new Error("Local Prompt API not accessible.");
        }
        
        const responseText = await assistant.prompt(promptText);
        onSuccess(responseText);
      } catch (err) {
        onError(`Local AI model failed: ${err.message || String(err)}`);
      }
      return;
    }

    // 3. Neither source available
    onError("No AI model config found. Put your Gemini API Key in the settings page, or copy the manual prompt to run externally.");
  };

  const handleCopyResult = (fIdx, resultText) => {
    const codeMatch = resultText.match(/```(?:javascript|js)?([\s\S]*?)```/i);
    const textToCopy = codeMatch && codeMatch[1] ? codeMatch[1].trim() : resultText.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      setAiPatches(prev => ({
        ...prev,
        [fIdx]: { ...prev[fIdx], codeCopied: true }
      }));
      setTimeout(() => {
        setAiPatches(prev => ({
          ...prev,
          [fIdx]: { ...prev[fIdx], codeCopied: false }
        }));
      }, 2000);
    }).catch(err => {
      console.error("Failed to copy code patch:", err);
    });
  };

  return (
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
          {forms.map((form, fIdx) => {
            const inputs = form.inputs || [];
            
            const attributionInputs = [];
            const standardInputs = [];
            
            inputs.forEach(input => {
              const inputNameStr = typeof input.name === 'string' ? input.name : '';
              const isTrackingKey = inputNameStr && allKeys.some(
                k => inputNameStr.toLowerCase().includes(k.toLowerCase())
              );
              if (isTrackingKey) {
                attributionInputs.push(input);
              } else {
                standardInputs.push(input);
              }
            });

            const missingSlots = allKeys.filter(key => {
              return !attributionInputs.some(input => {
                const inputNameStr = typeof input.name === 'string' ? input.name : '';
                return inputNameStr.toLowerCase().includes(key.toLowerCase());
              });
            });

            return (
              <div key={fIdx} className="glass-panel rounded-xl overflow-hidden flex flex-col">
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
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-semibold">
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

                {/* Section A: Missing Attribution Slots Warning Block */}
                {missingSlots.length > 0 && (
                  <div className="mx-2.5 mt-2.5 p-2 bg-red-500/5 border border-red-500/15 rounded-lg flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-extrabold tracking-wide uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>Missing Hidden Inputs ({missingSlots.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {missingSlots.map(key => (
                        <span key={key} className="text-[8px] font-mono font-bold bg-red-950/20 text-red-300 border border-red-500/10 rounded px-1.5 py-0.5">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section B: Active Attribution Slots */}
                {attributionInputs.length > 0 && (
                  <div className="px-2.5 pt-2.5 flex flex-col gap-1.5">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider px-1">Active Attribution Slots</span>
                    <div className="flex flex-col gap-1">
                      {attributionInputs.map((input, idx) => {
                        const inputNameStr = typeof input.name === 'string' ? input.name : '';
                        const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                        const inputValueStr = typeof input.value === 'string' ? input.value : '';
                        const hasValue = inputValueStr && inputValueStr.trim() !== '';

                        const highlightClass = hasValue
                          ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/5 border-red-500/15 text-red-400';

                        return (
                          <div key={idx} className={`border rounded-lg p-2 flex items-center justify-between text-[10px] ${highlightClass}`}>
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                              <span className="font-semibold text-slate-200 truncate">{inputNameStr || 'unnamed'}</span>
                              <div className="flex flex-wrap items-center gap-1 text-[8px] text-slate-400">
                                <span>Type: {inputTypeStr}</span>
                                <span>•</span>
                                <span>{input.isHidden ? 'Hidden' : 'Visible'}</span>
                                {input.id && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate">id: {input.id}</span>
                                  </>
                                )}
                                {input.className && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate" title={input.className}>class: {input.className}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end min-w-[100px] shrink-0">
                              <span className="text-[9px] font-mono truncate w-full text-right" title={inputValueStr}>
                                {inputValueStr ? `value: "${inputValueStr}"` : 'value: ""'}
                              </span>
                              <span className={`text-[7.5px] font-black uppercase tracking-wider ${hasValue ? 'text-emerald-500' : 'text-red-500'}`}>
                                {hasValue ? 'Tag Active' : 'Slot Empty'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section C: Standard Fields Grid */}
                {standardInputs.length > 0 && (
                  <div className="p-2.5 flex flex-col gap-1.5">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider px-1">Standard Form Fields</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {standardInputs.map((input, idx) => {
                        const inputNameStr = typeof input.name === 'string' ? input.name : '';
                        const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                        const inputValueStr = typeof input.value === 'string' ? input.value : '';

                        return (
                          <div key={idx} className="border border-white/5 bg-slate-900/10 rounded-lg p-2 flex flex-col gap-1 text-[9px] min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-200 truncate flex-1" title={inputNameStr || 'unnamed'}>
                                {inputNameStr || 'unnamed'}
                              </span>
                              <span className="text-[7.5px] px-1 rounded bg-slate-800 text-slate-400 select-none scale-90 origin-right">
                                {inputTypeStr}
                              </span>
                            </div>
                            <div className="text-[8.5px] font-mono text-slate-400 truncate" title={inputValueStr}>
                              val: <span className="text-slate-300">{inputValueStr ? `"${inputValueStr}"` : '""'}</span>
                            </div>
                            <div className="text-[7px] text-slate-500 flex flex-col gap-0.5 mt-0.5">
                              <span>{input.isHidden ? '👁️ Hidden' : '👀 Visible'}</span>
                              {input.id && <span className="truncate">id: {input.id}</span>}
                              {input.className && <span className="truncate" title={input.className}>class: {input.className}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section D: AI Patch Assistant */}
                <div className="p-2.5 mt-1 border-t border-white/5 bg-slate-900/20 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-300 text-[10px] font-bold">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 fill-current" />
                      <span>AI Patch Assistant</span>
                    </div>
                    <span className="text-[8px] text-slate-500 font-mono">Gemini-powered</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyPrompt(fIdx, form)}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-850 border border-white/5 hover:border-white/10 rounded-lg text-[9.5px] font-bold text-slate-300 flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      {aiPatches[fIdx]?.promptCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Prompt Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleGeneratePatch(fIdx, form)}
                      disabled={aiPatches[fIdx]?.isLoading}
                      className="flex-1 py-1.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 disabled:opacity-50 text-[9.5px] font-extrabold text-white rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Generate AI Fix</span>
                    </button>
                  </div>

                  {/* Loading / Error / Result Blocks */}
                  {aiPatches[fIdx]?.isLoading && (
                    <div className="mt-1 p-2.5 bg-slate-900/60 border border-white/5 rounded-lg flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider animate-pulse">Writing custom fix...</span>
                      </div>
                      <div className="flex flex-col gap-1.5 animate-pulse mt-0.5">
                        <div className="h-2.5 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-2 bg-slate-800 rounded w-1/2"></div>
                        <div className="h-10 bg-slate-800 rounded mt-1"></div>
                      </div>
                    </div>
                  )}

                  {aiPatches[fIdx]?.error && (
                    <div className="mt-1 p-2.5 bg-red-950/20 border border-red-500/10 rounded-lg flex flex-col gap-1 text-[9px] leading-relaxed">
                      <span className="text-red-400 font-black uppercase tracking-wider">Generation Failed:</span>
                      <p className="text-slate-300 font-medium">{aiPatches[fIdx].error}</p>
                      
                      {!geminiApiKey && typeof window !== 'undefined' && !window.ai && (
                        <div className="mt-1.5 p-2 bg-slate-950/50 border border-white/5 rounded text-[8px] leading-relaxed text-slate-400 flex flex-col gap-1">
                          <span className="font-bold text-slate-300">💡 How to enable Gemini Nano locally:</span>
                          <ul className="list-disc list-inside flex flex-col gap-0.5 pl-0.5">
                            <li>Go to <span className="font-mono text-cyan-300 select-all">chrome://flags/#optimization-guide-on-device-model</span> and select <span className="font-bold text-white">Enabled BypassPrefRequirement</span>.</li>
                            <li>Go to <span className="font-mono text-cyan-300 select-all">chrome://flags/#prompt-api-for-gemini-nano</span> and select <span className="font-bold text-white">Enabled</span>.</li>
                            <li>Restart Chrome and wait for download in <span className="font-mono text-cyan-300">chrome://components</span> (Optimization Guide).</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {aiPatches[fIdx]?.result && (
                    <div className="mt-1 p-2.5 bg-slate-900/90 border border-white/5 rounded-lg flex flex-col gap-1.5 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] text-cyan-400 font-bold uppercase tracking-wider">Solution:</span>
                        <button
                          onClick={() => handleCopyResult(fIdx, aiPatches[fIdx].result)}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-[8px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors border border-white/5 active:scale-95"
                        >
                          {aiPatches[fIdx].codeCopied ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5 text-slate-400" />
                              <span>Copy Script</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="bg-slate-950 rounded p-2 font-mono text-[8px] text-slate-300 max-h-[160px] overflow-y-auto border border-white/5 whitespace-pre-wrap leading-normal break-all">
                        {aiPatches[fIdx].result}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
