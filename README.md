<div align="center">

# ⚡ OTReniX UTM & Lead Source Validator

<p align="center">
  <strong>A premium Chrome Extension for B2B marketers to audit lead capture forms,<br>track redirect chains, and simulate end-to-end analytics payloads.</strong>
</p>

<p align="center">
  <a href="https://otrenix.com" target="_blank">
    <img src="https://img.shields.io/badge/Built%20by-OTReniX%20B2B%20Agency-0ea5e9?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Built by OTReniX" />
  </a>
  <a href="https://otrenix.com" target="_blank">
    <img src="https://img.shields.io/badge/Website-otrenix.com-6366f1?style=for-the-badge&logo=googlechrome&logoColor=white" alt="OTReniX Website" />
  </a>
  <a href="https://www.linkedin.com/in/leoshw/" target="_blank">
    <img src="https://img.shields.io/badge/Author-LeoWorks-0077b5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LeoWorks on LinkedIn" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-10b981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="MIT License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/GTM-Detection-4285f4?style=flat-square&logo=googletagmanager&logoColor=white" alt="GTM" />
  <img src="https://img.shields.io/badge/GA4-Detection-e37400?style=flat-square&logo=googleanalytics&logoColor=white" alt="GA4" />
  <img src="https://img.shields.io/badge/Facebook_Pixel-Detection-1877f2?style=flat-square&logo=facebook&logoColor=white" alt="FB Pixel" />
  <img src="https://img.shields.io/badge/TikTok_Pixel-Detection-010101?style=flat-square&logo=tiktok&logoColor=white" alt="TikTok" />
  <img src="https://img.shields.io/badge/HubSpot-Detection-ff7a59?style=flat-square&logo=hubspot&logoColor=white" alt="HubSpot" />
  <img src="https://img.shields.io/badge/Yandex_Metrica-Detection-ffcc00?style=flat-square&logo=yandex&logoColor=black" alt="Yandex Metrica" />
</p>

</div>

---

## 🧭 Overview

