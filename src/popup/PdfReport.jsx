import React, { forwardRef } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { DEFAULT_B2B_KEYS } from './store';

const PdfReport = forwardRef(({
  whiteLabel,
  url,
  healthScore,
  forms,
  cookies,
  redirects,
  screenshotUrl,
  analyticsStatus,
  detectedScripts,
  penalties,
  customB2BKeys = [],
  devCodeSnippet
}, ref) => {
  const theme = {
    stroke: healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f97316' : '#ef4444',
    text: healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-orange-400' : 'text-red-400'
  };

  const consentCompliance = React.useMemo(() => {
    const list = cookies || [];
    const MARKETING_COOKIE_PATTERNS = ['_ga', '_gid', '_gat', '_gcl_au', '_ym_uid', '_ym_d', '_ym_isad', '_fbp', '_fbc', '_ttp', 'hubspotutk', '_mkto_trk', 'pi_opt_in'];
    const CONSENT_COOKIE_PATTERNS = ['optanonconsent', 'optanonalertboxclosed', 'cookieconsent', 'cookieyes-consent', 'cookieconsent_status', 'euconsent-v2', 'gdpr_consent', 'ccpa-consent'];

    const foundMarketing = list
      .filter(c => MARKETING_COOKIE_PATTERNS.some(pat => c.name.toLowerCase().includes(pat)))
      .map(c => c.name);
    const foundConsent = list
      .filter(c => CONSENT_COOKIE_PATTERNS.some(pat => c.name.toLowerCase().includes(pat)))
      .map(c => c.name);

    const hasMarketing = foundMarketing.length > 0;
    const hasConsent = foundConsent.length > 0;

    let cmpName = null;
    if (hasConsent) {
      const consentLower = foundConsent[0].toLowerCase();
      if (consentLower.includes('optanon')) cmpName = 'OneTrust';
      else if (consentLower.includes('cookiebot') || consentLower === 'cookieconsent') cmpName = 'Cookiebot';
      else if (consentLower.includes('cookieyes')) cmpName = 'CookieYes';
      else cmpName = 'Generic CMP';
    }

    const isViolating = hasMarketing && !hasConsent;

    return {
      hasMarketing,
      hasConsent,
      foundMarketing,
      foundConsent,
      cmpName,
      isViolating
    };
  }, [cookies]);

  const allKeys = [...new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'li_fat_id', 'hubspotutk', '_mkto_trk', 'pi_opt_in', ...customB2BKeys])];

  return (
    <div style={{ position: 'fixed', left: '-9999px', top: '0px', width: '794px', zIndex: -9999 }}>
      <div ref={ref} className="text-slate-100 bg-[#050b14] font-sans" style={{ width: '794px', boxSizing: 'border-box' }}>
        
        {/* ================= PAGE 1: COVER PAGE ================= */}
        {/* Fixed Cover page layout */}
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

          {/* GDPR/CCPA Compliance Status Banner */}
          <div className={`mt-2 p-3 rounded-lg border ${
            consentCompliance.isViolating 
              ? 'bg-red-950/20 border-red-500/20 text-red-400' 
              : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'
          }`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', fontSize: '10px', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="font-bold uppercase tracking-wider text-[8.5px]">GDPR / CCPA Cookie Audit Status</span>
              <span className="text-[9.5px] text-slate-300">
                {consentCompliance.isViolating 
                  ? `Prior consent violation! Marketing cookies (${consentCompliance.foundMarketing.slice(0, 3).join(', ')}) set without consent cookie.`
                  : consentCompliance.cmpName 
                    ? `Compliant. Consent manager cookie detected (${consentCompliance.cmpName}).` 
                    : 'Compliant. No tracking cookies detected without user consent.'
                }
              </span>
            </div>
            <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border shrink-0 ${
              consentCompliance.isViolating 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`} style={{ marginLeft: '10px' }}>
              {consentCompliance.isViolating ? 'Non-Compliant' : 'Compliant'}
            </span>
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
            <div className="grid grid-cols-4 gap-3">
              {Object.entries({
                'Google Tag Manager': { key: 'gtm', name: 'GTM' },
                'Google Analytics 4': { key: 'ga4', name: 'GA4' },
                'Yandex.Metrica': { key: 'ym', name: 'Yandex' },
                'Facebook Pixel': { key: 'fbq', name: 'FB Pixel' },
                'TikTok Pixel': { key: 'ttq', name: 'TikTok' },
                'HubSpot Tracking': { key: 'hsq', name: 'HubSpot' },
                'Marketo Tracking': { key: 'mkt', name: 'Marketo' },
                'Salesforce Pardot': { key: 'prd', name: 'Pardot' }
              }).map(([fullName, details]) => {
                const isActive = analyticsStatus && analyticsStatus[details.key];
                const isDetected = (detectedScripts && detectedScripts[details.key]) || isActive;
                
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
            Audit Summary • Generated by OTReniX UTM & Lead Source Validator
          </div>
        </div>

        <div className="html2pdf__page-break"></div>

        {/* ================= PAGE 2: TECHNICAL DETAILS ================= */}
        {/* Dynamic height layout - allows table to expand naturally across pages */}
        <div className="p-10 flex flex-col justify-between" style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box', position: 'relative' }}>
          <div className="flex flex-col gap-4 flex-grow min-h-0">
            <div className="flex items-center justify-between border-b border-white/10 pb-3" style={{ pageBreakInside: 'avoid' }}>
              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                {whiteLabel?.agencyName || 'AUDIT REPORT'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Audit Results Breakdown
              </span>
            </div>

            {/* Penalty List (Max 3 critical errors) */}
            <div className="flex flex-col gap-2" style={{ pageBreakInside: 'avoid' }}>
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
                    <div key={idx} className="bg-slate-900/40 border border-white/5 rounded-lg p-3 flex gap-3" style={{ pageBreakInside: 'avoid' }}>
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
            <div className="flex flex-col gap-2 mt-2 flex-grow min-h-0">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold px-1" style={{ pageBreakInside: 'avoid' }}>Structure of Detected Form Fields</span>
              {forms.length === 0 ? (
                <div className="bg-slate-900/30 border border-dashed border-white/10 rounded-lg p-6 text-center text-xs text-slate-400" style={{ pageBreakInside: 'avoid' }}>
                  No forms found on this page.
                </div>
              ) : (
                <div className="border border-white/5 rounded-lg overflow-hidden bg-slate-900/20">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/10 text-slate-400 font-bold" style={{ pageBreakInside: 'avoid' }}>
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
                        
                        // Separate attribution inputs from standard fields
                        const attributionInputs = [];
                        const standardInputs = [];
                        
                        inputsList.forEach(input => {
                          const inputNameStr = typeof input.name === 'string' ? input.name : '';
                          const isTracking = inputNameStr && allKeys.some(
                            k => inputNameStr.toLowerCase().includes(k.toLowerCase())
                          );
                          if (isTracking) {
                            attributionInputs.push(input);
                          } else {
                            standardInputs.push(input);
                          }
                        });

                        // Calculate missing slots
                        const missingSlots = allKeys.filter(key => {
                          return !attributionInputs.some(input => {
                            const inputNameStr = typeof input.name === 'string' ? input.name : '';
                            return inputNameStr.toLowerCase().includes(key.toLowerCase());
                          });
                        });

                        return (
                          <React.Fragment key={fIdx}>
                            {/* Form Header Row */}
                            <tr className="bg-slate-950/60 border-b border-white/5 font-bold text-cyan-400" style={{ pageBreakInside: 'avoid' }}>
                              <td colSpan={5} className="p-2 font-mono text-[11px]">
                                Form #{fIdx + 1} {form.id ? `#${form.id}` : ''} {form.action ? `[Action: ${String(form.action).slice(0, 35)}...]` : ''}
                              </td>
                            </tr>

                            {/* Missing Slots Warning Block Row */}
                            {missingSlots.length > 0 && (
                              <tr style={{ pageBreakInside: 'avoid' }}>
                                <td colSpan={5} className="p-2 bg-red-950/20 text-red-400 border-b border-white/5">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-[9px] uppercase tracking-wide flex items-center gap-1">
                                      ⚠️ Missing Hidden Input Slots ({missingSlots.length})
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {missingSlots.map(key => (
                                        <span key={key} className="text-[7.5px] font-mono font-bold bg-red-900/30 text-red-300 border border-red-500/10 rounded px-1.5 py-0.5">
                                          {key}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}

                            {/* Section: Active Attribution Inputs */}
                            {attributionInputs.length > 0 && (
                              <tr className="bg-slate-900/30 text-[8px] uppercase tracking-wider text-slate-400 font-bold" style={{ pageBreakInside: 'avoid' }}>
                                <td colSpan={5} className="px-2.5 py-1">Active Attribution Slots</td>
                              </tr>
                            )}
                            {attributionInputs.map((input, iIdx) => {
                              const inputNameStr = typeof input.name === 'string' ? input.name : '';
                              const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                              const inputValueStr = typeof input.value === 'string' ? input.value : '';
                              const hasVal = inputValueStr && inputValueStr.trim() !== '';

                              return (
                                <tr key={`attr-${iIdx}`} className="border-b border-white/5 text-slate-300 hover:bg-white/2" style={{ pageBreakInside: 'avoid' }}>
                                  <td className="p-2 font-mono truncate max-w-[120px]" title={input.id}>{input.id || '—'}</td>
                                  <td className="p-2 font-semibold text-slate-200">{inputNameStr || '—'}</td>
                                  <td className="p-2 text-slate-400">{inputTypeStr}</td>
                                  <td className="p-2 font-mono max-w-[140px] truncate text-slate-400">{inputValueStr ? `"${inputValueStr}"` : '""'}</td>
                                  <td className="p-2 text-right">
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                      hasVal ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                      {hasVal ? 'Active' : 'Slot Empty'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Section: Standard Fields */}
                            {standardInputs.length > 0 && (
                              <tr className="bg-slate-900/30 text-[8px] uppercase tracking-wider text-slate-400 font-bold" style={{ pageBreakInside: 'avoid' }}>
                                <td colSpan={5} className="px-2.5 py-1">Standard Form Fields</td>
                              </tr>
                            )}
                            {standardInputs.map((input, iIdx) => {
                              const inputNameStr = typeof input.name === 'string' ? input.name : '';
                              const inputTypeStr = typeof input.type === 'string' ? input.type : 'text';
                              const inputValueStr = typeof input.value === 'string' ? input.value : '';

                              return (
                                <tr key={`std-${iIdx}`} className="border-b border-white/5 text-slate-300 hover:bg-white/2 text-slate-400" style={{ pageBreakInside: 'avoid' }}>
                                  <td className="p-2 font-mono truncate max-w-[120px]" title={input.id}>{input.id || '—'}</td>
                                  <td className="p-2 text-slate-300">{inputNameStr || '—'}</td>
                                  <td className="p-2 text-slate-500">{inputTypeStr}</td>
                                  <td className="p-2 font-mono max-w-[140px] truncate text-slate-500">{inputValueStr ? `"${inputValueStr}"` : '""'}</td>
                                  <td className="p-2 text-right">
                                    <span className="text-[8px] text-slate-500">—</span>
                                  </td>
                                </tr>
                              );
                            })}

                            {inputsList.length === 0 && (
                              <tr className="border-b border-white/5 text-slate-500 italic" style={{ pageBreakInside: 'avoid' }}>
                                <td colSpan={5} className="p-2 text-center">No fields detected</td>
                              </tr>
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
          <div className="text-center text-[9px] text-slate-500 mt-4 border-t border-white/5 pt-3" style={{ pageBreakInside: 'avoid' }}>
            Technical Analysis • Generated by OTReniX UTM & Lead Source Validator
          </div>
        </div>

        <div className="html2pdf__page-break"></div>

        {/* ================= PAGE 3: DEVELOPER SOLUTION ================= */}
        {/* Dynamic height layout for developer code snippets page */}
        <div className="p-10 flex flex-col justify-between" style={{ width: '794px', minHeight: '1122px', boxSizing: 'border-box', position: 'relative' }}>
          <div className="flex flex-col gap-4 flex-grow">
            <div className="flex items-center justify-between border-b border-white/10 pb-3" style={{ pageBreakInside: 'avoid' }}>
              <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                {whiteLabel?.agencyName || 'AUDIT REPORT'}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Recommended Solution for Developers
              </span>
            </div>

            {/* Dev instructions and code patches */}
            <div className="flex flex-col gap-3">
              <div style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 1. Implementing Hidden Fields</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Add the following hidden `&lt;input&gt;` tags inside your website's HTML `&lt;form&gt;` to capture tags:
                </p>
                <div className="bg-slate-900 border border-white/5 rounded-lg p-2.5 mt-1.5 text-[8px] font-mono text-slate-300">
                  <pre className="m-0 leading-normal overflow-x-auto whitespace-pre">{devCodeSnippet?.htmlInputs || ''}</pre>
                </div>
              </div>

              <div className="mt-2" style={{ pageBreakInside: 'avoid' }}>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step 2. Capture & Fill (JavaScript)</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Insert this script before the closing `&lt;/body&gt;` tag on your website. The script reads parameters from the URL, stores them in the browser session (to protect against data loss during redirects), and populates the forms:
                </p>
                <div className="bg-slate-900 border border-white/5 rounded-lg p-2.5 mt-1.5 text-[8px] font-mono text-slate-300 max-h-[300px] overflow-y-auto">
                  <pre className="m-0 leading-normal overflow-x-auto whitespace-pre">{devCodeSnippet?.jsScript || ''}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Premium CTA Promo Box on bottom of page 3 */}
          <div className="flex flex-col gap-4" style={{ pageBreakInside: 'avoid' }}>
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
              Developer Action Spec • Generated by OTReniX UTM & Lead Source Validator
            </div>
          </div>
        </div>

      </div>
    </div>
  );
});

PdfReport.displayName = 'PdfReport';

export default PdfReport;
