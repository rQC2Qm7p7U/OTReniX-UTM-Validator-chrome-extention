# Chrome Web Store Listing — Dynamic UTM & Lead Source Validator

> Last Updated: 2026-05-31

## Store Listing

**Extension Name** [REQUIRED]
Dynamic UTM & Lead Source Validator

**Short Description** [REQUIRED]
Audit web forms, track redirect chains, and simulate UTM submissions to n8n/Google Apps Script for B2B.

**Detailed Description** [REQUIRED]
Dynamic UTM & Lead Source Validator is the ultimate tool for B2B marketers, agency growth teams, and web developers to audit, validate, and verify lead capture attribution settings in real time.

Key Features:
- Multi-Platform Pixel Detection: Instantly audit GTM, GA4, Yandex.Metrica, Facebook, TikTok, HubSpot, Marketo, and Salesforce Pardot setup with interactive LEDs.
- Form Telemetry Scanning: Crawl nested Shadow DOMs and iframes to map hidden UTM inputs and tracking parameters.
- Redirect Chains Telemetry: Detect redirect hops that strip critical parameters like gclid, li_fat_id, or utm_source.
- Sandbox 2.0 Integration: Intercept form submissions locally, simulate data transmissions, and check API webhook payloads to n8n, Zapier, or Google Apps Script.
- GDPR-Compliant PII Masking: Ensure sensitive user data (passwords, card details, emails) is masked before transmission.
- White Label PDF Exporter: Generate professional 3-page audit reports with your agency logo and contact info.

How to Use:
1. Click the extension icon in the toolbar to slide open the persistent Side Panel.
2. Navigate to your landing page and click the cyan "UTM" button to reload the URL with mock campaign query strings.
3. Inspect the Dashboard for score warnings, missing hidden inputs, and script initialization checks.
4. Fill and submit forms in Sandbox mode to inspect API webhook payloads and transmission logs.
5. Go to the Settings page to configure white label details, agency branding, and custom PII keys.

Privacy and Security Note:
All form scanning, DOM parsing, and validation occur locally inside your browser. Intercepted sandbox form submissions are only transmitted to user-defined webhooks and are never shared with or sent to any third-party servers.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Audits, validates, and simulates marketing UTM tracking fields on web pages.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | Render from `public/favicon.svg` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | Panel dashboard view |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Forms tree visualizer |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | Sandbox webhook log view |

### Screenshot Notes
- **Screenshot 1:** Open the Side Panel on a landing page, showcasing the 100-point Health Score indicator and the Analytics systems audit grid.
- **Screenshot 2:** Show the Forms Tree tab on a multi-form page, illustrating missing parameters warnings and active slots.
- **Screenshot 3:** Display the Sandbox tab telemetry log console with intercepted JSON payloads.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `tabs` | permissions | Used to query active tab URLs for audits and send highlighting instructions to the content script. |
| `storage` | permissions | Used to save user preferences, white-label branding assets, and sandbox webhook logs locally. |
| `webNavigation` | permissions | Used to monitor commit actions on navigation transitions to reset redirect chains logs and prevent stale audit results. |
| `webRequest` | permissions | Used to intercept outbound telemetry events from tracking pixels to verify actual script initialization. |
| `sidePanel` | permissions | Required to render the persistent full-height auditing panel on the side of the browser window. |
| `<all_urls>` | host_permissions | Allows the validator to verify tracking parameters and lead capture forms on any host page visited by the user. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

*(All DOM auditing, cookie parsing, and network captures remain strictly local inside the extension. Webhook payloads in Sandbox Mode are sent directly to user-configured API endpoints only.)*

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [RECOMMENDED]
*(Use a public page detailing that all data stays local on the client device.)*

## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

## Developer Info

**Publisher Name** [REQUIRED]
OTReniX B2B Agency

**Contact Email** [REQUIRED]
consult@otrenix.com

**Homepage URL** [RECOMMENDED]
https://otrenix.com

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| v3.3.0 | 2026-05-31 | Added Marketo & Pardot tracking support, optimized popup footprint, separated modular panels, and upgraded reports to dynamic-height PDF pagination. | Draft |
