// Lead Scraper v2.1 - Jarvis Chrome Extension
// Popup: auto-refresh Google Sheets auth

const OAUTH_CONFIG = {
  clientId: '', // Set via extension popup
  clientSecret: '', // Set via extension popup
  redirectUri: 'https://developers.google.com/oauthplayground',
  authUrl: 'https://accounts.google.com/o/oauth2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: 'https://www.googleapis.com/auth/spreadsheets'
};

const SHEET_ID = '1GjB4P5SKiMoZDrlkuOvgetpynYhE0yTPFm-R56NLZhg';

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await updateStats();

  document.getElementById('pushSheetBtn').addEventListener('click', pushToSheet);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('viewLeadsBtn').addEventListener('click', toggleLeadList);
  document.getElementById('clearBtn').addEventListener('click', clearLeads);
  document.getElementById('authBtn').addEventListener('click', startAuth);
  document.getElementById('exchangeBtn').addEventListener('click', exchangeCode);
  document.getElementById('saveOAuthBtn').addEventListener('click', saveOAuthConfig);

  // Load OAuth config
  const oauthConfig = await getStorage(['oauthClientId', 'oauthClientSecret', 'refreshToken']);
  if (oauthConfig.oauthClientId) document.getElementById('oauthClientId').value = oauthConfig.oauthClientId;
  if (oauthConfig.oauthClientSecret) document.getElementById('oauthClientSecret').value = oauthConfig.oauthClientSecret;
  if (oauthConfig.refreshToken) document.getElementById('connectionInfo').classList.remove('hidden');
});

async function saveOAuthConfig() {
  const clientId = document.getElementById('oauthClientId').value.trim();
  const clientSecret = document.getElementById('oauthClientSecret').value.trim();
  
  if (!clientId || !clientSecret) {
    showToast('❌ Enter both Client ID and Secret', 'error');
    return;
  }
  
  await chrome.storage.local.set({ oauthClientId: clientId, oauthClientSecret: clientSecret });
  OAUTH_CONFIG.clientId = clientId;
  OAUTH_CONFIG.clientSecret = clientSecret;
  showToast('✅ OAuth config saved!', 'success');
}

async function loadConfig() {
  const config = await getStorage(['refreshToken', 'accessToken']);
  if (config.refreshToken || config.accessToken) {
    document.getElementById('connectionInfo').classList.remove('hidden');
    updateSheetStatus(true);
  }
}

async function startAuth() {
  const config = await getStorage(['oauthClientId']);
  const clientId = config.oauthClientId || OAUTH_CONFIG.clientId;
  
  if (!clientId) {
    showToast('❌ Save your OAuth Client ID first (above)', 'error');
    return;
  }
  
  const url = `${OAUTH_CONFIG.authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(OAUTH_CONFIG.redirectUri)}&response_type=code&scope=${encodeURIComponent(OAUTH_CONFIG.scopes)}&access_type=offline&prompt=consent`;
  chrome.tabs.create({ url });
  showToast('📋 Sign in, allow access, then copy the code from the URL', 'info');
}

async function exchangeCode() {
  const code = document.getElementById('authCode').value.trim();
  if (!code) {
    showToast('❌ Paste the auth code first', 'error');
    return;
  }

  showToast('⏳ Connecting...', 'info');

  try {
    const config = await getStorage(['oauthClientId', 'oauthClientSecret']);
    const clientId = config.oauthClientId || OAUTH_CONFIG.clientId;
    const clientSecret = config.oauthClientSecret || OAUTH_CONFIG.clientSecret;
    
    const resp = await fetch(OAUTH_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: OAUTH_CONFIG.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const data = await resp.json();

    if (data.access_token) {
      // Store tokens
      await chrome.storage.local.set({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiry: Date.now() + (data.expires_in * 1000) - 60000
      });

      // Test the connection
      const testResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const testResult = await testResp.json();

      if (testResp.ok) {
        showToast(`✅ Connected to: ${testResult.properties?.title}`, 'success');
        document.getElementById('connectionInfo').classList.remove('hidden');
        document.getElementById('authCode').value = '';
        updateSheetStatus(true);
      } else {
        showToast(`❌ Sheet access failed: ${testResult.error?.message}`, 'error');
      }
    } else {
      showToast(`❌ Auth failed: ${data.error_description || data.error}`, 'error');
    }
  } catch (err) {
    showToast(`❌ Error: ${err.message}`, 'error');
  }
}

async function pushToSheet() {
  const leads = await getLeads();
  if (leads.length === 0) {
    showToast('❌ No leads to push', 'error');
    return;
  }

  showToast(`⏳ Pushing ${leads.length} leads...`, 'info');

  chrome.runtime.sendMessage({ action: 'pushAllToSheet' }, (result) => {
    if (result && result.success) {
      showToast(`✅ Pushed ${result.pushed} leads to Google Sheet!`, 'success');
      updateStats();
    } else {
      showToast(`❌ ${result?.error || 'Push failed'}`, 'error');
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
      list.innerHTML = leads.map(l => {
        const p = l.parsedAddress || {};
        return `
          <div class="lead-item">
            <div class="lead-addr">${p.street || l.address || 'Unknown'}</div>
            <div class="lead-meta">${l.source || '?'} · ${l.price || 'No price'} · ${p.cityState || ''}</div>
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
