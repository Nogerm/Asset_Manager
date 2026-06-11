/**
 * GAS Local Debug Simulation
 * 用於在本地環境模擬 Google Apps Script 的 doGet 與 doPost 行為
 * 幫助開發者驗證 api.js 的邏輯是否正確
 */

// 模擬 Apps Script 的環境物件與全域變數
const SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: (name) => {
      console.log(`[Mock] Accessing sheet: ${name}`);
      return {
        getDataRange: () => ({
          getValues: () => {
            if (name === "Items") return [
              ["id", "name", "category", "purchase_date", "status", "end_date", "description"],
              ["item_1", "測試手機", "電子產品", "2023-01-01", "使用中", "", "測試用"]
            ];
            if (name === "Categories") return [
              ["id", "name"],
              ["cat_1", "電子產品"],
              ["cat_2", "辦公用品"]
            ];
            return [["id"], ["dummy"]];
          }
        }),
        appendRow: (row) => console.log(`[Mock] Appending row to ${name}:`, row),
        getRange: (r, c) => ({
          setValue: (v) => console.log(`[Mock] Setting value at (${r},${c}) to: ${v}`)
        }),
        deleteRow: (r) => console.log(`[Mock] Deleting row at ${r} in ${name}`)
      };
    }
  })
};

const ContentService = {
  MimeType: { JSON: "application/json" },
  createTextOutput: (content) => ({
    setMimeType: () => ({
      content: content,
      getContent: () => content
    })
  })
};

// 注入 api.js 的內容 (模擬環境)
const fs = require('fs');
const path = require('path');
const apiCode = fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8');

// 建立一個沙盒環境執行 api.js
const sandbox = {
  SpreadsheetApp,
  ContentService,
  console
};

// 執行 api.js 程式碼以定義 doGet, doPost
const script = new Function('SpreadsheetApp', 'ContentService', 'console', apiCode + '\nreturn { doGet, doPost };');
const { doGet, doPost } = script(SpreadsheetApp, ContentService, console);

// --- 測試模擬 ---

console.log("=== 測試 1: 模擬 doGet (getItems) ===");
const getEvent = {
  parameter: { action: "getItems" }
};
const getResponse = doGet(getEvent);
console.log("Response:", getResponse.content);

console.log("\n=== 測試 2: 模擬 doPost (addCategory) ===");
const postEvent = {
  postData: {
    contents: JSON.stringify({
      action: "addCategory",
      name: "新分類"
    })
  }
};
const postResponse = doPost(postEvent);
console.log("Response:", postResponse.content);

console.log("\n=== 測試 3: 模擬 doGet (getCategories) ===");
const getCatsEvent = {
  parameter: { action: "getCategories" }
};
const getCatsResponse = doGet(getCatsEvent);
console.log("Response:", getCatsResponse.content);
