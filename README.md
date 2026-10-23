<p align="center">
  <img src=".github/assets/banner.svg" alt="LEAD SCRAPER: One-click real-estate lead capture, right in Chrome." width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-public-10b981?style=for-the-badge" alt="Public">
  <img src="https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/github/last-commit/F0rger123/lead-scraper-extension?style=for-the-badge&color=10b981" alt="Last commit">
  <img src="https://img.shields.io/github/repo-size/F0rger123/lead-scraper-extension?style=for-the-badge&color=10b981" alt="Repo size">
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Chrome%20MV3-0d1117?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome MV3">
  <img src="https://img.shields.io/badge/JavaScript-0d1117?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-0d1117?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-0d1117?style=flat-square&logo=css&logoColor=white" alt="CSS3">
</p>

<h3 align="center">A floating “Add Lead” button on PropWire, Zillow, Homes.com and Trulia listings. One click captures the property and opens a skip trace.</h3>

<p align="center">
  <a href="#-how-it-works">How it works</a> ·
  <a href="#-whats-in-the-box">What's in the box</a> ·
  <a href="#-field-manual">Field manual</a> ·
  <a href="#-license">License</a>
</p>

<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

## 🧲 How it works

```mermaid
sequenceDiagram
    participant U as 🧑 You
    participant P as 🏠 Listing page
    participant C as content.js
    participant B as background.js
    participant S as 🔍 Skip-trace site
    U->>P: open a property listing
    C->>P: inject “+ Add Lead”
    U->>C: click
    C->>C: extract address, owner, price, status, URL
    C->>B: save lead
    B->>B: chrome.storage + badge count
    B->>S: open skip-trace tab
    U->>B: popup → Export CSV
```

## 🧰 What's in the box

| File | Role |
|---|---|
| `manifest.json` | Manifest V3, host permissions for the four listing sites |
| `content.js` | Page parsing and the floating button |
| `background.js` | Storage, badge and tab handling |
| `popup.html` · `popup.js` · `styles.css` | Pending leads, CSV export, clear all |

> Use it within each website's terms of service and applicable privacy laws.

## 📊 Code composition

```mermaid
%%{init: {'theme':'base','themeVariables':{'pie1':'#10b981','pie2':'#84cc16','pie3':'#64748b','pie4':'#94a3b8','pie5':'#475569','pie6':'#cbd5e1','pie7':'#334155','pieStrokeColor':'#0d1117','pieOuterStrokeColor':'#0d1117','pieTitleTextColor':'#8b949e','pieLegendTextColor':'#8b949e','pieSectionTextColor':'#0d1117'}}}%%
pie title Code composition (% of bytes, via GitHub linguist)
    "JavaScript" : 83.1
    "HTML" : 14.0
    "CSS" : 2.9
```

<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

## 📚 Field manual

One-click lead capture from real estate websites. Auto-skip trace via CyberBackgroundCheck.

## Supported Sites
- ✅ PropWire
- ✅ Zillow
- ✅ Homes.com
- ✅ Trulia

## Features
- 🏠 Floating "Add Lead" button on property pages
- 🔍 Auto-extracts: address, owner, price, status, listing URL
- 📞 One-click skip trace via CyberBackgroundCheck (opens in new tab)
- 📊 Export all leads to CSV (import to Google Sheets)
- 🔢 Badge shows pending lead count
- 💾 Leads stored locally until you export

## Installation

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this folder (`lead-scraper-extension`)
5. Done! Visit any property page on PropWire/Zillow/Homes.com/Trulia

## How to Use

1. **Browse** to a property listing on any supported site
2. Click the **🏠 + Add Lead** button (bottom right corner)
3. A new tab opens with CyberBackgroundCheck skip trace
4. Enter the phone number you find there
5. Click the extension icon (puzzle piece) to:
   - View pending leads
   - Export to CSV
   - Clear all leads

## Export to Google Sheets

1. Click extension icon → **Export CSV**
2. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1GjB4P5SKiMoZDrlkuOvgetpynYhE0yTPFm-R56NLZhg/edit
3. File → Import → Upload the CSV
4. Done!

## Coming Soon
- Direct Google Sheets push (no manual import)
- Auto phone number extraction from CyberBackgroundCheck
- Bulk lead import from search result pages
- Jarvis AI integration (auto-scripts, follow-up reminders)

## 📜 License

Released under the [MIT License](LICENSE). Use it, fork it, ship it.

<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

<p align="center">
  <sub>Built by <a href="https://github.com/F0rger123"><b>@F0rger123</b></a> · MIT licensed</sub>
</p>
