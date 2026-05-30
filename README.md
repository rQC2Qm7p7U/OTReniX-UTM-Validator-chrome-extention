# Dynamic UTM & Lead Source Validator (Chrome Extension)

**Dynamic UTM & Lead Source Validator** is a premium tool for B2B marketers, web analysts, and digital agencies designed to audit lead capture forms, track redirect chains, and simulate end-to-end analytics payloads.

The tool helps prevent "leakage" of UTM tags and advertising parameters when submitting leads to CRMs (e.g., Salesforce, HubSpot, Bitrix24), ensuring 100% accuracy of ad budget attribution.

---

## 🎯 Why Is This Needed?

In modern B2B marketing, the Cost Per Lead (CPL) can measure in hundreds of dollars. However, up to **30% of leads** lose their marketing attribution (traffic source) on the way from an ad click to the CRM system. This happens due to:
1. **Redirects (301/302):** Ad links lead to one URL, but the server redirects the user, "stripping" the UTM query parameters.
2. **Dynamic Forms (React/Vue):** Forms are rendered after the page loads, and standard analytics scripts don't populate the hidden fields in time.
3. **Shadow DOM / Iframes:** Embedded form builders (e.g., WordPress Divi, Elementor, HubSpot forms) hide input fields inside shadow roots or cross-domain iframes, making them inaccessible to default capture scripts.

**Dynamic UTM Validator exposes these issues in a single click.**

---

## ✨ Key Features

### 1. Instant Page Health Score
An intelligent engine rates the page on a scale from 0 to 100% using a Penalty Points system:
* **🔴 Critical Status (🔴 Red):** UTM parameters are present in the URL but missing from form hidden fields or storage. Alternatively, a redirect has stripped UTM parameters.
* **🟠 High Status (🟠 Orange):** Hidden fields are detected, but they remain empty upon form submission.
* **🟡 Medium Status (🟡 Yellow):** The form is not prepared to capture tags (lacks matching hidden fields).
* **🔵 Warning (🔵 Blue):** The page is missing core analytics cookies (`_ga` or `_ym_uid`).

### 2. Interactive Data Tree
Visualizes the complete DOM structure of forms on the page, including forms inside iframes and Shadow DOMs. Marketers can immediately see:
* Which fields are present in the form (name, type, current value).
* Hidden UTM fields highlighted in green (if filled) or red (if empty).

### 3. Simulation Mode (Sandbox Mode 2.0)
Allows you to perform a safe stress-test of form submissions:
* Intercepts form submit events (blocks actual submission to prevent polluting production CRMs with test leads).
* Collects the payload (all filled fields + tags from cookies and URL).
* Sends a POST request to your test webhook (e.g., to **n8n** or **Google Apps Script**).
* Displays the server response status (HTTP 200, 500, etc.) directly in the extension UI.

### 4. Dual-Vector Report Export
* **"Copy Tech Spec (MD)" Button:** Copies a formatted Markdown technical specification to clipboard, ready to send to developers via Jira, Slack, or Telegram.
* **"Download PDF Report" Button:** Downloads a beautiful, presentation-ready PDF report with high-level metrics and a custom call to action (CTA).

---

## 📈 Agency-First Playbook (Lead Generation)

If you are a digital agency, you can use this extension as a **free lead magnet** to sell consulting and end-to-end analytics setup services:

1. **Audit a Prospect:** Open a demo/contact form on a high-traffic B2B prospect's site.
2. **Find the Leak:** Run the audit. If the Health Score is low (e.g., redirects strip UTM parameters), download the PDF report.
3. **Outreach:** Send the report to the CMO or business owner with a short message:
   > *"Hello! We audited the contact form on your website. Due to a technical redirect error, marketing tracking parameters from your LinkedIn Ads are lost before the lead is submitted. You are spending budget, but leads arrive in your CRM as 'Organic/Unknown'. We've attached the audit report. We can help you fix this and configure correct end-to-end tracking. Let's discuss."*

---

## 💻 Installation Guide (For Users)

Since this extension is in development, it is installed in Developer Mode:

1. Download the extension project folder.
2. Open your terminal in the project directory and build the extension (requires Node.js):
   ```bash
   npm install
   npm run build
   ```
   This generates a `dist` folder in the root directory.
3. Open Google Chrome and navigate to: `chrome://extensions/`
4. Toggle **"Developer mode"** in the top-right corner.
5. Click **"Load unpacked"** in the top-left corner and select the compiled `dist` folder.
6. Done! The extension icon will appear in your Chrome toolbar.

---

## 🚀 Step-by-Step Audit & Simulation Walkthrough

1. **Running an Audit:**
   * Navigate to any web page containing a form (e.g., a demo request page).
   * Append test parameters to the URL, for example: `?utm_source=google&utm_medium=cpc&li_fat_id=test_linkedin_123`
   * Click the extension icon. The **Dashboard** tab will display the calculated Health Score and the list of issues.

2. **Inspecting Form Fields:**
   * Switch to the **Data Tree** tab.
   * Expand a form in the list to verify if hidden fields are populated with the URL parameter values.

3. **Simulating Submission (Sandbox):**
   * Click **Settings** (the gear icon at the top). Paste your test webhook URL (you can get one for free on [Webhook.site](https://webhook.site)). Click "Save".
   * Return to the popup and switch to the **Sandbox** tab. Toggle **Sandbox Mode 2.0** on.
   * Fill out the form on the audited website and click submit.
   * A toast notification will confirm the submission was intercepted, and a new entry will appear in the Sandbox log showing the sent payload and server response.
