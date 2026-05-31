# GDPR/CCPA Cookie Consent Audit (v3.4)

## Phase 1 — Core Logic & Calculations (store.js)
- [x] Add `MARKETING_COOKIE_PATTERNS` and `CONSENT_COOKIE_PATTERNS` definitions to `store.js`.
- [x] Implement Cookie Consent compliance verification in `calculateHealthScore()`:
  - Detect present marketing cookies.
  - Check for active Consent cookies.
  - Apply **-15 points** penalty and warning list for violations.
- [x] Run `npm test` to verify logic before UI modifications.

## Phase 2 — Unit Testing (test_health_score.js)
- [x] Append Test Case 11: GA cookie present with no consent cookie triggers penalty (-15).
- [x] Append Test Case 12: GA cookie present alongside `CookieConsent` is compliant (no penalty).
- [x] Append Test Case 13: No cookies present returns compliant status (no penalty).
- [x] Run `npm test` and ensure all 13 test cases pass cleanly.

## Phase 3 — Dashboard Tab Compliance Panel (DashboardTab.jsx)
- [x] Add Cookie Consent Compliance panel below the Analytics Systems Audit grid.
- [x] Style the card dynamically based on compliance state (Green with glowing drop shadows for Compliant, Red with warning animations for Non-Compliant).
- [x] Display the detected Consent platform names (e.g. OneTrust, Cookiebot, CookieYes) and list any cookies violating GDPR prior consent.

## Phase 4 — PDF Exporter Adjustments (PdfReport.jsx)
- [x] Display GDPR compliance status card on Page 1 of the executive report.
- [x] Add support for printing GDPR Prior Consent violations inside the Technical details checklist.
- [x] Verify compilation with `npm run build` and run a sanity scan.
