# Google Apps Script (GAS) Backend

此資料夾存放 GAS 程式碼，與前端 LIFF (位於根目錄與 `src/`) 分開管理。

## 推薦開發工具：clasp

建議安裝 Google 官方開發的 `@google/clasp`，以便在本地開發並同步至 GAS 雲端環境。

### 安裝 clasp
```bash
npm install -g @google/clasp
```

### 登入 Google 帳號
```bash
clasp login
```

### 連結現有 GAS 專案
在 `gas/` 目錄下執行：
```bash
cd gas
clasp clone <scriptId>
```

### 上傳程式碼
```bash
clasp push
```

### 下載雲端程式碼
```bash
clasp pull
```

## 注意事項
- `.clasp.json` 包含專案 ID，通常不建議進 Git (若為公開專案)。
- `appsscript.json` 是專案設定檔，必須包含在 Git 中。
