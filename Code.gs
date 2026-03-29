// ===================================================================
// Google Apps Script – מעקב תשלומים
// כל הבקשות מגיעות דרך doGet עם URL params (ללא בעיות CORS)
// ===================================================================

const SHEET_NAME = 'תשלומים';
const HEADERS = ['ID', 'שם מלא', 'סכום', 'תאריך'];

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1a1a2e');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 150);
  }
  return sheet;
}

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = e.parameter.action || 'getAll';
    let result;

    if (action === 'getAll') {
      result = getAllEntries();
    } else if (action === 'add') {
      result = addEntry(e.parameter.name, Number(e.parameter.amount));
    } else if (action === 'delete') {
      result = deleteEntry(e.parameter.id);
    } else {
      result = { error: 'פעולה לא ידועה' };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

function getAllEntries() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { entries: [] };

  const entries = data.slice(1).map(row => ({
    id: String(row[0]),
    name: row[1],
    amount: Number(row[2]),
    date: String(row[3]),
  }));

  return { entries };
}

function addEntry(name, amount) {
  const sheet = getSheet();
  const id = String(Date.now());
  const date = new Date().toISOString();
  sheet.appendRow([id, name, amount, date]);
  return { success: true, id, date };
}

function deleteEntry(id) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'רשומה לא נמצאה' };
}
