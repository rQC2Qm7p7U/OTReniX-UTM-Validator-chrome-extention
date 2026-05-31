import React, { useMemo } from 'react';
import { 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Check, 
  Copy, 
  Download 
} from 'lucide-react';

export default function DashboardTab({
  healthScore,
  forms,
  redirects,
  url,
  detectedScripts,
  analyticsStatus,
  penalties,
  copiedDevs,
  generatingPdf,
  handleAutoFillMocks,
  copyToClipboardDevs,
  downloadPdfReport,
  setActiveTab
}) {
  const theme = useMemo(() => {
    if (healthScore >= 80) return { stroke: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    if (healthScore >= 60) return { stroke: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' };
    return { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' };
  }, [healthScore]);

  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
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
            let dotClass = 'bg-slate-600';
            
            if (detected) {
              if (initialized) {
                statusText = 'Active';
                dotClass = 'bg-emerald-500 shadow-[0_0_6px_#10b981]';
              } else {
                statusText = 'Failed';
                dotClass = 'bg-red-500 shadow-[0_0_6px_#ef4444]';
              }
            }
            
            return (
              <div 
                key={sys.name} 
                className={`border rounded-lg p-2 flex items-center justify-between gap-1 bg-slate-900/20 backdrop-blur-sm transition-all duration-300 ${
                  detected
                    ? initialized
                      ? 'border-emerald-500/20 text-emerald-400'
                      : 'border-red-500/25 text-red-400'
                    : 'border-white/5 text-slate-500 bg-white/2'
                }`}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-bold text-slate-200 leading-tight">{sys.name}</span>
                  <span className="text-[7.5px] font-semibold leading-none">{statusText}</span>
                </div>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass} ${detected ? 'animate-pulse' : ''}`} />
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
            {penalties.map((item, idx) => {
              const isUtmMissingPenalty = item.label && item.label.toLowerCase().includes('utm missing in forms');
              
              return (
                <div key={idx} className="glass-panel rounded-lg p-3 flex gap-3 border-l-3 items-start" style={{ borderLeftColor: item.type === 'critical' ? '#ef4444' : item.type === 'high' ? '#f97316' : item.type === 'medium' ? '#eab308' : '#3b82f6' }}>
                  <div className="mt-0.5">
                    {item.type === 'critical' && <AlertCircle className="w-4 h-4 text-red-500 animate-pulse-neon" />}
                    {item.type === 'high' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                    {item.type === 'medium' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 leading-none">{item.label}</span>
                      <span className="text-[9px] font-black text-slate-400">-{item.penalty} {item.penalty === 1 ? 'point' : 'points'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
                    
                    {isUtmMissingPenalty && setActiveTab && (
                      <button 
                        onClick={() => setActiveTab('tree')}
                        className="mt-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-bold flex items-center gap-1 transition-colors cursor-pointer w-fit"
                      >
                        👉 View details in Forms Tree
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
  );
}
