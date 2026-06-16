# 🏸 台北羽球助手 | PlayBadmintonTaipei

## V2026.06.16

台北、新北地區羽球場地搶場工具。

---

## 檔案結構

```
/
├── index.html          ← 入口頁面
├── package.json        ← 套件設定
├── vite.config.js      ← 打包設定
├── vercel.json         ← Vercel 設定
├── src/
│   ├── main.jsx        ← React 入口
│   └── App.jsx         ← 主程式（PlayBadmintonTaipei）
├── api/
│   └── slots.js        ← 後端 API：抓即時空位資料
└── public/
    └── manifest.json   ← PWA 設定（加入主畫面）
```

---

## 更新步驟

1. 把新版 App.jsx 放進 `src/` 資料夾，覆蓋舊檔案
2. 上傳到 GitHub（commit + push）
3. Vercel 自動重新部署（約 1-2 分鐘）

---

## 後端 API

`/api/slots?lid=WSSC&date=2026-05-10`

回傳：
```json
{
  "lid": "WSSC",
  "date": "2026-05-10",
  "available": ["06:00–07:00", "14:00–15:00"],
  "booked": ["07:00–08:00"],
  "total": 16
}
```

支援的 LID：
- `WSSC` 文山運動中心
- `NHSC` 內湖運動中心
- `JJSC` 中正運動中心

---

## 空位通知（court-watch）

GitHub Actions 每 15 分鐘自動掃描 `/api/all`，依 `watch.json` 條件
（預設：週五 18:00–22:00、週六日全天、7 個場館）發現**新**空位時發 Telegram 通知。

### 啟用步驟

1. 在 Telegram 搜尋 **@BotFather** → `/newbot` → 取得 **BOT TOKEN**
2. 跟自己的新 bot 說一句話，再開 `https://api.telegram.org/bot<TOKEN>/getUpdates` 找到 **chat.id**
3. GitHub repo → Settings → Secrets and variables → Actions → 新增：
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Actions 頁面手動跑一次 **court-watch** 驗證

未設定 secrets 時 workflow 照常執行但只記 log（dry-run），不會失敗。

### 調整監看條件

改 `watch.json`：`venues`（LID 清單）、`rules`（days: 0=日…6=六 + 時段）、
`daysAhead`（往後看幾天）、`minCourts`（最少面數）。

---

## 數據分析（data 分支 + 📊 數據分頁）

官方系統沒有歷史 API，所以價值在記錄「狀態轉變」。`scripts/notify.js` 每輪掃描時，
除了發通知，還會比對上一輪狀態，記錄兩種事件：

- **appear**：某時段冒出空位（退訂或新日期釋出）
- **disappear**：某時段被搶走（含停留時長 `dur`）

事件以 NDJSON 寫進 `data/events-YYYY-MM.ndjson`，由 `scripts/push-data.sh`
**累積推到 repo 的 `data` 分支**（不是 main）。用獨立分支的原因：

1. main 保持乾淨，不被高頻事件 commit 洗版
2. Vercel 只部署 main，所以事件 commit **不會觸發重新部署**

App 的「📊 數據」分頁直接從 `raw.githubusercontent.com/<repo>/data/data/events-*.ndjson`
讀取（raw 支援 CORS），純前端計算後呈現：

- 🔥 退訂熱力圖（星期 × 時段，哪格最常冒空位）
- ⏰ 退訂釋出時刻（一天中幾點最容易撿；新日期釋出 vs 一般退訂）
- ⚡ 撿場速度（空位多久被搶走的中位數）
- 🏟 場館退訂排名（次數 + 平均面數）

> 注意：資料只能從上線後往前累積，約 1–2 週後才有足夠樣本。
> 冷啟動（第一次跑、無舊狀態）只建狀態、不記 appear，避免爆量假「釋出」。

### 事件欄位

```json
{"t":"<偵測時間 ISO UTC>","ev":"appear","lid":"WSSC","date":"2026-06-20",
 "dow":6,"slot":"18:00–19:00","courts":3,"lead":4}
{"t":"...","ev":"disappear","lid":"WSSC","date":"2026-06-20","slot":"18:00–19:00",
 "dur":12.4,"lead":4}
```

`lead` = 偵測當下距打球日幾天（用來區分「搶頭香」新釋出 vs 一般退訂）。

### data 分支權限

workflow 已設 `permissions: contents: write`，由內建 `GITHUB_TOKEN` 推送，
無需額外 PAT。`data` 分支第一次會由 `push-data.sh` 自動建立（orphan branch）。

---

### 版本規則

版本號使用年月日格式：`V<年>.<月>.<日>`，例如 V2026.06.16。