In modern B2B marketing, the Cost Per Lead (CPL) can reach hundreds of dollars. Yet up to **30% of leads lose their marketing attribution** on the journey from an ad click to the CRM. This extension, built specifically for the workflows of **[OTReniX B2B Marketing Agency](https://otrenix.com)**, exposes these attribution leaks in a single click.

> **[OTReniX](https://otrenix.com)** is a global B2B marketing agency specializing in Cybersecurity, Industrial, and B2B SaaS pipeline growth. This extension is an internal tool open-sourced to help the broader B2B marketing community.

### Why attribution breaks:

| Cause | Description |
|---|---|
| 🔀 **Redirect chains** | 301/302 redirects strip UTM query parameters before the landing page loads |
| ⚡ **Dynamic forms** | React/Vue forms render after page load; analytics scripts miss the hidden field population window |
| 🧱 **Shadow DOM / iframes** | Form builders (Elementor, HubSpot Forms, Divi) hide inputs inside shadow roots or cross-domain iframes |

---

## ✨ Features

### 🩺 Instant Health Score
A penalty-based scoring engine rates the page from **0 to 100**:

| Status | Color | Condition |
|---|---|---|
| 🔴 **Critical** | Red | UTM in URL but missing in form hidden fields or storage |
| 🔴 **Critical** | Red | A redirect stripped UTM parameters from the chain |
| 🟠 **High** | Orange | Hidden fields detected but empty on form submission |
| 🟡 **Medium** | Yellow | Form has no hidden fields to capture marketing parameters |
| 🔵 **Warning** | Blue | Core analytics cookies (`_ga`, `_ym_uid`) not found |
| 🔵 **Warning** | Blue | Analytics script detected in DOM but not initialized (blocked by AdBlock?) |

### 🌳 Interactive Data Tree
Visualizes the full DOM structure of every form — including those inside **Shadow DOM** and **iframes**. See field names, types, and live values at a glance. UTM slots are highlighted green (filled) or red (empty).

### 🧪 Sandbox Mode 2.0
Safe stress-testing of form submissions without polluting your production CRM:
- Intercepts the `submit` event and **blocks the real submission**
- Collects all form fields + UTM params from URL, cookies, and localStorage
- Fires a real **POST webhook** to your n8n / Google Apps Script endpoint
- Logs the HTTP response code and payload directly in the extension UI

### 🔬 Multi-Layer Analytics Detection
Three independent detection vectors ensure near-100% accuracy:

```
Layer 1 — DOM Scan        : script[src*="gtm.js"], fbevents.js, hs-scripts.com ...
Layer 2 — Network Monitor : webRequest API intercepts actual pixel/beacon requests
Layer 3 — Window Objects  : window.gtag, window.fbq, window.ym, window.ttq ...
```

### 📄 Dual-Format Report Export

| Format | Use Case |
|---|---|
| 📋 **Markdown Tech Spec** | Paste into Jira, Slack, Notion, or Telegram for developers |
| 📑 **PDF Audit Report** | White-label branded 3-page PDF for client outreach |

### 🏷️ White Label Branding
Customize every PDF with your agency name, logo, email, phone, and website for seamless client delivery.

### 🛡️ GDPR-Compliant PII Masking
`password`, `card`, `cvv`, `passport`, `secret` fields are automatically masked (`***`) in webhook payloads. Email and phone fields are partially masked. Custom PII rules are configurable.

---

## 🚀 Installation (Developer Mode)

```bash
# 1. Clone the repository
git clone https://github.com/rQC2Qm7p7U/OTReniX-UTM-Validator-chrome-extention.git
cd OTReniX-UTM-Validator-chrome-extention

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build
# → Outputs to /dist folder
```

Then in **Chrome**:
1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. The ⚡ icon will appear in your toolbar

---

## 🎯 Step-by-Step Audit Walkthrough

**1. Run an Audit**
- Open any B2B landing page with a contact or demo form
- Add test UTM parameters to the URL:
  ```
  https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=abc123
  ```
- Click the extension icon → the **Dashboard** shows the Health Score and issues

**2. Inspect Form Fields**
- Switch to the **Data Tree** tab
- Expand any form to verify hidden UTM fields and their live values

**3. Simulate a Submission (Sandbox)**
- Open **Settings** → paste your webhook URL (e.g., from [Webhook.site](https://webhook.site))
- Go to **Sandbox** tab → enable **Sandbox Mode 2.0**
- Fill and submit the form — the extension intercepts it and sends the payload to your webhook

---

## 🏢 Agency Lead Generation Playbook

This extension is designed as a **free lead magnet** for digital agencies offering analytics and CRM attribution services.

1. **Audit a prospect's site** — open their contact or demo request page
2. **Find the attribution leak** — if the Health Score is low, download the PDF report
3. **Send a cold outreach email** with the PDF:

> *"Hi [Name], we ran a quick attribution audit on your website's contact form. Due to a server-side redirect, UTM parameters from your LinkedIn Ads are being stripped before the lead lands in your CRM — meaning your leads show up as 'Direct / Unknown'. We've attached a detailed technical report. We can fix this and set up proper end-to-end tracking. Happy to jump on a 15-min call."*

---

## 🛠️ Tech Stack

<p>
  <img src="https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285f4?style=flat-square&logo=googlechrome&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19.x-61dafb?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-5.x-646cff?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Zustand-State_Management-2d3748?style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/html2pdf.js-PDF_Export-dc2626?style=flat-square" />
  <img src="https://img.shields.io/badge/Lucide_React-Icons-f97316?style=flat-square" />
</p>

| Layer | Technology |
|---|---|
| **UI Framework** | React 19 + JSX |
| **Build Tool** | Vite 5 |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand |
| **PDF Export** | html2pdf.js + html2canvas-pro |
| **Icons** | Lucide React |
| **Extension API** | Chrome MV3 — `chrome.storage`, `chrome.webRequest`, `chrome.webNavigation`, `chrome.sidePanel` |

---

## 📁 Project Structure

```
├── public/
│   ├── manifest.json        # Chrome Extension Manifest V3
│   └── inject.js            # Main-world script for window object detection
├── src/
│   ├── popup/
│   │   ├── Popup.jsx        # Main extension popup UI
│   │   ├── store.js         # Zustand state + Health Score engine
│   │   └── index.html
│   ├── options/
│   │   ├── Options.jsx      # Settings page (webhook, white label, PII)
│   │   └── index.html
│   ├── content/
│   │   └── content.js       # Content script — DOM scan, form intercept
│   └── background/
│       └── service-worker.js # MV3 service worker — network monitoring
├── test_health_score.js     # Unit tests for Health Score engine
├── vite.config.js
└── README.md
```

---

## 🔒 Security & Privacy

- **No external data collection** — all data stays in the browser (Chrome storage)
- **No analytics tracking** in the extension itself
- **PII auto-masking** — sensitive fields are never sent to webhooks in plaintext
- **Webhook URL** is user-defined and stored only in `chrome.storage.sync`
- The extension **only activates on user request** — no background data harvesting

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ by [OTReniX B2B Marketing Agency](https://otrenix.com)**

*Helping Cybersecurity, Industrial, and B2B SaaS companies build measurable pipeline.*

<br>

**Designed & Engineered by [LeoWorks](https://www.linkedin.com/in/leoshw/)**

<p align="center">
  <a href="https://otrenix.com">
    <img src="https://img.shields.io/badge/🌐_Visit-otrenix.com-0ea5e9?style=for-the-badge" alt="OTReniX" />
  </a>
  &nbsp;
  <a href="https://www.linkedin.com/in/leoshw/">
    <img src="https://img.shields.io/badge/LinkedIn-LeoWorks-0077b5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LeoWorks LinkedIn" />
  </a>
</p>

</div>
