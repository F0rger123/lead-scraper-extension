// Lead Scraper v2.1 - Jarvis Chrome Extension
// Content script: property extraction + CyberBackgroundCheck auto-fill

(function() {
  'use strict';

  const site = detectSite();
  if (!site) return;

  // If on CyberBackgroundCheck, auto-fill and search
  if (site === 'cyber') {
    chrome.storage.local.get(['pendingSkipTrace'], (result) => {
      if (result.pendingSkipTrace) {
        autoFillSkipTrace(result.pendingSkipTrace);
      }
    });
    return;
  }

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

  // ===== CYBERBACKGROUNDCHECK AUTO-FILL =====

  function autoFillSkipTrace(data) {
    // Wait for page to fully load
    const maxAttempts = 10;
    let attempts = 0;

    const tryFill = () => {
      attempts++;
      
      // Find the input fields - try multiple selectors
      const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
      let streetField = null;
      let cityStateField = null;
      let zipField = null;

      // Try by name/id first
      streetField = document.querySelector('#StreetAddress, input[name="StreetAddress"], input[placeholder*="Street"], input[name="street"]');
      cityStateField = document.querySelector('#CityState, input[name="CityState"], input[placeholder*="City"], input[name="city_state"], input[placeholder*="State"]');
      zipField = document.querySelector('#ZipCode, input[name="ZipCode"], input[placeholder*="Zip"], input[name="zip"]');

      // Fallback: find by position/order if there are multiple text inputs
      if (!streetField && allInputs.length >= 2) {
        streetField = allInputs[0];
        cityStateField = allInputs[1];
        if (allInputs.length >= 3) zipField = allInputs[2];
      }

      if (!streetField && attempts < maxAttempts) {
        setTimeout(tryFill, 1000);
        return;
      }

      // Fill street address
      if (streetField) {
        setFieldValue(streetField, data.street || '');
      }

      // Fill city & state combined
      if (cityStateField) {
        const cityState = [data.city, data.state].filter(Boolean).join(', ');
        setFieldValue(cityStateField, cityState);
      }

      // Fill zip
      if (zipField && data.zip) {
        setFieldValue(zipField, data.zip);
      }

      // Show success toast
      showCyberToast(`✅ Auto-filled: ${data.street}, ${data.city}, ${data.state} ${data.zip || ''}`);

      // Click search button after a short delay
      setTimeout(() => {
        const searchBtn = document.querySelector('button[type="submit"], input[type="submit"], .search-button, button.btn-primary, button.search, a.search-button');
        // Try finding any button that says "search" or "find"
        if (!searchBtn) {
          const allBtns = document.querySelectorAll('button, input[type="submit"], a.btn');
          for (const btn of allBtns) {
            const text = (btn.textContent || btn.value || '').toLowerCase();
            if (text.includes('search') || text.includes('find') || text.includes('lookup')) {
              btn.click();
              showCyberToast('🔍 Searching...');
              break;
            }
          }
        } else {
          searchBtn.click();
          showCyberToast('🔍 Searching...');
        }
      }, 500);

      // Clear pending data
      chrome.storage.local.remove(['pendingSkipTrace']);
    };

    // Start trying after page loads
    setTimeout(tryFill, 1500);
  }

  function setFieldValue(field, value) {
    if (!field || !value) return;
    
    // Focus the field
    field.focus();
    field.dispatchEvent(new Event('focus', { bubbles: true }));
    
    // Clear existing value
    field.value = '';
    
    // Set new value using native input setter (bypasses React/Vue)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(field, value);
    
    // Trigger all events
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    
    // Blur
    field.blur();
  }

  function showCyberToast(msg) {
    // Remove existing toast
    const existing = document.getElementById('jarvis-cyber-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'jarvis-cyber-toast';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;background:#14532d;color:#86efac;padding:14px 22px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.4);border:1px solid #22c55e;font-family:-apple-system,sans-serif;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  // ===== ADDRESS PARSER =====

  function parseAddress(fullAddr) {
    if (!fullAddr) return { street: '', city: '', state: '', zip: '', cityState: '' };
    
    let cleaned = fullAddr.replace(/\s+/g, ' ').trim();
    
    // Try comma-separated parsing first
    const parts = cleaned.split(',').map(p => p.trim());
    
    let street = '', city = '', state = '', zip = '';
    
    if (parts.length >= 3) {
      // "123 Main St, York, PA 17401"
      street = parts[0];
      city = parts[1];
      const stateZip = parts[2].split(/\s+/);
      state = stateZip[0] || '';
      zip = stateZip[1] || '';
    } else if (parts.length === 2) {
      // "123 Main St, York PA 17401" or "123 Main St, PA"
      street = parts[0];
      const remainder = parts[1].split(/\s+/);
      // Try to detect if last word is a state abbreviation (2 letters)
      const lastWord = remainder[remainder.length - 1] || '';
      const secondLast = remainder[remainder.length - 2] || '';
      
      if (/^\d{5}(-\d{4})?$/.test(lastWord)) {
        // Last word is zip
        zip = lastWord;
        if (/^[A-Z]{2}$/i.test(secondLast)) {
          // Second last is state
          state = secondLast.toUpperCase();
          city = remainder.slice(0, -2).join(' ');
        } else {
          city = remainder.slice(0, -1).join(' ');
        }
      } else if (/^[A-Z]{2}$/i.test(lastWord)) {
        // Last word is state
        state = lastWord.toUpperCase();
        city = remainder.slice(0, -1).join(' ');
      } else {
        city = parts[1];
      }
    } else {
      // Single string: "2245 Sutton Rd York PA 17402"
      // Try to find the state abbreviation
      const words = cleaned.split(/\s+/);
      
      // Look for 2-letter state code
      let stateIdx = -1;
      for (let i = 0; i < words.length; i++) {
        if (/^[A-Z]{2}$/i.test(words[i]) && i > 0) {
          stateIdx = i;
          break;
        }
      }
      
      if (stateIdx > 0) {
        state = words[stateIdx].toUpperCase();
        // Check if next word is zip
        if (/^\d{5}(-\d{4})?$/.test(words[stateIdx + 1] || '')) {
          zip = words[stateIdx + 1];
        }
        // Everything before state is street + city
        const beforeState = words.slice(0, stateIdx);
        // Heuristic: city is usually the last word before state
        if (beforeState.length >= 2) {
          city = beforeState[beforeState.length - 1];
          street = beforeState.slice(0, -1).join(' ');
        } else {
          street = beforeState.join(' ');
        }
      } else {
        // No state found - just use the whole thing as street
        // But check if last word could be a city name
        const knownCities = ['york', 'hanover', 'lancaster', 'harrisburg', 'dover', 'red lion', 'dillsburg', 'wrightsville', 'spring grove', 'thomasville', 'glen rock', 'seven valleys', 'new freedom', 'lewisberry', 'etters', 'dallastown', 'carlisle', 'lansdale'];
        const lastWordLower = (words[words.length - 1] || '').toLowerCase();
        
        if (knownCities.includes(lastWordLower)) {
          city = words[words.length - 1];
          street = words.slice(0, -1).join(' ');
        } else {
          street = cleaned;
        }
      }
    }
    
    const cityState = [city, state].filter(Boolean).join(', ');
    return { street, city, state, zip, cityState, full: cleaned };
  }

  // ===== PROPERTY EXTRACTORS =====

  function extractData() {
    const hostname = window.location.hostname;
    if (hostname.includes('propwire.com')) return extractPropwire();
    if (hostname.includes('zillow.com')) return extractZillow();
    if (hostname.includes('homes.com')) return extractHomes();
    if (hostname.includes('trulia.com')) return extractTrulia();
    return null;
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

  // ===== INJECT FLOATING BUTTON =====

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

      showToast('⏳ Extracting lead + opening skip trace...', 'info');

      // Parse address
      const parsed = parseAddress(data.address);
      data.parsedAddress = parsed;

      // Store for CyberBackgroundCheck auto-fill
      chrome.storage.local.set({ 
        pendingSkipTrace: {
          street: parsed.street,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip
        }
      });

      // Open CyberBackgroundCheck address page
      window.open('https://www.cyberbackgroundchecks.com/address', '_blank');

      // Save lead
      data.extractedAt = new Date().toISOString();
      data.skipTraceUrl = 'https://www.cyberbackgroundchecks.com/address';
      
      const leads = (await getStoredLeads()) || [];
      leads.push(data);
      chrome.storage.local.set({ pendingLeads: leads });

      // Send to background for Sheets push
      chrome.runtime.sendMessage({ action: 'addLead', data: data });

      showToast(`✅ Lead added: ${parsed.street}, ${parsed.cityState}`, 'success');
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
