# Rotary Riches Login · CMS 整合版 v14.6.7

此目錄是 R&R CMS 的登入入口，與儲存庫根目錄 CMS 一起部署。

## 使用方式

直接開啟 [GitHub 線上版](https://notdesign.github.io/rr-cms-demo/login-demo/?v=14.6.7)。下載完整專案後，直接開啟 HTML 也會轉到同一線上版。

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

## v14.6.7 畫面張力與眼周修整

目前使用 `assets/portal-action-v14.6.7.jpg`。減輕左上金髮角色厚重的眼瞼與眼周陰影，保留紫色瞳孔和自然表情。強化刀刃前伸感、髮束與披風的方向性、底部霧氣流向及前後明暗層次，提升整體張力；自然灰綠氣氛、角色一致性與光門透視保留。 [素材與提示詞](evidence/portal-action-v14.6.7/README.md)。

## v14.6.6 自然光影與臉部細節

此版使用 `assets/portal-natural-v14.6.6.jpg`。依四張人物原始立繪精修眼睛、眉睫、鼻唇與臉部明暗，保留角色長相與自然表情。以另一張輪播背景為光影參考，改為自然灰綠環境光、低飽和霧氣與暖色受光。保留光門透視、底部遮擋、角色原色與綠色動態特效。 [素材與提示詞](evidence/portal-natural-v14.6.6/README.md)。

## v14.6.5 前景雲霧與光門透視

此版使用 `assets/portal-mist-v14.6.5.jpg`。底部增加分層雲霧，讓龍的腳、尾巴與下腹若隱若現，臉部與胸前寶石保持清楚。光門依同一空間調整角度、直立方向與遠近縮放。角色、表情、右側登入留白及綠色動態特效保留。 [素材與提示詞](evidence/portal-mist-v14.6.5/README.md)。

## v14.6.4 角色一致性與場景簡化

此版使用 `assets/portal-identity-v14.6.4.jpg`，依使用者提供的五張原始角色立繪恢復自然表情與辨識特徵。保留角色前後層次，背景簡化為光門與少量霧氣，移除密集岩石與能量網紋。綠色 Canvas 閃電、粒子及另一張輪播背景不變。網頁圖片 490,887 bytes；[原始輸出與提示詞紀錄](evidence/portal-identity-v14.6.4/README.md)。

## v14.6.3 表情與景深

此版使用 `assets/portal-depth-v14.6.3.jpg`：放鬆眉眼與嘴角，呈現輕微緊張的戒備感；女海盜與小龍清楚、近景岩石柔焦，後排角色與傳送門逐層退遠。圖片 461,390 bytes，保留無損 PNG 與前版。詳見 [素材與提示詞紀錄](evidence/portal-depth-v14.6.3/README.md)。

## v14.6.2 傳送門背景

以內建 imagegen 編修原有五角色背景，強化警戒表情、自然髮束、非重複能量分枝與光影材質。屬 AI 輔助精修，並非真人畫師手繪。網頁使用 `assets/portal-refined-v14.6.2.jpg`；無損 PNG 與前一版原圖一併保留，詳見 [素材與提示詞紀錄](evidence/portal-refinement-v14.6.2/README.md)。

## 驗證

在儲存庫根目錄執行：

```sh
npm test
python3 login-demo/evidence/check-assets.py
```

v14.6.1（2026-11-10）：222 項 Node 測試通過，11 項素材與 15 個相對引用核對通過。Chromium 實際檢查桌機 1440×900、平板 834×1112、手機 390×844 的登入、CMS 管理員選單與登出；登入頁無水平溢出，主控台無錯誤。另驗證報表連結導向、空欄位檢核、重新整理保留狀態與登出後再次存取 CMS。

結果見 `evidence/integration-20261110/results.json`。未進行實機 Safari／Firefox／觸控鍵盤驗證。圖片與 Logo 保留原權利人權利；字體授權見 `assets/fonts/`。

v14.6.1 另核對三種視窗尺寸的版本號與水平寬度，見 `evidence/release-v14.6.1/responsive.json`；新增本機 HTML 導向與外部返回網址拒絕測試。畫面截圖位於 `../docs/screenshots/`。
