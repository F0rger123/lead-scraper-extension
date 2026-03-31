// Lead Scraper - Jarvis Chrome Extension v2
// Background service worker: Google Sheets push + skip trace

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
  if (message.action === 'pushToSheet') {
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
  if (message.action === 'pushSingleLead') {
    pushLeadToSheet(message.data).then(sendResponse);
    return true;
  }
});

async function handleAddLead(data) {
  const leads = (await getPendingLeads()) || [];
  leads.push(data);
  await chrome.storage.local.set({ pendingLeads: leads });
  
  // Auto-push to Google Sheet if configured
  const config = await getConfig();
  if (config.sheetId && config.accessToken) {
    const result = await pushLeadToSheet(data);
    return { success: true, totalLeads: leads.length, sheetPush: result };
  }
  
  return { success: true, totalLeads: leads.length };
}

async function getPendingLeads() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingLeads'], (result) => resolve(result.pendingLeads || []));
  });
}

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sheetId', 'accessToken', 'sheetName'], (result) => {
      resolve({
        sheetId: result.sheetId || '1GjB4P5SKiMoZDrlkuOvgetpynYhE0yTPFm-R56NLZhg',
        accessToken: result.accessToken || '',
        sheetName: result.sheetName || 'Leads'
      });
    });
  });
}

// ===== GOOGLE SHEETS INTEGRATION =====

async function pushLeadToSheet(lead) {
  const config = await getConfig();
  if (!config.sheetId || !config.accessToken) {
    return { success: false, error: 'Sheet ID or Access Token not configured' };
  }

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
    parsed.street || '',                  // M: Street (for skip trace)
    parsed.city || '',                    // N: City
    parsed.state || '',                   // O: State
    parsed.zip || ''                      // P: Zip
  ];

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${config.sheetName}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [row] })
    });

    const result = await response.json();
    
    if (response.ok) {
      return { success: true, updatedRange: result.updates?.updatedRange };
    } else {
      return { success: false, error: result.error?.message || 'Unknown error' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function pushAllToSheet() {
  const leads = await getPendingLeads();
  if (!leads || leads.length === 0) return { success: false, error: 'No leads to push' };

  const config = await getConfig();
  if (!config.sheetId || !config.accessToken) {
    return { success: false, error: 'Sheet ID or Access Token not configured' };
  }

  const rows = leads.map(lead => {
    const parsed = lead.parsedAddress || parseAddress(lead.address || '');
    return [
      lead.owner || '',
      lead.address || '',
      lead.phone || '',
      lead.leadType || lead.source || '',
      lead.status || "Haven't Contacted",
      lead.url || '',
      lead.price || '',
      lead.value || '',
      lead.notes || '',
      lead.extractedAt ? new Date(lead.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      '',
      '',
      parsed.street || '',
      parsed.city || '',
      parsed.state || '',
      parsed.zip || ''
    ];
  });

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${config.sheetName}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });

    const result = await response.json();
    
    if (response.ok) {
      // Clear local leads after successful push
      await chrome.storage.local.set({ pendingLeads: [] });
      return { success: true, pushed: rows.length, updatedRange: result.updates?.updatedRange };
    } else {
      return { success: false, error: result.error?.message };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function testSheetConnection(sheetId, token) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
    const response = await fetch(url, {
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
  const cleaned = fullAddr.replace(/\s+/g, ' ').trim();
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
    city = parts[1];
  } else {
    street = cleaned;
  }
  return { street, city, state, zip };
}

async function exportToCSV() {
  const leads = await getPendingLeads();
  if (!leads || leads.length === 0) return { csv: '', count: 0 };

  const headers = ['Name', 'Address', 'Phone', 'Lead Type', 'Status', 'Link', 'Listing Price', 'Value', 'Notes', 'Date Added', 'Street', 'City', 'State', 'Zip'];
  const rows = leads.map(l => {
    const p = l.parsedAddress || parseAddress(l.address || '');
    return [
      l.owner || '', l.address || '', l.phone || '',
      l.leadType || l.source || '', l.status || "Haven't Contacted",
      l.url || '', l.price || '', l.value || '', l.notes || '',
      l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(),
      p.street, p.city, p.state, p.zip
    ];
  });

  const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return { csv, count: leads.length };
}

// Badge
async function updateBadge() {
  const leads = await getPendingLeads();
  chrome.action.setBadgeText({ text: leads?.length > 0 ? leads.length.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
}
chrome.storage.onChanged.addListener(updateBadge);
updateBadge();
