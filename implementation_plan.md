# План реализации v2.0: Дополнительный функционал и масштабирование

Этот документ представляет собой пошаговый технический план модернизации расширения **Dynamic UTM & Lead Source Validator** до версии 2.0. План описывает внедрение дополнительных UX/UI возможностей, брендирования отчетов, интерактивного взаимодействия с DOM веб-страниц, проверки счетчиков аналитики и обеспечения безопасности персональных данных.

---

## User Review Required

> [!IMPORTANT]
> **Разрешения Manifest V3 (Side Panel):** Для включения поддержки боковой панели потребуется добавить разрешение `"sidePanel"` в `manifest.json`. Мы настроим поведение так, чтобы при клике на иконку открывалась Side Panel (она удобнее при параллельной работе с формами сайта), однако это меняет стандартный вид всплывающего окна (Popup).
> 
> **Внедрение скрипта в Main World (MAIN):** Для точной диагностики инициализации JS-счетчиков аналитики (Google Tag Manager `window.dataLayer`, Яндекс.Метрика `ym`) нам необходимо обойти изоляцию Content Script. Мы создадим файл `inject.js`, внедряемый напрямую в контекст страницы (`world: "MAIN"`), что потребует согласования CSP на сайтах клиентов.

> [!WARNING]
> **Хранение логотипов White Label:** Ограничение `chrome.storage.sync` на размер одного ключа составляет 8 КБ. Мы реализуем сжатие загружаемого логотипа через HTML5 Canvas до максимального разрешения 120x60 пикселей перед кодированием в Base64, чтобы гарантировать сохранение настроек брендинга.

---

## Open Questions

> [!NOTE]
> **1. Спектр детектируемых пикселей и трекеров:**
> Достаточно ли проверять инициализацию GTM, GA4 и Яндекс.Метрики? Предлагается добавить также поддержку Facebook Pixel (`fbq`), TikTok Pixel (`ttq`) и HubSpot Tracking (`_hsq`).
> 
> **2. Уровень маскирования PII:**
> Предлагается полностью заменять маской `***` поля паролей (`password`, `pwd`) и кредитных карт (`card`, `cvv`, `cc_`). Поля E-mail и телефона маскировать частично (например, `t***s@domain.com`, `+7***12`). Нужна ли возможность гибкой настройки масок пользователем?

---

## Proposed Changes

Предлагается внести изменения в 6 существующих файлов и создать 1 новый скрипт.

---

### Component 1: UI & Side Panel (Интерфейс, боковая панель и настройки)

#### [MODIFY] [manifest.json](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/public/manifest.json)
- Добавление разрешения `"sidePanel"` в секцию `"permissions"`.
- Регистрация боковой панели:
  ```json
  "side_panel": {
    "default_path": "src/popup/index.html"
  }
  ```
- Регистрация скрипта `inject.js` как ресурса, доступного для веб-страниц:
  ```json
  "web_accessible_resources": [
    {
      "resources": ["inject.js"],
      "matches": ["<all_urls>"]
    }
  ]
  ```

#### [MODIFY] [service-worker.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/background/service-worker.js)
- Настройка дефолтного поведения при клике на иконку расширения: открывать Side Panel, если API поддерживается:
  ```javascript
  if (chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Ошибка активации Side Panel:", error));
  }
  ```
- Расширение логики проксирования вебхуков: запись и маскирование логов перед сохранением в `chrome.storage.local`.

#### [MODIFY] [store.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/popup/store.js)
- Расширение состояния (State) в Zustand:
  - `whiteLabel`: объект `{ agencyName: '', email: '', phone: '', website: '', logoBase64: '' }`
  - `analyticsStatus`: объект `{ gtm: false, ga4: false, ym: false }`
- Добавление действий (Actions):
  - `setWhiteLabel(data)` — сохранение брендинга в `chrome.storage.sync`.
  - `setAnalyticsStatus(status)` — обновление статусов счетчиков с пересчетом Health Score.
- Обновление функции `calculateHealthScore`: добавление штрафа `-10 баллов` за каждый неинициализированный счетчик, если на странице есть соответствующие скрипты.

#### [MODIFY] [Options.jsx](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/options/Options.jsx)
- Верстка секции **Брендинг отчетов (White Label)**:
  - Текстовые поля: Название агентства, Контакты (Email, Телефон, Сайт).
  - Элемент загрузки логотипа: `<input type="file" accept="image/*" />`.
  - Реализация функции сжатия на клиенте:
    ```javascript
    const resizeLogo = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Ограничиваем до 120x60px сохраняя пропорции
          const maxW = 120;
          const maxH = 60;
          if (width > maxW || height > maxH) {
            const ratio = Math.min(maxW / width, maxH / height);
            width = width * ratio;
            height = height * ratio;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/png');
          // Сохраняем в Zustand / Chrome Sync
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
    ```

