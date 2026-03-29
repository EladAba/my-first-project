const SCRIPT_URL_KEY = 'gas_script_url';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAa6yvvb7_uzLCQJIVZRvYm1og6cutHzq0jk8DtlBfT91WAbXpFl54RrMuLhhYT-M83g/exec';

let scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
let entries = [];

// DOM refs
const form = document.getElementById('entryForm');
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const tableBody = document.getElementById('tableBody');
const entriesTable = document.getElementById('entriesTable');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const totalCount = document.getElementById('totalCount');
const totalAmount = document.getElementById('totalAmount');
const exportBtn = document.getElementById('exportBtn');
const submitBtn = document.getElementById('submitBtn');
const setupBanner = document.getElementById('setupBanner');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const statusBar = document.getElementById('statusBar');

// ── Setup banner ─────────────────────────────────────────────────

document.getElementById('changeUrlBtn').addEventListener('click', () => {
  document.getElementById('scriptUrlInput').value = scriptUrl;
  setupBanner.classList.remove('hidden');
});

document.getElementById('setupDismiss').addEventListener('click', () => {
  setupBanner.classList.add('hidden');
});

document.getElementById('setupHelpLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('setupSteps').classList.toggle('hidden');
});

document.getElementById('saveUrlBtn').addEventListener('click', () => {
  const url = document.getElementById('scriptUrlInput').value.trim();
  if (!url.startsWith('https://script.google.com')) {
    showToast('URL לא תקין – צריך להתחיל עם https://script.google.com');
    return;
  }
  scriptUrl = url;
  localStorage.setItem(SCRIPT_URL_KEY, scriptUrl);
  setupBanner.classList.add('hidden');
  setStatus('connecting');
  loadEntries();
});

// ── Status helpers ────────────────────────────────────────────────

function setStatus(state, message) {
  statusDot.className = 'status-dot ' + state;
  const labels = {
    connected: 'מחובר ל-Google Sheets',
    disconnected: 'לא מחובר',
    connecting: 'מתחבר...',
    error: message || 'שגיאת חיבור',
  };
  statusText.textContent = labels[state] || state;
}

// ── API calls ─────────────────────────────────────────────────────

async function apiCall(body) {
  if (!scriptUrl) {
    setupBanner.classList.remove('hidden');
    throw new Error('אין URL מוגדר');
  }
  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function loadEntries() {
  showLoading(true);
  try {
    const data = await apiCall({ action: 'getAll' });
    entries = data.entries || [];
    setStatus('connected');
    renderTable();
  } catch (err) {
    setStatus('error', 'שגיאת חיבור');
    showLoading(false);
    showToast('שגיאה בטעינת נתונים: ' + err.message);
  }
}

// ── Form submit ───────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  if (!name || isNaN(amount) || amount < 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'שומר...';

  try {
    const result = await apiCall({ action: 'add', name, amount });
    entries.push({ id: result.id, name, amount, date: result.date });
    renderTable();
    showToast('הרשומה נוספה ונשמרה ב-Google Sheets');
    form.reset();
    nameInput.focus();
  } catch (err) {
    showToast('שגיאה בהוספת רשומה: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'הוסף רשומה';
  }
});

// ── Delete ────────────────────────────────────────────────────────

tableBody.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('btn-delete')) return;
  const id = e.target.dataset.id;
  e.target.disabled = true;
  e.target.textContent = '...';
  try {
    await apiCall({ action: 'delete', id });
    entries = entries.filter((en) => String(en.id) !== String(id));
    renderTable();
    showToast('הרשומה נמחקה');
  } catch (err) {
    showToast('שגיאה במחיקה: ' + err.message);
    e.target.disabled = false;
    e.target.textContent = 'מחק';
  }
});

// ── Export ────────────────────────────────────────────────────────

exportBtn.addEventListener('click', () => {
  if (!entries.length) return;
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const data = entries.map((entry, i) => ({
    '#': i + 1,
    'שם מלא': entry.name,
    'סכום (₪)': entry.amount,
    'תאריך': formatDate(entry.date),
  }));
  data.push({ '#': '', 'שם מלא': 'סה"כ', 'סכום (₪)': total, 'תאריך': '' });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'תשלומים');
  const today = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  XLSX.writeFile(wb, `תשלומים_${today}.xlsx`);
  showToast('הקובץ יוצא בהצלחה');
});

// ── Render ────────────────────────────────────────────────────────

function renderTable() {
  showLoading(false);
  tableBody.innerHTML = '';

  if (!entries.length) {
    emptyState.classList.remove('hidden');
    entriesTable.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    entriesTable.classList.remove('hidden');
    entries.forEach((entry, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td class="amount-cell">${formatCurrency(entry.amount)}</td>
        <td>${formatDate(entry.date)}</td>
        <td><button class="btn-delete" data-id="${entry.id}">מחק</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  const count = entries.length;
  const total = entries.reduce((s, e) => s + e.amount, 0);
  totalCount.textContent = count;
  totalAmount.textContent = formatCurrency(total);
  exportBtn.disabled = count === 0;
}

function showLoading(on) {
  loadingState.classList.toggle('hidden', !on);
  if (on) {
    emptyState.classList.add('hidden');
    entriesTable.classList.add('hidden');
  }
}

// ── Utilities ─────────────────────────────────────────────────────

function formatCurrency(v) {
  return '₪' + Number(v).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(text));
  return div.innerHTML;
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Init ──────────────────────────────────────────────────────────

if (scriptUrl) {
  setStatus('connecting');
  loadEntries();
} else {
  setStatus('disconnected');
  setupBanner.classList.remove('hidden');
}
