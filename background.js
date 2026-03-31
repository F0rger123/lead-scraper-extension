// Lead Scraper - Jarvis Chrome Extension
// Background service worker: handles skip tracing and Google Sheets push

const SPREADSHEET_ID = '1GjB4P5SKiMoZDrlkuOvgetpynYhE0yTPFm-R56NLZhg';
const SHEET_NAME = 'Leads';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'addLead') {
    handleAddLead(message.data).then(sendResponse);
    return true; // async response
  }
  if (message.action === 'getLeads') {
    getPendingLeads().then(sendResponse);
    return true;
  }
  if (message.action === 'clearLeads') {
    chrome.storage.local.set({ pendingLeads: [] });
    sendResponse({ success: true });
  }
  if (message.action === 'skipTrace') {
    const addr = message.address;
    const url = buildSkipTraceUrl(addr);
    chrome.tabs.create({ url: url });
    sendResponse({ url: url });
  }
  if (message.action === 'exportCSV') {
    exportToCSV().then(sendResponse);
    return true;
  }
});

async function handleAddLead(data) {
  const leads = (await getPendingLeads()) || [];
  leads.push(data);
  await chrome.storage.local.set({ pendingLeads: leads });
  return { success: true, totalLeads: leads.length };
}

async function getPendingLeads() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['pendingLeads'], (result) => {
      resolve(result.pendingLeads || []);
    });
  });
}

function buildSkipTraceUrl(address) {
  const cleaned = address
    .replace(/,\s*/g, '/')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-\/]/g, '')
    .toLowerCase();
  return `https://www.cyberbackgroundchecks.com/address/${cleaned}`;
}

async function exportToCSV() {
  const leads = await getPendingLeads();
  if (!leads || leads.length === 0) return { csv: '', count: 0 };

  const headers = ['Name', 'Address', 'Phone', 'Lead Type', 'Status', 'Link', 'Listing Price', 'Value', 'Notes', 'Date Added', 'Skip Trace URL'];
  const rows = leads.map(l => [
    l.owner || '',
    l.address || '',
    l.phone || '',
    l.leadType || l.source || '',
    l.status || 'Haven\'t Contacted',
    l.url || '',
    l.price || '',
    l.value || '',
    l.notes || '',
    l.extractedAt ? new Date(l.extractedAt).toLocaleDateString() : new Date().toLocaleDateString(),
    l.skipTraceUrl || ''
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return { csv, count: leads.length };
}

// Badge update
async function updateBadge() {
  const leads = await getPendingLeads();
  const count = leads ? leads.length : 0;
  chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
}

chrome.storage.onChanged.addListener(updateBadge);
updateBadge();
