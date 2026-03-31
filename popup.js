// Lead Scraper v2 - Jarvis Chrome Extension
// Popup: Google Sheets config, lead management, push to sheet

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await updateStats();

  document.getElementById('pushSheetBtn').addEventListener('click', pushToSheet);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('viewLeadsBtn').addEventListener('click', toggleLeadList);
  document.getElementById('clearBtn').addEventListener('click', clearLeads);
  document.getElementById('saveBtn').addEventListener('click', saveConfig);
  document.getElementById('testBtn').addEventListener('click', testConnection);
  document.getElementById('getTokenLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://developers.google.com/oauthplayground/' });
  });
});

async function loadConfig() {
  const config = await getStorage(['sheetId', 'accessToken', 'sheetName']);
  if (config.sheetId) document.getElementById('sheetId').value = config.sheetId;
  if (config.accessToken) document.getElementById('accessToken').value = config.accessToken;
  if (config.sheetName) document.getElementById('sheetName').value = config.sheetName;
  updateSheetStatus(config.accessToken ? true : false);
}

async function saveConfig() {
  const sheetId = document.getElementById('sheetId').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();
  const sheetName = document.getElementById('sheetName').value.trim() || 'Leads';
  
  await chrome.storage.local.set({ sheetId, accessToken, sheetName });
  updateSheetStatus(accessToken ? true : false);
  showToast('✅ Settings saved!', 'success');
}

async function testConnection() {
  const sheetId = document.getElementById('sheetId').value.trim();
  const token = document.getElementById('accessToken').value.trim();
  
  if (!sheetId || !token) {
    showToast('❌ Enter Sheet ID and Access Token first', 'error');
    return;
  }

  showToast('⏳ Testing connection...', 'info');

  chrome.runtime.sendMessage({ action: 'testSheet', sheetId, token }, (result) => {
    if (result.success) {
      showToast(`✅ Connected to: ${result.title}`, 'success');
      updateSheetStatus(true);
    } else {
      showToast(`❌ Failed: ${result.error}`, 'error');
      updateSheetStatus(false);
    }
  });
}

async function pushToSheet() {
  const leads = await getLeads();
  if (leads.length === 0) {
    showToast('❌ No leads to push', 'error');
    return;
  }

  const config = await getStorage(['sheetId', 'accessToken']);
  if (!config.sheetId || !config.accessToken) {
    showToast('❌ Configure Google Sheet first (below)', 'error');
    return;
  }

  showToast(`⏳ Pushing ${leads.length} leads...`, 'info');

  chrome.runtime.sendMessage({ action: 'pushAllToSheet' }, (result) => {
    if (result.success) {
      showToast(`✅ Pushed ${result.pushed} leads to Google Sheet!`, 'success');
      updateStats();
    } else {
      showToast(`❌ Push failed: ${result.error}`, 'error');
    }
  });
}

async function exportCSV() {
  chrome.runtime.sendMessage({ action: 'exportCSV' }, (result) => {
    if (!result || result.count === 0) {
      showToast('❌ No leads to export', 'error');
      return;
    }

    const blob = new Blob([result.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ Exported ${result.count} leads`, 'success');
  });
}

async function toggleLeadList() {
  const section = document.getElementById('leadListSection');
  const btn = document.getElementById('viewLeadsBtn');

  if (section.classList.contains('hidden')) {
    const leads = await getLeads();
    const list = document.getElementById('leadList');
    
    if (leads.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:16px;color:#64748b;">No pending leads</div>';
    } else {
      list.innerHTML = leads.map((l, i) => {
        const parsed = l.parsedAddress || {};
        return `
          <div class="lead-item">
            <div class="lead-addr">${parsed.street || l.address || 'Unknown'}</div>
            <div class="lead-meta">${l.source || '?'} · ${l.price || 'No price'} · ${parsed.city || ''} ${parsed.state || ''}</div>
          </div>
        `;
      }).join('');
    }
    
    section.classList.remove('hidden');
    btn.textContent = '📋 Hide Leads';
  } else {
    section.classList.add('hidden');
    btn.textContent = '📋 View Pending Leads';
  }
}

async function clearLeads() {
  if (confirm('Clear all pending leads?')) {
    chrome.runtime.sendMessage({ action: 'clearLeads' });
    await updateStats();
    showToast('🗑️ Leads cleared', 'info');
  }
}

async function updateStats() {
  const leads = await getLeads();
  document.getElementById('leadCount').textContent = leads.length;

  const today = new Date().toLocaleDateString();
  const todayLeads = leads.filter(l => {
    const d = l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : '';
    return d === today;
  });
  document.getElementById('todayCount').textContent = todayLeads.length;
}

function updateSheetStatus(connected) {
  const el = document.getElementById('sheetStatus');
  el.textContent = connected ? '✅' : '—';
  el.style.color = connected ? '#22c55e' : '#64748b';
}

function showToast(message, type) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function getLeads() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingLeads'], (r) => resolve(r.pendingLeads || []));
  });
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}
