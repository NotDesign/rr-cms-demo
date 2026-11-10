# Rotary Riches Login · CMS 整合版 v14.6.1

此目錄是 R&R CMS 的登入入口，與儲存庫根目錄 CMS 一起部署。

## 使用方式

直接開啟 [GitHub 線上版](https://notdesign.github.io/rr-cms-demo/login-demo/?v=14.6.1)。下載完整專案後，直接開啟 HTML 也會轉到同一線上版。

本機開發：在儲存庫根目錄執行 `npm start`，開啟 `http://127.0.0.1:4173/`。

- 尚未登入時，CMS 自動轉到 `login-demo/`。
- 使用示範 Email（如 `demo@example.com`）與任意非空示範密碼即可進入。
- 原本的報表 hash 連結會保留，例如 `#slots`。
- 同一分頁重新整理可維持示範登入狀態。
- 點選右上方管理員頭像，再點「登出」，即可返回登入頁。手機也保留 44px 帳號入口。

這是前端導覽示範，沒有後端帳號驗證，不是資料存取保護。只在 `sessionStorage` 存放按網站路徑區分的示範狀態標記；不保存或傳輸輸入的 Email／密碼。密碼與 Email 在切換頁面前清空。登出不刪除 CMS 的示範資料與工作區偏好。

## 視覺與動效

使用本機背景圖片、Logo、SVG 圖示及 Noto Sans TC 字體。保留兩張背景輪播；閃電核心、分岔、模糊光暈與全部粒子均為綠色。閃電採不規則細折點及漸細分岔，粒子池為桌機 128、平板 88、手機 56，沒有大片火焰區塊。

支援暫停、減少動態偏好與背景分頁停止更新。登入頁只提供繁體中文內容；語系按鈕仍為互動示例。CMS 沿用原本繁體中文／越南文／泰文介面。

## 驗證

在儲存庫根目錄執行：

```sh
npm test
python3 login-demo/evidence/check-assets.py
```

v14.6.1（2026-11-10）：222 項 Node 測試通過，11 項素材與 15 個相對引用核對通過。Chromium 實際檢查桌機 1440×900、平板 834×1112、手機 390×844 的登入、CMS 管理員選單與登出；登入頁無水平溢出，主控台無錯誤。另驗證報表連結導向、空欄位檢核、重新整理保留狀態與登出後再次存取 CMS。

結果見 `evidence/integration-20261110/results.json`。未進行實機 Safari／Firefox／觸控鍵盤驗證。圖片與 Logo 保留原權利人權利；字體授權見 `assets/fonts/`。

v14.6.1 另核對三種視窗尺寸的版本號與水平寬度，見 `evidence/release-v14.6.1/responsive.json`；新增本機 HTML 導向與外部返回網址拒絕測試。畫面截圖位於 `../docs/screenshots/`。
