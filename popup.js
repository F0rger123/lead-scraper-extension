// Lead Scraper - Jarvis Chrome Extension
// Popup script

document.addEventListener('DOMContentLoaded', async () => {
  await updateStats();
  loadSheetId();

  document.getElementById('skipTraceBtn').addEventListener('click', skipTraceCurrentPage);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('viewLeadsBtn').addEventListener('click', toggleLeadList);
  document.getElementById('clearBtn').addEventListener('click', clearLeads);
  document.getElementById('sheetId').addEventListener('change', saveSheetId);
});

async function updateStats() {
  const leads = await getLeads();
  document.getElementById('leadCount').textContent = leads.length;

  const today = new Date().toLocaleDateString();
  const todayLeads = leads.filter(l => {
    const leadDate = l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : '';
    return leadDate === today;
  });
  document.getElementById('todayCount').textContent = todayLeads.length;
}

async function getLeads() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingLeads'], (result) => {
      resolve(result.pendingLeads || []);
    });
  });
}

async function skipTraceCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Try to get address from the page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent.trim() : '';
    }
  });

  const address = results?.[0]?.result || '';
  if (!address) {
    alert('Could not find address on this page');
    return;
  }

  const cleaned = address.replace(/,\s*/g, '/').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-\/]/g, '').toLowerCase();
  chrome.tabs.create({ url: `https://www.cyberbackgroundchecks.com/address/${cleaned}` });
}

async function exportCSV() {
  const leads = await getLeads();
  if (leads.length === 0) {
    alert('No leads to export');
    return;
  }

  const headers = ['Name', 'Address', 'Phone', 'Lead Type', 'Status', 'Link', 'Listing Price', 'Value', 'Notes', 'Date Added', 'Skip Trace URL'];
  const rows = leads.map(l => [
    l.owner || '',
    l.address || '',
    l.phone || '',
    l.leadType || l.source || '',
    l.status || "Haven't Contacted",
    l.url || '',
    l.price || '',
    l.value || '',
    l.notes || '',
    l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    l.skipTraceUrl || ''
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function toggleLeadList() {
  const list = document.getElementById('leadList');
  const btn = document.getElementById('viewLeadsBtn');

  if (list.style.display === 'none') {
    const leads = await getLeads();
    list.innerHTML = leads.length === 0
      ? '<div style="text-align:center;padding:16px;color:#64748b;">No pending leads</div>'
      : leads.map((l, i) => `
        <div class="lead-item">
          <div class="lead-addr">${l.address || 'Unknown Address'}</div>
          <div class="lead-meta">${l.source || 'Unknown'} · ${l.price || 'No price'} · ${l.owner || 'No owner'}</div>
        </div>
      `).join('');
    list.style.display = 'block';
    btn.textContent = '📋 Hide Leads';
  } else {
    list.style.display = 'none';
    btn.textContent = '📋 View Pending Leads';
  }
}

async function clearLeads() {
  if (confirm('Clear all pending leads? This cannot be undone.')) {
    chrome.storage.local.set({ pendingLeads: [] });
    await updateStats();
    document.getElementById('leadList').style.display = 'none';
  }
}

function loadSheetId() {
  chrome.storage.local.get(['sheetId'], (result) => {
    if (result.sheetId) {
      document.getElementById('sheetId').value = result.sheetId;
    }
  });
}

function saveSheetId() {
  const id = document.getElementById('sheetId').value;
  chrome.storage.local.set({ sheetId: id });
}
