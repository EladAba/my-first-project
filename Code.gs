// ===================================================================
// Google Apps Script – מעקב תשלומים
// הוראות פריסה: ראה README בתחתית הקובץ
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
    // עיצוב כותרות
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
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const action = (e.parameter && e.parameter.action) ||
                   (e.postData ? JSON.parse(e.postData.contents).action : 'getAll');
    let body = {};
    if (e.postData) {
      try { body = JSON.parse(e.postData.contents); } catch (_) {}
    }

    let result;
    if (action === 'getAll') {
      result = getAllEntries();
    } else if (action === 'add') {
      result = addEntry(body);
    } else if (action === 'delete') {
      result = deleteEntry(body.id);
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
    date: row[3],
  }));

  return { entries };
}

function addEntry(body) {
  const sheet = getSheet();
  const id = String(Date.now());
  const date = new Date().toISOString();
  sheet.appendRow([id, body.name, body.amount, date]);
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

/*
===================================================================
הוראות פריסה (חד-פעמי):
===================================================================
1. פתח Google Sheets חדש: https://sheets.google.com
2. כלים → Apps Script
3. מחק את הקוד הקיים, הדבק את כל הקוד מקובץ זה
4. שמור (Ctrl+S)
5. פריסה → פריסה חדשה
   - סוג: Web App
   - הפעל בתור: אני (Me)
   - מי יכול לגשת: Anyone  ← חשוב!
6. לחץ "פרוס", אשר הרשאות
7. העתק את ה-URL שמתקבל
8. חזור לאפליקציה → לחץ "הגדרות" → הדבק את ה-URL
===================================================================
*/
