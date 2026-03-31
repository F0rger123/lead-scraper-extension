// Lead Scraper - Jarvis Chrome Extension
// Content script: detects property pages and extracts lead data

(function() {
  'use strict';

  // Detect which site we're on
  const site = detectSite();
  if (!site) return;

  // Inject floating "Add Lead" button
  injectButton();

  // Auto-extract data when button is clicked
  function extractData() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('propwire.com')) return extractPropwire();
    if (hostname.includes('zillow.com')) return extractZillow();
    if (hostname.includes('homes.com')) return extractHomes();
    if (hostname.includes('trulia.com')) return extractTrulia();
    return null;
  }

  function detectSite() {
    const h = window.location.hostname;
    if (h.includes('propwire.com')) return 'propwire';
    if (h.includes('zillow.com')) return 'zillow';
    if (h.includes('homes.com')) return 'homes';
    if (h.includes('trulia.com')) return 'trulia';
    return null;
  }

  // ===== SITE EXTRACTORS =====

  function extractPropwire() {
    const data = {
      source: 'PropWire',
      url: window.location.href,
      address: '',
      owner: '',
      phone: '',
      price: '',
      value: '',
      status: '',
      notes: '',
      leadType: 'PropWire'
    };

    // Try to get address
    const addrEl = document.querySelector('h1, .property-address, [class*="address"], [data-field="address"]');
    if (addrEl) data.address = addrEl.textContent.trim();

    // Try to get owner
    const ownerEl = document.querySelector('[class*="owner"], [data-field="owner"], .owner-name');
    if (ownerEl) data.owner = ownerEl.textContent.trim();

    // Try to get price
    const priceEl = document.querySelector('[class*="price"], [data-field="price"], .listing-price');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');

    // Try to get status
    const statusEl = document.querySelector('[class*="status"], [data-field="status"], .property-status');
    if (statusEl) data.status = statusEl.textContent.trim();

    // Get all text content for fallback parsing
    const allText = document.body.innerText;
    
    // If address not found, try to parse from page
    if (!data.address) {
      const titleMatch = allText.match(/(\d+\s+[A-Za-z\s]+(?:St|Ave|Rd|Dr|Ln|Blvd|Ct|Way|Pl|Cir|Hwy)[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/i);
      if (titleMatch) data.address = titleMatch[1].trim();
    }

    return data;
  }

  function extractZillow() {
    const data = {
      source: 'Zillow',
      url: window.location.href,
      address: '',
      owner: '',
      phone: '',
      price: '',
      value: '',
      status: '',
      notes: '',
      leadType: 'FSBO'
    };

    // Address
    const addrEl = document.querySelector('h1[data-testid="bdp-building-title"], h1.AddressContainer, .ds-address-container h1, [class*="StyledAddress"]');
    if (addrEl) {
      data.address = addrEl.textContent.trim();
    } else {
      // Fallback: try the page title
      const title = document.title;
      const titleMatch = title.match(/^(.+?)(?:\s*[-|]\s*Zillow)/);
      if (titleMatch) data.address = titleMatch[1].trim();
    }

    // Price
    const priceEl = document.querySelector('[data-testid="price"], .ds-price, .notranslate');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');

    // FSBO detection
    const fsboEl = document.querySelector('[class*="fsbo"], [class*="by-owner"]');
    if (fsboEl || window.location.href.includes('/by_owner/')) {
      data.leadType = 'FSBO';
    }

    // Status / days on market
    const domEl = document.querySelector('[data-testid="days-on-zillow"]');
    if (domEl) data.notes = domEl.textContent.trim();

    // Owner info from Zillow (sometimes visible)
    const ownerEl = document.querySelector('[class*="owner"], [data-testid="owner"]');
    if (ownerEl) data.owner = ownerEl.textContent.trim();

    return data;
  }

  function extractHomes() {
    const data = {
      source: 'Homes.com',
      url: window.location.href,
      address: '',
      owner: '',
      phone: '',
      price: '',
      value: '',
      status: '',
      notes: '',
      leadType: 'Homes.com'
    };

    // Address
    const addrEl = document.querySelector('h1, .property-address, [class*="Address"]');
    if (addrEl) data.address = addrEl.textContent.trim();

    // Price
    const priceEl = document.querySelector('[class*="price"], .listing-price, [data-testid="price"]');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');

    // Value estimate
    const valueEl = document.querySelector('[class*="estimate"], [class*="zestimate"], [class*="value"]');
    if (valueEl) data.value = valueEl.textContent.trim();

    // Status
    const statusEl = document.querySelector('[class*="status"], .property-status');
    if (statusEl) data.status = statusEl.textContent.trim();

    return data;
  }

  function extractTrulia() {
    const data = {
      source: 'Trulia',
      url: window.location.href,
      address: '',
      owner: '',
      phone: '',
      price: '',
      value: '',
      status: '',
      notes: '',
      leadType: 'FSBO'
    };

    // Address
    const addrEl = document.querySelector('h1[data-testid="home-details-summary-headline"], h1');
    if (addrEl) data.address = addrEl.textContent.trim();

    // Price
    const priceEl = document.querySelector('[data-testid="home-details-sm-lg-price"], [data-testid="price"]');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');

    return data;
  }

  // ===== SKIP TRACE via CyberBackgroundCheck =====

  function skipTrace(address) {
    const encodedAddr = encodeURIComponent(address);
    const url = `https://www.cyberbackgroundchecks.com/address/${encodedAddr.replace(/%20/g, '-').replace(/%2C/g, '').toLowerCase()}`;
    return url;
  }

  // ===== INJECT FLOATING BUTTON =====

  function injectButton() {
    // Create floating button
    const btn = document.createElement('div');
    btn.id = 'jarvis-lead-btn';
    btn.innerHTML = '🏠 + Add Lead';
    btn.title = 'Add this property as a lead (Jarvis)';
    document.body.appendChild(btn);

    // Create status toast
    const toast = document.createElement('div');
    toast.id = 'jarvis-toast';
    toast.style.display = 'none';
    document.body.appendChild(toast);

    btn.addEventListener('click', async () => {
      const data = extractData();
      if (!data || !data.address) {
        showToast('❌ Could not extract property data', 'error');
        return;
      }

      showToast('⏳ Extracting lead data...', 'info');

      // Open CyberBackgroundCheck in new tab for skip tracing
      const skipUrl = skipTrace(data.address);
      window.open(skipUrl, '_blank');

      // Store lead data
      const leads = (await chromeStorageGet('pendingLeads')) || [];
      data.extractedAt = new Date().toISOString();
      data.skipTraceUrl = skipUrl;
      leads.push(data);
      await chromeStorageSet('pendingLeads', leads);

      // Also send to background for Sheets push
      chrome.runtime.sendMessage({ action: 'addLead', data: data });

      showToast(`✅ Lead added: ${data.address}`, 'success');
      btn.innerHTML = '✅ Added!';
      btn.style.background = '#22c55e';
      setTimeout(() => {
        btn.innerHTML = '🏠 + Add Lead';
        btn.style.background = '#3b82f6';
      }, 3000);
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('jarvis-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `jarvis-toast jarvis-toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // ===== STORAGE HELPERS =====

  function chromeStorageGet(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }

  function chromeStorageSet(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }
})();
