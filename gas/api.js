const SPREADSHEET_ID = "1D8tdAnmhSqfQxgwRKLC5bnTOFW6jz3pOA_tFbwv0pw4";

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 1. 取得物品
    if (action === "getItems") {
      const sheet = ss.getSheetByName("Items");
      if (!sheet) return jsonResponse({ success: false, message: "Sheet 'Items' not found" });
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
      if (!sheet) return jsonResponse({ success: false, message: "Sheet 'Categories' not found" });
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
      if (!sheet) return jsonResponse({ success: false, message: "Sheet 'Logs' not found" });
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
        .filter(log => !itemId || log.item_id === itemId);
      return jsonResponse({ success: true, data: logs });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }

  return jsonResponse({ success: false, message: "Invalid action" });
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const postData = JSON.parse(e.postData.contents);
  const action = postData.action;

  try {
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

    // 5. 更新物品
    if (action === "updateItem") {
      const sheet = ss.getSheetByName("Items");
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const itemId = postData.id;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          if (postData.name) sheet.getRange(i + 1, 2).setValue(postData.name);
          if (postData.category) sheet.getRange(i + 1, 3).setValue(postData.category);
          if (postData.purchase_date) sheet.getRange(i + 1, 4).setValue(postData.purchase_date);
          if (postData.status) sheet.getRange(i + 1, 5).setValue(postData.status);
          if (postData.end_date !== undefined) sheet.getRange(i + 1, 6).setValue(postData.end_date);
          if (postData.description) sheet.getRange(i + 1, 7).setValue(postData.description);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, message: "Item not found" });
    }

    // 6. 刪除物品
    if (action === "deleteItem") {
      const sheet = ss.getSheetByName("Items");
      const data = sheet.getDataRange().getValues();
      const itemId = postData.id;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === itemId) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, message: "Item not found" });
    }

    // 7. 刪除分類
    if (action === "deleteCategory") {
      const sheet = ss.getSheetByName("Categories");
      const data = sheet.getDataRange().getValues();
      const catId = postData.id;

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === catId) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true });
        }
      }
      return jsonResponse({ success: false, message: "Category not found" });
    }

  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }

  return jsonResponse({ success: false, message: "Invalid action" });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}