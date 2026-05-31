import React from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  ExternalLink 
} from 'lucide-react';
import { DEFAULT_B2B_KEYS } from '../store';

export default function DataTreeTab({
  forms,
  customB2BKeys = [],
  triggerScanAndFetch,
  handleHighlightForm
}) {
  const allKeys = [...new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id', 'hubspotutk', '_mkto_trk', 'pi_opt_in', ...customB2BKeys])];

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
            
            // 1. Separate attribution inputs from standard fields
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

            // 2. Identify missing tracking parameters for this form
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
                              <div className="flex items-center gap-1.5 text-[8px] text-slate-400">
                                <span>Type: {inputTypeStr}</span>
                                <span>•</span>
                                <span>{input.isHidden ? 'Hidden' : 'Visible'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end min-w-[120px]">
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
                            <div className="text-[7px] text-slate-500">
                              {input.isHidden ? '👁️ Hidden' : '👀 Visible'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
