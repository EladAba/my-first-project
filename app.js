const STORAGE_KEY = 'payment_entries';

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const form = document.getElementById('entryForm');
const nameInput = document.getElementById('name');
const amountInput = document.getElementById('amount');
const tableBody = document.getElementById('tableBody');
const entriesTable = document.getElementById('entriesTable');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const totalAmount = document.getElementById('totalAmount');
const exportBtn = document.getElementById('exportBtn');

function formatCurrency(value) {
  return '₪' + Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateSummary() {
  const count = entries.length;
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  totalCount.textContent = count;
  totalAmount.textContent = formatCurrency(total);
  exportBtn.disabled = count === 0;
}

function renderTable() {
  tableBody.innerHTML = '';

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    entriesTable.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    entriesTable.classList.remove('hidden');

    entries.forEach((entry, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td class="amount-cell">${formatCurrency(entry.amount)}</td>
        <td>${formatDate(entry.date)}</td>
        <td><button class="btn-delete" data-id="${entry.id}">מחק</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  updateSummary();
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
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Add entry
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!name || isNaN(amount) || amount < 0) return;

  const entry = {
    id: Date.now(),
    name,
    amount,
    date: new Date().toISOString(),
  };

  entries.push(entry);
  saveToStorage();
  renderTable();
  showToast('הרשומה נוספה בהצלחה');
  form.reset();
  nameInput.focus();
});

// Delete entry
tableBody.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-delete')) {
    const id = Number(e.target.dataset.id);
    entries = entries.filter((entry) => entry.id !== id);
    saveToStorage();
    renderTable();
    showToast('הרשומה נמחקה');
  }
});

// Export to Excel
exportBtn.addEventListener('click', () => {
  if (entries.length === 0) return;

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  const data = entries.map((entry, index) => ({
    '#': index + 1,
    'שם מלא': entry.name,
    'סכום (₪)': entry.amount,
    'תאריך': formatDate(entry.date),
  }));

  // Add total row
  data.push({ '#': '', 'שם מלא': 'סה"כ', 'סכום (₪)': total, 'תאריך': '' });

  const worksheet = XLSX.utils.json_to_sheet(data, { skipHeader: false });

  // Column widths
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 25 },
    { wch: 15 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'תשלומים');

  const today = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
  XLSX.writeFile(workbook, `תשלומים_${today}.xlsx`);
  showToast('הקובץ יוצא בהצלחה');
});

// Initial render
renderTable();
