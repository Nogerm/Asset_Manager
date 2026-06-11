const SPREADSHEET_ID = "1D8tdAnmhSqfQxgwRKLC5bnTOFW6jz3pOA_tFbwv0pw4";

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 取得物品
  if (action === "getItems") {
    const sheet = ss.getSheetByName("Items");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const items = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    return jsonResponse({ success: true, data: items });
  }

  // 2. 取得分類
  if (action === "getCategories") {
    const sheet = ss.getSheetByName("Categories");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const categories = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    return jsonResponse({ success: true, data: categories });
  }

  // 3. 取得維修紀錄
  if (action === "getLogs") {
    const itemId = e.parameter.itemId;
    const sheet = ss.getSheetByName("Logs");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    const logs = rows
      .map(row => {
        let obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      })
      .filter(log => log.item_id === itemId);
    return jsonResponse({ success: true, data: logs });
  }

  return jsonResponse({ success: false, message: "Invalid action" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const postData = JSON.parse(e.postData.contents);
  const action = postData.action;

  // 1. 新增物品
  if (action === "addItem") {
    const sheet = ss.getSheetByName("Items");
    const id = "item_" + new Date().getTime();
    sheet.appendRow([
      id,
      postData.name,
      postData.category,
      postData.purchase_date,
      "使用中",
      "",
      postData.description
    ]);
    return jsonResponse({ success: true, id: id });
  }

  // 2. 新增分類
  if (action === "addCategory") {
    const sheet = ss.getSheetByName("Categories");
    // 檢查是否重複
    const data = sheet.getDataRange().getValues();
    const exists = data.some(row => row[1] === postData.name);
    if (exists) {
      return jsonResponse({ success: false, message: "分類已存在" });
    }
    const id = "cat_" + new Date().getTime();
    sheet.appendRow([id, postData.name]);
    return jsonResponse({ success: true, id: id });
  }

  // 3. 新增紀錄
  if (action === "addLog") {
    const sheet = ss.getSheetByName("Logs");
    const logId = "log_" + new Date().getTime();
    sheet.appendRow([
      logId,
      postData.item_id,
      postData.date,
      postData.type,
      postData.detail
    ]);
    return jsonResponse({ success: true, log_id: logId });
  }

  // 4. 停用物品
  if (action === "deactivateItem") {
    const sheet = ss.getSheetByName("Items");
    const data = sheet.getDataRange().getValues();
    const itemId = postData.item_id;
    const endDate = postData.end_date || new Date().toISOString().split('T')[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === itemId) {
        sheet.getRange(i + 1, 5).setValue("已停用");
        sheet.getRange(i + 1, 6).setValue(endDate);
        break;
      }
    }
    return jsonResponse({ success: true });
  }

  return jsonResponse({ success: false, message: "Invalid action" });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}