#### [MODIFY] [Popup.jsx](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/popup/Popup.jsx)
- Интеграция параметров `whiteLabel` в скрытый HTML-шаблон `reportRef`.
  - Логотип отображается в шапке отчета (если загружен).
  - Контакты агентства рендерятся в футере PDF-листа А4.
- Добавление кнопки **«Сгенерировать UTM»** в секцию URL на вкладке Dashboard:
  - Метод дописывает к URL текущей вкладки тестовые параметры (`?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&gclid=test_gclid_123`) и перезагружает ее.
- Добавление кнопки-иконки «Глаз» (Подсветить форму) в компоненте рендеринга Data Tree:
  - При клике шлется сообщение `HIGHLIGHT_FORM` с `formIndex` в активную вкладку.

---

### Component 2: DOM & Diagnostics (Сканер DOM, инжектор счетчиков и маскирование)

#### [MODIFY] [content.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/content/content.js)
- Добавление слушателя событий для `HIGHLIGHT_FORM`:
  - Находит целевую форму по индексу.
  - Делает плавную прокрутку `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
  - Добавляет временные CSS-стили подсветки: фиолетовая неоновая рамка (`outline: 4px solid #6366f1`, `box-shadow: 0 0 25px rgba(99, 102, 241, 0.8)`) на 2.5 секунды.
- Внедрение `inject.js` в DOM при запуске:
  ```javascript
  if (window.self === window.top) { // Только в главном окне
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }
  ```
- Добавление слушателя CustomEvent `ANALYTICS_DIAGNOSTICS` от инжектированного скрипта, передающего статус инициализации переменных `window.dataLayer`, `window.ym` и т.д.
- Маскирование PII в обработчике `handleSubmit`:
  - Регулярные выражения для детекции полей паролей, кредитных карт и CVV.
  - Значения этих полей заменяются на строку `***` до того, как payload будет отправлен в Service Worker и вебхук n8n.

#### [NEW] [inject.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/public/inject.js)
*Примечание: скрипт компилируется Vite или копируется напрямую в папку сборки `public/`*
- Опрашивает контекст страницы (Main World) каждые 500мс (интервал до 3 секунд):
  - `window.google_tag_manager` и `window.dataLayer` (GTM).
  - `window.gtag` (Google Analytics).
  - `window.ym` (Яндекс.Метрика).
- Отправляет результат в Content Script через кастомное событие:
  ```javascript
  document.dispatchEvent(new CustomEvent('ANALYTICS_DIAGNOSTICS', {
    detail: {
      gtm: !!(window.google_tag_manager && window.dataLayer),
      ga4: !!(window.gtag || window.google_tag_manager),
      ym: typeof window.ym === 'function'
    }
  }));
  ```

---

## Verification Plan

### Automated Tests
1. **Тест маскирования PII:**
   - Добавить тесты в `test_health_score.js` (или отдельный файл тестов), проверяющие функцию очистки данных формы.
   - Assert, что при наличии полей `password`, `cvv`, `card_number` their исходные значения в JSON заменяются на `***`.
2. **Тест размера логотипа:**
   - Проверка функции компрессии: при подаче изображения размером 1 МБ на выходе получается Base64 строка объемом менее 8 КБ.

### Manual Verification
1. **Проверка боковой панели (Side Panel):**
   - Открыть любую страницу. Кликнуть на иконку расширения.
   - Убедиться, что справа открывается устойчивая панель, интерфейс полностью масштабирован по ширине.
2. **Проверка подсветки форм:**
   - Открыть страницу с несколькими формами. В Дереве данных кликнуть на значок подсветки формы #2.
   - Страница должна плавно прокрутиться к форме, вокруг нее должна появиться мигающая неоново-фиолетовая обводка.
3. **Проверка автозаполнения меток:**
   - Открыть чистый сайт (без UTM).
   - В попапе нажать «Сгенерировать UTM». Убедиться, что вкладка перезагрузилась, URL содержит тестовые метки, а Health Score пересчитался.
4. **Проверка White Label PDF:**
   - В настройках загрузить файл логотипа и заполнить данные агентства.
   - Вернуться на дашборд, нажать «Скачать PDF-отчет». Убедиться, что PDF содержит загруженный логотип и контактные данные в футере.
5. **Проверка маскирования PII в вебхуках:**
   - Включить Sandbox Mode, заполнить форму на сайте (включая поле пароля).
   - Отправить форму. В логах n8n (или webhook.site) убедиться, что значение пароля ушло как `***`, предотвращая утечку данных.
