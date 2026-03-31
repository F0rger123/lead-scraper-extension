// Lead Scraper v2.1 - Jarvis Chrome Extension
// Background: Google Sheets push + auto token refresh

const SHEET_ID = '1GjB4P5SKiMoZDrlkuOvgetpynYhE0yTPFm-R56NLZhg';
const SHEET_NAME = 'Leads';

// OAuth config for auto-refresh (loaded from storage)
const OAUTH_CONFIG = {
  clientId: '',
  clientSecret: '',
  tokenUrl: 'https://oauth2.googleapis.com/token'
};

// Load OAuth config from storage on startup
chrome.storage.local.get(['oauthClientId', 'oauthClientSecret'], (result) => {
  if (result.oauthClientId) OAUTH_CONFIG.clientId = result.oauthClientId;
  if (result.oauthClientSecret) OAUTH_CONFIG.clientSecret = result.oauthClientSecret;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addLead') {
    handleAddLead(message.data).then(sendResponse);
    return true;
  }
  if (message.action === 'getLeads') {
    getPendingLeads().then(sendResponse);
    return true;
  }
  if (message.action === 'clearLeads') {
    chrome.storage.local.set({ pendingLeads: [] });
    sendResponse({ success: true });
  }
  if (message.action === 'pushAllToSheet') {
    pushAllToSheet().then(sendResponse);
    return true;
  }
  if (message.action === 'exportCSV') {
    exportToCSV().then(sendResponse);
    return true;
  }
  if (message.action === 'testSheet') {
    testSheetConnection(message.sheetId, message.token).then(sendResponse);
    return true;
  }
  if (message.action === 'saveRefreshToken') {
    chrome.storage.local.set({ refreshToken: message.token });
    sendResponse({ success: true });
  }
});

// ===== TOKEN MANAGEMENT =====

async function getAccessToken() {
  // First check for stored access token
  const stored = await getStorage(['accessToken', 'refreshToken', 'tokenExpiry']);
  
  // If we have a valid access token (not expired), use it
  if (stored.accessToken && stored.tokenExpiry && Date.now() < stored.tokenExpiry) {
    return stored.accessToken;
  }
  
  // If we have a refresh token, use it to get a new access token
  if (stored.refreshToken) {
    try {
      const resp = await fetch(OAUTH_CONFIG.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: OAUTH_CONFIG.clientId,
          client_secret: OAUTH_CONFIG.clientSecret,
          refresh_token: stored.refreshToken,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await resp.json();
      
      if (data.access_token) {
        // Store new token with expiry
        await chrome.storage.local.set({
          accessToken: data.access_token,
          tokenExpiry: Date.now() + (data.expires_in * 1000) - 60000 // 1 min buffer
        });
        return data.access_token;
      }
    } catch (err) {
      console.error('Token refresh failed:', err);
    }
  }
  
  // Fall back to manually entered access token
  return stored.accessToken || '';
}

// ===== LEAD HANDLING =====

async function handleAddLead(data) {
  const leads = (await getPendingLeads()) || [];
  leads.push(data);
  await chrome.storage.local.set({ pendingLeads: leads });
  
  // Auto-push to sheet if configured
  const token = await getAccessToken();
  if (token) {
    const result = await pushLeadToSheet(data, token);
    return { success: true, totalLeads: leads.length, sheetPush: result };
  }
  
  return { success: true, totalLeads: leads.length };
}

async function getPendingLeads() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingLeads'], (result) => resolve(result.pendingLeads || []));
  });
}

// ===== GOOGLE SHEETS =====

