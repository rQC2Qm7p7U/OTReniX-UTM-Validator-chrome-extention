# План реализации v3.4: Интеграция с Cookie Consent (Аудит соответствия GDPR/CCPA)

Этот документ описывает технический дизайн и пошаговый план внедрения автоматического аудита согласия на файлы cookie (**GDPR/CCPA Cookie Consent Compliance**) в расширение **Dynamic UTM & Lead Source Validator**.

---

## Goal Description

В странах ЕС и США законодательство (GDPR и CCPA) запрещает устанавливать аналитические и рекламные файлы cookie (такие как `_ga`, `_fbp`, `_mkto_trk`) до того, как пользователь выразит явное согласие через баннер (Cookie Consent Manager).
Мы внедрим интеллектуальный алгоритм, определяющий, установлены ли маркетинговые cookie при отсутствии файлов согласия (CMP кук), отобразим статус соответствия на Dashboard и в PDF-отчете, а также скорректируем расчет Health Score.

---

## Proposed Changes

Мы реализуем детекцию двух типов кук:
1. **Маркетинговые/аналитические куки (проверяемые на соответствие):**
   - Google Analytics: `_ga`, `_gid`, `_gat`, `_gcl_au`
   - Yandex.Metrica: `_ym_uid`, `_ym_d`, `_ym_isad`
   - Facebook Pixel: `_fbp`, `_fbc`
   - TikTok Pixel: `_ttp`, `_tt_enable_cookie`
   - HubSpot: `hubspotutk`
   - Marketo: `_mkto_trk`
   - Salesforce Pardot: `pi_opt_in`
2. **Куки платформ согласия (Consent Management Platforms - CMP):**
   - OneTrust / Optanon: `OptanonConsent`, `OptanonAlertBoxClosed`
   - Cookiebot: `CookieConsent`
   - CookieYes: `cookieyes-consent`
   - Другие стандартные плагины: `cookieconsent_status`, `euconsent-v2`, `gdpr_consent`, `ccpa-consent`

Если найдены куки из группы (1), но отсутствуют куки из группы (2), система регистрирует **GDPR/CCPA Prior Consent Violation** (нарушение приоритета согласия) и штрафует Health Score на **15 очков**.

---

### Component 1: Логика расчета и штрафов (store.js)

#### [MODIFY] [store.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/popup/store.js)
* В функцию `calculateHealthScore()` добавить проверку согласия кук:
  * Получить списки кук.
  * Найти присутствующие маркетинговые куки.
  * Проверить, есть ли хоть одна кука согласия (CMP cookie).
  * Если маркетинговые куки обнаружены, но куки согласия нет:
    * Снизить итоговый счет (`score`) на **15 очков**.
    * Добавить в массив `penalties` объект предупреждения `type: 'high'` с детальным описанием и списком несанкционированно записанных кук.
  * Пример реализации:
    ```javascript
    const MARKETING_COOKIE_PATTERNS = ['_ga', '_gid', '_gat', '_gcl_au', '_ym_uid', '_ym_d', '_ym_isad', '_fbp', '_fbc', '_ttp', 'hubspotutk', '_mkto_trk', 'pi_opt_in'];
    const CONSENT_COOKIE_PATTERNS = ['optanonconsent', 'optanonalertboxclosed', 'cookieconsent', 'cookieyes-consent', 'cookieconsent_status', 'euconsent-v2', 'gdpr_consent', 'ccpa-consent'];
    ```

---

### Component 2: Отображение статуса согласия в интерфейсе (DashboardTab.jsx)

#### [MODIFY] [DashboardTab.jsx](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/popup/tabs/DashboardTab.jsx)
* Под разделом "Analytics Systems Audit" добавить новый визуальный блок **"GDPR/CCPA Cookie Consent Compliance"**:
  * Карточка с индикатором статуса согласия:
    * **Compliant (Зеленый):** Куки согласия найдены ИЛИ маркетинговые куки отсутствуют вовсе.
    * **Non-Compliant (Красный):** Маркетинговые куки записаны без согласия пользователя.
  * Вывести список обнаруженных несанкционированных кук и название обнаруженной CMP платформы (например, OneTrust, Cookiebot, CookieYes), если соответствующая кука найдена.

---

### Component 3: Экспорт результатов в PDF (PdfReport.jsx)

#### [MODIFY] [PdfReport.jsx](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/src/popup/PdfReport.jsx)
* На Странице 1 PDF-отчета добавить мини-виджет с оценкой GDPR/CCPA соответствия.
* На Странице 2 в раздел "Key Violations" выводить описание нарушения списания очков за Prior Consent, если оно было зафиксировано.

---

## Verification Plan

### Automated Tests

#### [MODIFY] [test_health_score.js](file:///Users/nata/Desktop/Леонид%20Временная/UTM%20Validator/test_health_score.js)
* Написать новые тест-кейсы:
  * **Test 11:** Наличие маркетинговой куки `_ga` при отсутствии кук согласия возвращает штраф `-15` и снижает счет до `85`.
  * **Test 12:** Наличие маркетинговой куки `_ga` одновременно с кукой согласия `CookieConsent` возвращает `100` (без штрафа).
  * **Test 13:** Отсутствие любых кук возвращает `100` (без штрафа, режим Idle).

### Manual Verification
1. Открыть тестовый домен (например, `https://otrenix.com/contact/`).
2. В расширении открыть Dashboard и проверить появление блока "GDPR/CCPA Cookie Consent Compliance".
3. До нажатия на плашку согласия cookie на сайте убедиться, что индикатор светится красным ("Non-Compliant"), штраф отображается в аудит-логе, а Health Score снижен.
4. Принять соглашение на сайте (кликнуть "Accept" в баннере), убедиться, что индикатор переключился на зеленый ("Compliant"), а штраф исчез.
5. Экспортировать PDF-отчет и верифицировать отображение статуса GDPR в печатной версии.
