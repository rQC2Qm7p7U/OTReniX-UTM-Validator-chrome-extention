# Privacy Policy for Dynamic UTM & Lead Source Validator

Last updated: 2026-05-31

OTReniX B2B Agency ("we," "our," or "us") operates the **Dynamic UTM & Lead Source Validator** Chrome extension. We respect your privacy and are committed to protecting any data processed by the extension. This Privacy Policy describes how we handle information.

---

## 1. What Data We Process

To perform lead source attribution audits and validate web forms, the extension processes the following information:
* **Audited URLs and Redirect Chains:** The URLs of web pages you visit while the Side Panel is active to audit UTM query parameters and redirect hops.
* **HTML Form Structure:** Form element attributes (IDs, names, types) and field visibility indicators to verify lead capture slots.
* **Analytics Cookies and Storage:** Local cookies (e.g., `_ga`, `_ym_uid`, `li_fat_id`, `hubspotutk`, `_mkto_trk`) and localStorage/sessionStorage keys related to marketing analytics.
* **Sandbox Submissions:** Form input values captured during test form submissions when Sandbox Mode is active.

---

## 2. How Data Is Stored

**All data is processed and stored locally on your device.**
* Audited page telemetry, white label configurations, and diagnostic webhook logs are persisted inside your browser's local sandbox using the `chrome.storage.local` and `chrome.storage.session` APIs.
* We do not operate central database servers for this extension. None of your local diagnostics logs or audited page configurations are transmitted to or stored on our servers.

---

## 3. Data Transmission in Sandbox Mode

When you enable **Sandbox Mode** and configure a custom Webhook URL (e.g., n8n, Zapier, or Google Apps Script):
* The extension intercepts form submissions on the active page and transmits the form payload (including form field inputs, active cookies, and UTM attributes) directly to your designated Webhook URL.
* Before transmission, any sensitive data (such as passwords, credit card numbers, CVVs, or custom fields defined in your PII settings) is masked on-device using a GDPR-compliant masking engine (replacing values with `***`).
* **We do not monitor, intercept, or copy any data sent to your custom webhooks.** The transmission occurs directly from your browser to your specified endpoint.

---

## 4. Third-Party Services

This extension does not integrate with any third-party analytics trackers, crash reporters, or advertising networks. No data is shared with third parties.

---

## 5. User Controls and Deletion

All diagnostics telemetry data stays on your device. You can easily view, manage, and delete this data:
* Clear Sandbox submission logs directly within the extension popup under the **Sandbox 2.0** tab by clicking "Clear Console."
* Completely delete all saved extension settings and local diagnostic databases at any time by uninstalling the extension from your browser (`chrome://extensions/` -> Remove).

---

## 6. Changes to This Policy

We may update this Privacy Policy to reflect changes in our extension design or browser store compliance rules. Any updates will be pushed to the project's source repository and updated in the Chrome Web Store listing.

---

## 7. Contact Us

If you have any questions or privacy inquiries regarding this extension, please contact us at:
* **Email:** consult@otrenix.com
* **Website:** [https://otrenix.com](https://otrenix.com)
