# Implementation Plan v2.0: Advanced Features & Scaling

This document presents a step-by-step technical plan for upgrading the **Dynamic UTM & Lead Source Validator** extension to version 2.0. The plan covers the implementation of advanced UI/UX capabilities, report branding, interactive DOM highlighting, analytics tag validation, and PII protection.

---

## User Review Required

> [!IMPORTANT]
> **Manifest V3 Permissions (Side Panel):** To enable side panel support, we will add the `"sidePanel"` permission in `manifest.json`. We will configure the action click handler to open the side panel (which is more convenient for inspecting forms in parallel with the webpage layout), but note that this replaces the standard browser action Popup.
> 
> **Main World Script Injection (MAIN):** For accurate diagnostics of analytical JS trackers (Google Tag Manager `window.dataLayer`, Yandex.Metrica `ym`), we need to bypass the content script execution isolation. We will create an `inject.js` script injected directly into the page context (`world: "MAIN"`), which may require CSP configurations on target sites.

> [!WARNING]
> **White Label Logo Storage:** The maximum size of a single key in `chrome.storage.sync` is 8 KB. We will implement client-side image compression via HTML5 Canvas to downscale the uploaded logo to a maximum of 120x60 pixels before encoding to Base64 to ensure it saves successfully to storage settings.

---

## Open Questions

> [!NOTE]
> **1. Scope of Detected Pixels and Trackers:**
> Is checking for GTM, GA4, and Yandex.Metrica sufficient? We propose adding support for Facebook Pixel (`fbq`), TikTok Pixel (`ttq`), and HubSpot Tracking (`_hsq`).
> 
> **2. PII Masking Strength:**
> We propose replacing sensitive input fields (e.g., fields matching `password`, `pwd`, `card`, `cvv`, `cc_`) entirely with `***`. Fields like email and phone can be partially masked (e.g., `t***s@domain.com`, `+1***555`). Should we provide users with customizable masking patterns?

---

## Proposed Changes

We propose modifying 6 existing files and creating 1 new script.

---

### Component 1: UI & Side Panel (Interface, Side Panel & Settings)

#### [MODIFY] [manifest.json](public/manifest.json)
- Add `"sidePanel"` permission to the `"permissions"` array.
- Register the side panel layout:
  ```json
  "side_panel": {
    "default_path": "src/popup/index.html"
  }
  ```
- Register the `inject.js` file as a web accessible resource:
  ```json
  "web_accessible_resources": [
    {
      "resources": ["inject.js"],
      "matches": ["<all_urls>"]
    }
  ]
  ```

#### [MODIFY] [service-worker.js](src/background/service-worker.js)
- Configure the default action behavior to open the side panel when clicked:
  ```javascript
  if (chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Side Panel activation error:", error));
  }
  ```
- Extend the webhook forwarding logic to record and mask payloads before saving to `chrome.storage.local`.

#### [MODIFY] [store.js](src/popup/store.js)
- Expand the Zustand store state:
  - `whiteLabel`: branding object `{ agencyName: '', email: '', phone: '', website: '', logoBase64: '' }`
  - `analyticsStatus`: tracking status `{ gtm: false, ga4: false, ym: false }`
- Add Zustand actions:
  - `setWhiteLabel(data)` — saves white label branding data to `chrome.storage.local`.
  - `setAnalyticsStatus(status)` — updates trackers and re-runs `calculateHealthScore`.
- Update `calculateHealthScore`: deduct `-10 points` for each uninitialized analytics script detected in the page DOM.

#### [MODIFY] [Options.jsx](src/options/Options.jsx)
- Build the **White Label Branding** settings interface:
  - Add text fields for Agency Name, Email, Phone, and Website.
  - Add a file input element: `<input type="file" accept="image/*" />`.
  - Implement client-side logo compression:
    ```javascript
    const resizeLogo = (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Scale to 120x60px preserving aspect ratio
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
          // Save in Zustand / Chrome Sync
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    };
    ```

#### [MODIFY] [Popup.jsx](src/popup/Popup.jsx)
- Integrate `whiteLabel` configuration details into the off-screen PDF template (`reportRef`).
  - Render the custom logo in the report header (if loaded).
  - Print the agency's contact information in the PDF A4 footer.
- Add a **"Generate UTM"** button to the URL section of the Dashboard tab:
  - This method appends dummy parameters (`?utm_source=google&utm_medium=cpc&utm_campaign=test_campaign&gclid=test_gclid_123`) to the tab URL and refreshes the tab.
- Add a "Highlight Form" (Eye icon) button in the Data Tree tab:
  - This sends a `HIGHLIGHT_FORM` action containing the `formIndex` to the active tab.

---

### Component 2: DOM & Diagnostics (DOM Scanner, Tag Injector & Masking)

#### [MODIFY] [content.js](src/content/content.js)
- Add a runtime listener for `HIGHLIGHT_FORM`:
  - Locate the target form element by index.
  - Smooth-scroll to the form via `scrollIntoView({ behavior: 'smooth', block: 'center' })`.
  - Toggle temporary CSS highlight styling: apply a neon indigo outline (`outline: 4px solid #6366f1`, `box-shadow: 0 0 25px rgba(99, 102, 241, 0.8)`) for 2.5 seconds.
- Inject `inject.js` into the page DOM during load:
  ```javascript
  if (window.self === window.top) { // Top frame only
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }
  ```
- Receive `ANALYTICS_DIAGNOSTICS` CustomEvents from the page context transmitting script variables state (`window.dataLayer`, `window.ym`, etc.).
- Mask PII parameters inside the `handleSubmit` event proxy:
  - Test field names against regex matching passwords, card numbers, and CVVs.
  - Mask sensitive values as `***` before posting the payload payload to the Service Worker and the webhook receiver.

#### [NEW] [inject.js](public/inject.js)
*Note: Compiled via Vite or copied directly into the public distribution path.*
- Inspect the page context variables (Main World) periodically (every 500ms for 3s):
  - `window.google_tag_manager` and `window.dataLayer` (GTM).
  - `window.gtag` (Google Analytics).
  - `window.ym` (Yandex.Metrica).
- Dispatches findings to the Content Script sandbox via a CustomEvent:
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
1. **PII Masking Checks:**
   - Write tests in `test_health_score.js` (or a dedicated file) to check the form masking utilities.
   - Assert that field keys matching `password`, `cvv`, or `card_number` are successfully replaced by `***` in the output JSON.
2. **Logo Compression Checks:**
   - Verify that supplying a 1MB file to the image resizing canvas outputs a Base64 string smaller than 8KB.

### Manual Verification
1. **Side Panel Support:**
   - Load the unpacked extension, open a browser window, and click the extension icon.
   - Verify that the Side Panel renders on the right side and scales correctly.
2. **Form Highlighting:**
   - Open a page with multiple forms. Select the Eye icon on Form #2 in the Data Tree tab.
   - Verify that the page smoothly scrolls to Form #2 and highlights it with a neon border.
3. **URL Parameter Builder:**
   - Navigate to a site without UTM query strings.
   - Click "UTM" on the Dashboard. Verify the page reloads with dummy query parameters, and the Health Score updates.
4. **White Label PDF Branding:**
   - Load settings, populate agency details, and upload a branding logo.
   - Run the audit, click "Download PDF Report", and check that the generated document shows the custom logo and footer info.
5. **PII Masking in Log Streams:**
   - Enable Sandbox Mode, fill out form details (including passwords), and click submit.
   - Check the Sandbox submission logs and the n8n receiving webhook payload to confirm passwords have been replaced with `***`.
