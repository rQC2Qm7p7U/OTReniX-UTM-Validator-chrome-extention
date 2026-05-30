import React, { useEffect, useState } from 'react';
import { useStore, DEFAULT_B2B_KEYS } from '../popup/store';
import { 
  Save, 
  Settings, 
  Terminal, 
  Plus, 
  Trash2, 
  Check, 
  Zap, 
  Info, 
  ExternalLink,
  Code,
  ListFilter,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

export default function Options() {
  const {
    webhookUrl,
    customB2BKeys,
    webhookLogs,
    isLoading,
    loadSettings,
    setWebhookUrl,
    setCustomB2BKeys,
    clearWebhookLogs,
    whiteLabel,
    customPIIKeys,
    setWhiteLabel,
    setCustomPIIKeys
  } = useStore();

  const [inputUrl, setInputUrl] = useState('');
  const [newKey, setNewKey] = useState('');
  const [keysList, setKeysList] = useState([]);
  const [savedStatus, setSavedStatus] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // White label states
  const [agencyName, setAgencyName] = useState('');
  const [wlEmail, setWlEmail] = useState('');
  const [wlPhone, setWlPhone] = useState('');
  const [wlWebsite, setWlWebsite] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [logoError, setLogoError] = useState('');
  const [urlError, setUrlError] = useState('');

  // PII states
  const [newPIIKey, setNewPIIKey] = useState('');
  const [piiList, setPiiList] = useState([]);

  useEffect(() => {
    (async () => {
      await loadSettings();
    })();
  }, []);

  // Sync component state when settings are loaded from store
  useEffect(() => {
    setInputUrl(webhookUrl);
    setKeysList(customB2BKeys);
    
    setAgencyName(whiteLabel?.agencyName || '');
    setWlEmail(whiteLabel?.email || '');
    setWlPhone(whiteLabel?.phone || '');
    setWlWebsite(whiteLabel?.website || '');
    setLogoBase64(whiteLabel?.logoBase64 || '');
    
    setPiiList(customPIIKeys || []);
  }, [webhookUrl, customB2BKeys, whiteLabel, customPIIKeys]);

  const handleSave = () => {
    // Validate Webhook URL format if provided
    const cleanUrl = inputUrl.trim();
    if (cleanUrl !== '') {
      try {
        new URL(cleanUrl);
        setUrlError('');
      } catch (e) {
        setUrlError('Недопустимый формат URL вебхука. Ссылка должна начинаться с http:// или https://');
        return;
      }
    } else {
      setUrlError('');
    }

    setWebhookUrl(cleanUrl);
    setCustomB2BKeys(keysList);
    setWhiteLabel({
      agencyName,
      email: wlEmail,
      phone: wlPhone,
      website: wlWebsite,
      logoBase64
    });
    setCustomPIIKeys(piiList);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleAddKey = (e) => {
    e.preventDefault();
    const cleanKey = newKey.trim().toLowerCase();
    if (cleanKey && !keysList.includes(cleanKey) && !DEFAULT_B2B_KEYS.includes(cleanKey)) {
      setKeysList([...keysList, cleanKey]);
      setNewKey('');
    }
  };

  const handleRemoveKey = (keyToRemove) => {
    setKeysList(keysList.filter(k => k !== keyToRemove));
  };

  // Add custom PII key
  const handleAddPIIKey = (e) => {
    e.preventDefault();
    const cleanKey = newPIIKey.trim().toLowerCase();
    const defaultPII = ['password', 'pwd', 'card', 'cvv', 'cc_', 'passport', 'phone', 'email'];
    if (cleanKey && !piiList.includes(cleanKey) && !defaultPII.includes(cleanKey)) {
      setPiiList([...piiList, cleanKey]);
      setNewPIIKey('');
    }
  };

  const handleRemovePIIKey = (keyToRemove) => {
    setPiiList(piiList.filter(k => k !== keyToRemove));
  };

  // Logo file upload & Canvas compression
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Выбранный файл не является изображением.');
      return;
    }

    setLogoError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxW = 120;
        const maxH = 60;

        // Scaling logo preserving proportions to fit under storage limit (<8KB base64)
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const compressedBase64 = canvas.toDataURL('image/png');
          setLogoBase64(compressedBase64);
        } catch (err) {
          setLogoError('Не удалось обработать/сжать изображение.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoBase64('');
    setLogoError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 px-4">
      {/* Container */}
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Zap className="w-5 h-5 text-white fill-current animate-pulse-neon" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">
                Dynamic UTM & Lead Source Validator
              </h1>
              <p className="text-xs text-slate-400">Настройки интеграции, брендинга и безопасности</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-semibold rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-lg shadow-blue-600/20"
          >
            {savedStatus ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {savedStatus ? 'Сохранено!' : 'Сохранить настройки'}
          </button>
        </header>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Settings Forms */}
          <div className="md:col-span-2 flex flex-col gap-6">
            
            {/* Integration Card */}
            <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Настройка вебхука (n8n / GAS)</h2>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400">Адрес получателя тестовых лидов:</label>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    if (urlError) setUrlError('');
                  }}
                  placeholder="https://n8n.yourservice.com/webhook/test-lead"
                  className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                {urlError && (
                  <span className="text-[11px] text-red-400 font-medium">
                    {urlError}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> В режиме Sandbox Mode все формы при отправке будут перенаправлены на этот адрес методом POST.
                </span>
              </div>
            </section>

            {/* White Label Branding Card */}
            <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Брендирование отчетов (White Label)</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Название агентства:</label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Например: Super Marketing Agency"
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Сайт агентства:</label>
                  <input
                    type="text"
                    value={wlWebsite}
                    onChange={(e) => setWlWebsite(e.target.value)}
                    placeholder="https://superagency.com"
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Email агентства:</label>
                  <input
                    type="text"
                    value={wlEmail}
                    onChange={(e) => setWlEmail(e.target.value)}
                    placeholder="audit@superagency.com"
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-slate-400">Телефон агентства:</label>
                  <input
                    type="text"
                    value={wlPhone}
                    onChange={(e) => setWlPhone(e.target.value)}
                    placeholder="+7 (999) 123-45-67"
                    className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="text-[11px] text-slate-400">Логотип агентства (автоматически сожмется до 120x60px):</label>
                <div className="flex items-center gap-4">
                  {logoBase64 ? (
                    <div className="relative p-2 bg-slate-900/60 border border-white/10 rounded-lg flex items-center justify-center w-36 h-20">
                      <img src={logoBase64} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      <button 
                        onClick={handleRemoveLogo}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-[10px] font-bold text-white shadow focus:outline-none cursor-pointer"
                        title="Удалить логотип"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-36 h-20 border border-dashed border-white/15 hover:border-white/30 rounded-lg cursor-pointer transition-colors text-slate-500 hover:text-slate-400">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <span className="text-[9px] font-medium text-center">Загрузить логотип</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                  <div className="flex-1 text-[9px] text-slate-500 leading-normal">
                    Логотип будет добавлен в шапку PDF-отчета, а контактные данные — в футер.
                    Сжатие гарантирует, что размер изображения Base64 будет менее 8 КБ для беспрепятственной синхронизации Chrome.
                    {logoError && <span className="block text-red-400 font-bold mt-1">⚠️ {logoError}</span>}
                  </div>
                </div>
              </div>
            </section>

            {/* B2B Keys Card */}
            <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ListFilter className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Отслеживаемые параметры аналитики</h2>
              </div>

              {/* Default Keys (Read-only) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400">Встроенные B2B-параметры (активны по умолчанию):</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_B2B_KEYS.map(key => (
                    <span key={key} className="px-2.5 py-1 bg-slate-900/60 border border-white/5 rounded-md text-[10px] font-mono text-slate-400">
                      {key}
                    </span>
                  ))}
                </div>
              </div>

              {/* Custom Keys Builder */}
              <div className="flex flex-col gap-3 mt-2">
                <label className="text-xs text-slate-400">Ваши кастомные CRM/ABM метки:</label>
                
                {/* Form to add */}
                <form onSubmit={handleAddKey} className="flex gap-2">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Например: Pi_utm_source, internal_id..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button 
                    type="submit"
                    className="px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </form>

                {/* Custom keys list */}
                {keysList.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">Список кастомных параметров пуст. Вы можете добавить ключи специфичных CRM систем.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/10 rounded-lg border border-white/2">
                    {keysList.map(key => (
                      <span key={key} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-cyan-400 rounded-md text-[10px] font-mono flex items-center gap-1.5">
                        {key}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveKey(key)}
                          className="hover:text-red-400 focus:outline-none cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* PII Masking Custom Settings Card */}
            <section className="glass-panel rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Маскирование Персональных Данных (PII)</h2>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-semibold text-slate-300">Встроенные PII-маски (активны по умолчанию):</label>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Для соответствия требованиям GDPR / 152-ФЗ следующие типы полей маскируются полностью (`***`): 
                  <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">password</code>, 
                  <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">card</code>, 
                  <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">cvv</code>, 
                  <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded mx-1 font-mono">cc_</code>.
                  Поля email и телефонов маскируются частично для демонстрации передачи формата.
                </p>
              </div>

              {/* Custom PII Keys Builder */}
              <div className="flex flex-col gap-3 mt-1">
                <label className="text-xs text-slate-400">Ваши кастомные поля для маскирования (например, inn, passport, age):</label>
                
                {/* Form to add */}
                <form onSubmit={handleAddPIIKey} className="flex gap-2">
                  <input
                    type="text"
                    value={newPIIKey}
                    onChange={(e) => setNewPIIKey(e.target.value)}
                    placeholder="Например: passport, secret_field..."
                    className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                  />
                  <button 
                    type="submit"
                    className="px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Добавить
                  </button>
                </form>

                {/* Custom PII keys list */}
                {piiList.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">Список кастомных PII масок пуст. Любые нестандартные поля будут отправлены как есть.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-black/10 rounded-lg border border-white/2">
                    {piiList.map(key => (
                      <span key={key} className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-cyan-400 rounded-md text-[10px] font-mono flex items-center gap-1.5">
                        {key}
                        <button 
                          type="button" 
                          onClick={() => handleRemovePIIKey(key)}
                          className="hover:text-red-400 focus:outline-none cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right panel: Sidebar with Webhook Logs Console */}
          <div className="flex flex-col gap-6">
            <section className="glass-panel rounded-xl p-5 flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Журнал Вебхуков</h2>
                </div>
                {webhookLogs.length > 0 && (
                  <button 
                    onClick={clearWebhookLogs}
                    className="text-[10px] text-slate-500 hover:text-slate-400 font-medium cursor-pointer"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {webhookLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 p-10 flex-1 border border-dashed border-white/5 rounded-lg">
                  <Code className="w-8 h-8 text-slate-700" />
                  <span className="text-xs text-slate-400 font-medium">Консоль пуста</span>
                  <p className="text-[9px] text-slate-500 leading-relaxed max-w-[180px]">
                    Отправляйте формы на сайтах с включенным Sandbox Mode для наполнения журнала.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
                  {webhookLogs.map((log) => (
                    <div 
                      key={log.id} 
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      className={`border rounded-lg p-3 flex flex-col gap-1.5 transition-all cursor-pointer ${
                        selectedLog?.id === log.id 
                          ? 'bg-slate-900 border-cyan-500/40' 
                          : 'bg-slate-900/30 border-white/5 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-300">
                          Форма: {log.formId}
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          HTTP {log.responseStatus}
                        </span>
                      </div>
                      
                      <div className="text-[8px] text-slate-400 font-mono flex items-center justify-between">
                        <span>Время: {log.timestamp}</span>
                        <span className="text-cyan-400 select-none">
                          {selectedLog?.id === log.id ? 'Скрыть детали' : 'Детали...'}
                        </span>
                      </div>

                      {/* Expandable inspector */}
                      {selectedLog?.id === log.id && (
                        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-0.5 text-[8px] font-mono">
                            <span className="text-slate-500">// URL источника:</span>
                            <a href={log.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline flex items-center gap-0.5 truncate">
                              {log.url} <ExternalLink className="w-2.5 h-2.5 inline" />
                            </a>
                          </div>

                          <div className="flex flex-col gap-1 text-[8px] font-mono">
                            <span className="text-slate-500">// Данные запроса (Payload):</span>
                            <div className="bg-black/40 rounded p-2 text-slate-300 max-h-32 overflow-y-auto text-[9px]">
                              <pre className="m-0 leading-normal whitespace-pre-wrap">{JSON.stringify(log.payload, null, 2)}</pre>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-[8px] font-mono">
                            <span className="text-slate-500">// Ответ сервера:</span>
                            <div className="bg-black/40 rounded p-2 text-slate-300 max-h-20 overflow-y-auto text-[9px] break-all">
                              {log.responseText || 'Пустой ответ'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
