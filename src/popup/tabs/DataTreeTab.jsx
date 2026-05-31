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
  customB2BKeys,
  triggerScanAndFetch,
  handleHighlightForm
}) {
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
  );
}
