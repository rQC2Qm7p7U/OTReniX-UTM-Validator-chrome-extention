import React from 'react';
import { Terminal } from 'lucide-react';

export default function SandboxTab({
  sandboxMode,
  webhookUrl,
  webhookLogs = [],
  toggleSandboxMode,
  clearWebhookLogs,
  handleOpenSettings
}) {
  return (
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
  );
}