async function pushLeadToSheet(lead, token) {
  token = token || await getAccessToken();
  if (!token) return { success: false, error: 'No access token' };

  const parsed = lead.parsedAddress || parseAddress(lead.address || '');
  
  const row = [
    lead.owner || '',                    // A: Name
    lead.address || '',                   // B: Address
    lead.phone || '',                     // C: Phone
    lead.leadType || lead.source || '',   // D: Lead Type
    lead.status || "Haven't Contacted",  // E: Status
    lead.url || '',                       // F: Link
    lead.price || '',                     // G: Listing Price
    lead.value || '',                     // H: Value
    lead.notes || '',                     // I: Notes
    new Date().toLocaleDateString(),      // J: Date Added
    '',                                   // K: Last Contact
    '',                                   // L: Follow Up Date
    parsed.street || '',                  // M: Street
    parsed.city || '',                    // N: City
    parsed.state || '',                   // O: State
    parsed.zip || ''                      // P: Zip
  ];

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });

    const result = await response.json();
    
    if (response.ok) {
      return { success: true, updatedRange: result.updates?.updatedRange };
    } else {
      // If auth failed, try refreshing token once
      if (response.status === 401) {
        const newToken = await getAccessToken();
        if (newToken && newToken !== token) {
          return pushLeadToSheet(lead, newToken);
        }
      }
      return { success: false, error: result.error?.message || 'Unknown error' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function pushAllToSheet() {
  const leads = await getPendingLeads();
  if (!leads || leads.length === 0) return { success: false, error: 'No leads' };

  const token = await getAccessToken();
  if (!token) return { success: false, error: 'No access token - configure in extension popup' };

  const rows = leads.map(lead => {
    const parsed = lead.parsedAddress || parseAddress(lead.address || '');
    return [
      lead.owner || '', lead.address || '', lead.phone || '',
      lead.leadType || lead.source || '', lead.status || "Haven't Contacted",
      lead.url || '', lead.price || '', lead.value || '', lead.notes || '',
      lead.extractedAt ? new Date(lead.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      '', '', parsed.street || '', parsed.city || '', parsed.state || '', parsed.zip || ''
    ];
  });

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });

    const result = await response.json();
    
    if (response.ok) {
      await chrome.storage.local.set({ pendingLeads: [] });
      return { success: true, pushed: rows.length };
    } else {
      return { success: false, error: result.error?.message };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testSheetConnection(sheetId, token) {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (response.ok) {
      return { success: true, title: result.properties?.title, sheets: result.sheets?.map(s => s.properties?.title) };
    } else {
      return { success: false, error: result.error?.message };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ===== HELPERS =====

function parseAddress(fullAddr) {
  if (!fullAddr) return { street: '', city: '', state: '', zip: '' };
  
  let cleaned = fullAddr.replace(/\s+/g, ' ').trim();
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
    const remainder = parts[1].split(/\s+/);
    const lastWord = remainder[remainder.length - 1] || '';
    if (/^\d{5}(-\d{4})?$/.test(lastWord)) {
      zip = lastWord;
      const secondLast = remainder[remainder.length - 2] || '';
      if (/^[A-Z]{2}$/i.test(secondLast)) {
        state = secondLast.toUpperCase();
        city = remainder.slice(0, -2).join(' ');
      } else {
        city = remainder.slice(0, -1).join(' ');
      }
    } else if (/^[A-Z]{2}$/i.test(lastWord)) {
      state = lastWord.toUpperCase();
      city = remainder.slice(0, -1).join(' ');
    } else {
      city = parts[1];
    }
  } else {
    const words = cleaned.split(/\s+/);
    let stateIdx = -1;
    for (let i = 0; i < words.length; i++) {
      if (/^[A-Z]{2}$/i.test(words[i]) && i > 0) { stateIdx = i; break; }
    }
    if (stateIdx > 0) {
      state = words[stateIdx].toUpperCase();
      if (/^\d{5}(-\d{4})?$/.test(words[stateIdx + 1] || '')) zip = words[stateIdx + 1];
      const beforeState = words.slice(0, stateIdx);
      if (beforeState.length >= 2) {
        city = beforeState[beforeState.length - 1];
        street = beforeState.slice(0, -1).join(' ');
      } else {
        street = beforeState.join(' ');
      }
    } else {
      const knownCities = ['york','hanover','lancaster','harrisburg','dover','red lion','dillsburg','wrightsville','spring grove','thomasville','glen rock','seven valleys','new freedom','lewisberry','etters','dallastown','carlisle','lansdale'];
      const lastWordLower = (words[words.length - 1] || '').toLowerCase();
      if (knownCities.includes(lastWordLower)) {
        city = words[words.length - 1];
        street = words.slice(0, -1).join(' ');
      } else {
        street = cleaned;
      }
    }
  }
  
  return { street, city, state, zip, cityState: [city, state].filter(Boolean).join(', ') };
}

async function exportToCSV() {
  const leads = await getPendingLeads();
  if (!leads || leads.length === 0) return { csv: '', count: 0 };

  const headers = ['Name','Address','Phone','Lead Type','Status','Link','Listing Price','Value','Notes','Date Added','Street','City','State','Zip'];
  const rows = leads.map(l => {
    const p = l.parsedAddress || parseAddress(l.address || '');
    return [l.owner||'', l.address||'', l.phone||'', l.leadType||l.source||'', l.status||"Haven't Contacted", l.url||'', l.price||'', l.value||'', l.notes||'', l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(), p.street, p.city, p.state, p.zip];
  });

  const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  return { csv, count: leads.length };
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

// Badge
async function updateBadge() {
  const leads = await getPendingLeads();
  chrome.action.setBadgeText({ text: leads?.length > 0 ? leads.length.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
}
chrome.storage.onChanged.addListener(updateBadge);
updateBadge();
