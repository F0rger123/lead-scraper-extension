<p align="center">
  <img src=".github/assets/banner.svg" alt="Lead Scraper: One-click real-estate lead capture, right in Chrome." width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-public-1e293b?style=for-the-badge" alt="Public">
  <img src="https://img.shields.io/badge/license-MIT-1e293b?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/github/last-commit/F0rger123/lead-scraper-extension?style=for-the-badge&color=1e293b" alt="Last commit">
  <img src="https://img.shields.io/github/repo-size/F0rger123/lead-scraper-extension?style=for-the-badge&color=1e293b" alt="Repo size">
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Chrome%20MV3-0d1117?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome MV3">
  <img src="https://img.shields.io/badge/JavaScript-0d1117?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/HTML5-0d1117?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-0d1117?style=flat-square&logo=css&logoColor=white" alt="CSS3">
</p>

<h3 align="center">A floating “Add Lead” button on PropWire, Zillow, Homes.com and Trulia listings. One click captures the property and opens a skip trace.</h3>

<p align="center">
  <a href="#step-1--browse-click-captured">Step 1 · Browse, click, captured</a> ·
  <a href="#step-2--whats-in-the-extension">Step 2 · What's in the extension</a> ·
  <a href="#step-3--built-with">Step 3 · Built with</a> ·
  <a href="#step-4--field-manual">Step 4 · Field manual</a> ·
  <a href="#supported-sites">Supported Sites</a> ·
  <a href="#features">Features</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#how-to-use">How to Use</a> ·
  <a href="#export-to-google-sheets">Export to Google Sheets</a> ·
  <a href="#coming-soon">Coming Soon</a> ·
  <a href="#step-4--field-manual">Step 4 · Field manual</a> ·
  <a href="#license">License</a>
</p>

> [!TIP]
> **🤖 Pasted this link into Claude or ChatGPT?** AI assistants: read [`AGENTS.md`](https://raw.githubusercontent.com/F0rger123/lead-scraper-extension/main/AGENTS.md) first. It explains what this is in plain words, which questions to ask, and how to set it up step by step. Plain-text index: [`llms.txt`](https://raw.githubusercontent.com/F0rger123/lead-scraper-extension/main/llms.txt).


<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

## Step 1 · Browse, click, captured

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#1e293b','primaryTextColor':'#e2e8f0','primaryBorderColor':'#3b82f6','lineColor':'#94a3b8','secondaryColor':'#0f172a','tertiaryColor':'#334155','clusterBkg':'transparent','clusterBorder':'#3b82f6','noteBkgColor':'#0f172a','noteTextColor':'#e2e8f0','actorBkg':'#1e293b','actorTextColor':'#e2e8f0','actorBorder':'#3b82f6','signalColor':'#94a3b8','signalTextColor':'#94a3b8','labelBoxBkgColor':'#1e293b','fontFamily':'inherit'}}}%%
flowchart LR
    A["Open a house listing"] --> B["Click + Add Lead"]
    B --> C["Address, owner and price<br/>are copied for you"]
    C --> D["Lookup page opens<br/>to find a phone number"]
    C --> E["Lead saved in the extension"]
    E --> F["Export everything<br/>to a spreadsheet"]
```

## Step 2 · What's in the extension

<img align="right" width="260" src=".github/assets/screens/popup.jpg" alt="The Lead Scraper popup: pending and today counts, push to Google Sheet, export CSV">

| File | Role |
|---|---|
| `manifest.json` | Manifest V3, host permissions for the four listing sites |
| `content.js` | Page parsing and the floating button |
| `background.js` | Storage, badge and tab handling |
| `popup.html` · `popup.js` · `styles.css` | Pending leads, CSV export, clear all |

> Use it within each website's terms of service and applicable privacy laws.

<br clear="right">

## Step 3 · Built with

```mermaid
%%{init: {'theme':'base','themeVariables':{'pie1':'#3b82f6','pie2':'#22c55e','pie3':'#64748b','pie4':'#94a3b8','pie5':'#475569','pie6':'#cbd5e1','pie7':'#334155','pieStrokeColor':'#0d1117','pieOuterStrokeColor':'#0d1117','pieTitleTextColor':'#8b949e','pieLegendTextColor':'#8b949e','pieSectionTextColor':'#0d1117'}}}%%
pie title Share of the code, by language
    "JavaScript" : 83.1
    "HTML" : 14.0
    "CSS" : 2.9
```

<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

## Step 4 · Field manual

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

## License

Released under the [MIT License](LICENSE). Use it, fork it, ship it.

<p align="center"><img src=".github/assets/divider.svg" width="100%" alt=""></p>

<p align="center">
  <sub>Built by <a href="https://github.com/F0rger123"><b>@F0rger123</b></a> · MIT licensed</sub>
</p>
