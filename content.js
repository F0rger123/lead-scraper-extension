// Lead Scraper - Jarvis Chrome Extension v2
// Content script: detects property pages, extracts data, injects UI

(function() {
  'use strict';

  const site = detectSite();
  if (!site) return;

  injectButton();

  function detectSite() {
    const h = window.location.hostname;
    if (h.includes('propwire.com')) return 'propwire';
    if (h.includes('zillow.com')) return 'zillow';
    if (h.includes('homes.com')) return 'homes';
    if (h.includes('trulia.com')) return 'trulia';
    if (h.includes('cyberbackgroundchecks.com')) return 'cyber';
    return null;
  }

  // Auto-fill CyberBackgroundCheck if we're on that page
  if (site === 'cyber') {
    chrome.storage.local.get(['pendingSkipTrace'], (result) => {
      if (result.pendingSkipTrace) {
        autoFillSkipTrace(result.pendingSkipTrace);
      }
    });
  }

  function autoFillSkipTrace(data) {
    // Wait for page to load
    setTimeout(() => {
      const streetField = document.querySelector('input[name="StreetAddress"], input[id*="street"], input[placeholder*="Street"], #StreetAddress, input[name="address"]');
      const cityField = document.querySelector('input[name="City"], input[id*="city"], input[placeholder*="City"], #City');
      const stateField = document.querySelector('input[name="State"], input[id*="state"], input[placeholder*="State"], #State, select[name="State"]');
      const zipField = document.querySelector('input[name="ZipCode"], input[id*="zip"], input[placeholder*="Zip"], #ZipCode');

      if (streetField) {
        streetField.value = data.street || '';
        streetField.dispatchEvent(new Event('input', { bubbles: true }));
        streetField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (cityField) {
        cityField.value = data.city || '';
        cityField.dispatchEvent(new Event('input', { bubbles: true }));
        cityField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (stateField) {
        if (stateField.tagName === 'SELECT') {
          // Find the option
          const options = stateField.querySelectorAll('option');
          options.forEach(opt => {
            if (opt.value === data.state || opt.textContent.trim().toUpperCase() === (data.state || '').toUpperCase()) {
              stateField.value = opt.value;
            }
          });
        } else {
          stateField.value = data.state || '';
        }
        stateField.dispatchEvent(new Event('input', { bubbles: true }));
        stateField.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (zipField && data.zip) {
        zipField.value = data.zip || '';
        zipField.dispatchEvent(new Event('input', { bubbles: true }));
        zipField.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Show toast
      showCyberToast('✅ Address auto-filled by Jarvis Lead Scraper');

      // Clear pending
      chrome.storage.local.remove(['pendingSkipTrace']);
    }, 2000);
  }

  function showCyberToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#14532d;color:#86efac;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);border:1px solid #22c55e;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  // ===== EXTRACTORS =====

  function extractData() {
    const hostname = window.location.hostname;
    if (hostname.includes('propwire.com')) return extractPropwire();
    if (hostname.includes('zillow.com')) return extractZillow();
    if (hostname.includes('homes.com')) return extractHomes();
    if (hostname.includes('trulia.com')) return extractTrulia();
    return null;
  }

  function parseAddress(fullAddr) {
    if (!fullAddr) return { street: '', city: '', state: '', zip: '', full: '' };
    
    // Clean up
    const cleaned = fullAddr.replace(/\s+/g, ' ').trim();
    
    // Try to parse: "123 Main St, York, PA 17401"
    const parts = cleaned.split(',').map(p => p.trim());
    
    let street = '', city = '', state = '', zip = '';
    
    if (parts.length >= 3) {
      street = parts[0];
      city = parts[1];
      const stateZip = parts[2].split(/\s+/);
      state = stateZip[0] || '';
      zip = stateZip[1] || '';
    } else if (parts.length === 2) {
      street = parts[0];
      const cityStateZip = parts[1].split(/\s+/);
      if (cityStateZip.length >= 3) {
        city = cityStateZip.slice(0, -2).join(' ');
        state = cityStateZip[cityStateZip.length - 2];
        zip = cityStateZip[cityStateZip.length - 1];
      } else {
        city = parts[1];
      }
    } else {
      street = cleaned;
    }
    
    return { street, city, state, zip, full: cleaned };
  }

  function extractPropwire() {
    const data = { source: 'PropWire', url: window.location.href, address: '', owner: '', phone: '', price: '', value: '', status: '', notes: '', leadType: 'PropWire' };
    const addrEl = document.querySelector('h1, .property-address, [class*="address"], [data-field="address"]');
    if (addrEl) data.address = addrEl.textContent.trim();
    const ownerEl = document.querySelector('[class*="owner"], [data-field="owner"], .owner-name');
    if (ownerEl) data.owner = ownerEl.textContent.trim();
    const priceEl = document.querySelector('[class*="price"], [data-field="price"], .listing-price');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');
    return data;
  }

  function extractZillow() {
    const data = { source: 'Zillow', url: window.location.href, address: '', owner: '', phone: '', price: '', value: '', status: '', notes: '', leadType: 'FSBO' };
    const addrEl = document.querySelector('h1[data-testid="bdp-building-title"], h1.AddressContainer, .ds-address-container h1, [class*="StyledAddress"]');
    if (addrEl) {
      data.address = addrEl.textContent.trim();
    } else {
      const title = document.title;
      const titleMatch = title.match(/^(.+?)(?:\s*[-|]\s*Zillow)/);
      if (titleMatch) data.address = titleMatch[1].trim();
    }
    const priceEl = document.querySelector('[data-testid="price"], .ds-price, .notranslate');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');
    if (window.location.href.includes('/by_owner/')) data.leadType = 'FSBO';
    const domEl = document.querySelector('[data-testid="days-on-zillow"]');
    if (domEl) data.notes = domEl.textContent.trim();
    return data;
  }

  function extractHomes() {
    const data = { source: 'Homes.com', url: window.location.href, address: '', owner: '', phone: '', price: '', value: '', status: '', notes: '', leadType: 'Homes.com' };
    const addrEl = document.querySelector('h1, .property-address, [class*="Address"]');
    if (addrEl) data.address = addrEl.textContent.trim();
    const priceEl = document.querySelector('[class*="price"], .listing-price, [data-testid="price"]');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');
    const statusEl = document.querySelector('[class*="status"], .property-status');
    if (statusEl) data.status = statusEl.textContent.trim();
    return data;
  }

  function extractTrulia() {
    const data = { source: 'Trulia', url: window.location.href, address: '', owner: '', phone: '', price: '', value: '', status: '', notes: '', leadType: 'FSBO' };
    const addrEl = document.querySelector('h1[data-testid="home-details-summary-headline"], h1');
    if (addrEl) data.address = addrEl.textContent.trim();
    const priceEl = document.querySelector('[data-testid="home-details-sm-lg-price"], [data-testid="price"]');
    if (priceEl) data.price = priceEl.textContent.trim().replace(/[^0-9.,]/g, '');
    return data;
  }

  // ===== INJECT UI =====

  function injectButton() {
    const btn = document.createElement('div');
    btn.id = 'jarvis-lead-btn';
    btn.innerHTML = '🏠 + Add Lead';
    btn.title = 'Add as lead + auto skip trace (Jarvis)';
    document.body.appendChild(btn);

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

      // Parse address for skip trace
      const parsed = parseAddress(data.address);
      data.parsedAddress = parsed;

      // Store for CyberBackgroundCheck auto-fill
      const skipData = {
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip
      };

      // Build CyberBackgroundCheck URL
      const cyberUrl = `https://www.cyberbackgroundchecks.com/address`;

      // Store pending skip trace for auto-fill
      chrome.storage.local.set({ pendingSkipTrace: skipData });

      // Open CyberBackgroundCheck
      window.open(cyberUrl, '_blank');

      // Save lead
      data.extractedAt = new Date().toISOString();
      data.skipTraceUrl = cyberUrl;
      data.parsed = parsed;
      const leads = (await getStoredLeads()) || [];
      leads.push(data);
      chrome.storage.local.set({ pendingLeads: leads });

      // Send to background for Sheets push
      chrome.runtime.sendMessage({ action: 'addLead', data: data });

      showToast(`✅ Lead added: ${parsed.street}, ${parsed.city} ${parsed.state}`, 'success');
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

  function getStoredLeads() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pendingLeads'], (result) => resolve(result.pendingLeads));
    });
  }
})();
