# 🏸 台北羽球助手 | PlayBadmintonTaipei

## V2026.06.18

台北、新北地區羽球場地搶場工具。

---

## 檔案結構

```
/
├── index.html                  ← 入口頁面
├── package.json                ← 套件設定
├── vite.config.js              ← 打包設定
├── vercel.json                 ← Vercel 設定
├── watch.json                  ← 監看條件（假日模式）
├── src/
│   ├── main.jsx                ← React 入口
│   ├── App.jsx                 ← 主程式（4 分頁）
│   └── DataTab.jsx             ← 📊 數據分頁
├── api/
│   ├── slots.js                ← 單一場館即時空位
│   └── all.js                  ← 7 場館一次查（節流）
├── scripts/
│   ├── notify.js               ← court-watch 掃描/通知/事件/健康監測
│   └── push-data.sh            ← 把事件推到 data 分支
└── .github/workflows/scan.yml  ← 排程觸發

分支：main（程式）、data（累積的事件 NDJSON，不觸發 Vercel 重建）
```

---

## 更新步驟

1. 把改好的檔案放進對應資料夾，上傳到 GitHub（commit + push）
2. Vercel 自動重新部署（約 1–2 分鐘）

---

## 後端 API

`/api/all?date=2026-06-20` → 一次回 7 個運動中心的即時空位（並發 2、s-maxage=60 快取）。
`/api/slots?lid=WSSC&date=2026-06-20` → 單一場館。

支援 LID：`WSSC` 文山、`NHSC` 內湖、`JJSC` 中正、`DASC` 大安、`SLSC` 士林、`WHSC` 萬華、`BTSC` 北投。

---

## 空位通知（court-watch）

GitHub Actions（+ cron-job.org 每 5 分外部觸發）自動掃描 `/api/all`，依 `watch.json` 條件
（預設：放假日含國定假日全天、放假日前一晚 18:00–22:00、7 個場館）發現**新**空位時發 Telegram 通知。
新日期剛釋出（第一次進 14 天窗、場最多）的會標 **🆕新日期釋出**。

### 啟用步驟

1. 在 Telegram 搜尋 **@BotFather** → `/newbot` → 取得 **BOT TOKEN**
2. 跟自己的新 bot 說一句話，再開 `https://api.telegram.org/bot<TOKEN>/getUpdates` 找到 **chat.id**
3. GitHub repo → Settings → Secrets and variables → Actions → 新增：
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Actions 頁面手動跑一次 **court-watch** 驗證

未設定 secrets 時 workflow 照常執行但只記 log（dry-run），不會失敗。

### 調整監看條件

改 `watch.json`：
- `mode`：`holiday`（預設，依官方辦公日曆）或 `rules`（舊版星期規則）
- `venues`（LID 清單）、`daysAhead`（往後看幾天）、`minCourts`（最少面數）
- `holidayHours` / `eveBeforeHours`：放假日當天、放假日前一晚的監看時段（startHour/endHour）
- `calendarUrlTemplate`：官方日曆 JSON 來源（含 `{year}`），抓不到時自動退回「週末全天＋週五晚」

> 假日模式會抓中華民國政府辦公日曆（ruyut/TaiwanCalendar），補班/彈性放假/補假都依官方 `isHoliday` 判定，不是用星期硬猜。

---

## 數據分析（data 分支 + 📊 數據分頁）

官方系統沒有歷史 API，所以價值在記錄「狀態轉變」。`notify.js` 每輪掃描比對上輪狀態，記錄兩種事件：

- **appear**：某時段冒出空位（退訂；新日期釋出的標 `nr:1`）
- **disappear**：某時段被搶走（含停留時長 `dur`）

事件以 NDJSON 寫進 `data/events-YYYY-MM.ndjson`，由 `push-data.sh` 累積推到 repo 的 **data 分支**
（不是 main，避免洗版且 **不觸發 Vercel 重建**）。App 的「📊 數據」分頁從
`raw.githubusercontent.com/<repo>/data/data/events-*.ndjson` 直接讀（支援 CORS），純前端算出：

- 🔥 退訂熱力圖（星期 × 時段，哪格最常冒空位）
- ⏰ 退訂釋出時刻（一天中幾點最容易撿；用 `nr` 分「新日期釋出」vs「一般退訂」）
- ⚡ 撿場速度（空位多久被搶走的中位數；**只採高精度樣本** `prec<=90`，見下方密集追蹤）
- 🏟 場館退訂排名（次數 + 平均面數）

> 資料只能從上線後往前累積，約 1–2 週才有足夠樣本。冷啟動只建狀態、不記 appear，避免假爆量。
> workflow 已設 `permissions: contents: write`；`data` 分支第一次由 `push-data.sh` 自動建立。

### 事件欄位

```json
{"t":"<偵測 ISO UTC>","ev":"appear","lid":"WSSC","date":"2026-06-20","dow":6,"slot":"18:00–19:00","courts":3,"lead":4,"nr":1}
{"t":"...","ev":"disappear","lid":"WSSC","date":"2026-06-20","slot":"18:00–19:00","dur":12.4,"lead":4,"prec":63,"burst":1}
```

`lead`=偵測當下距打球日幾天；`nr:1`=該日期第一次進窗（新釋出/搶頭香）。
`dur`=自首次偵測到的停留分鐘數；`prec`=本次量測不確定度（秒，＝距上次看到它多久，越小越準）；`burst:1`=密集追蹤期間量到。

---

## 事件觸發密集追蹤（reactiveBurst）— 量準「被搶走的時刻」

退訂隨時會發生，正常輪每 5–15 分才掃一次，所以 `dur` 的「被搶走時刻」誤差可達十幾分。
本機制讓正常輪**一偵測到新退訂（appear），就針對那些日期切進每 ~60s 的密集 loop**，
追到它們都被搶走或逾時（預設 10 分），把消失時刻量到約 1 分內。在同一個 GitHub Actions run 內
跑完，不需額外基礎設施。高精度的 disappear 會標 `burst:1` 且 `prec` 小，DataTab 只用這些算撿場速度。

> **解析度天花板＝60 秒**：`/api/all` 設 `Cache-Control: s-maxage=60`，掃比 60s 更快只會拿到同一份
> Vercel 快取。刻意**不繞快取**（繞了要直打官方 server，並發易失敗、有被擋風險），所以 `intervalSec`
> 不低於 60。足以分辨「<1 分秒殺 / 1–3 分 / 3–10 分 / >10 分」。

### 調整（`watch.json` 的 `reactiveBurst`）

- `enabled`：是否啟用（預設 true）
- `intervalSec`：密集追蹤間隔秒數（自動夾在 ≥60）
- `maxMin`：單次 burst 最長分鐘（預設 10，保護 GitHub Actions 免費額度）
- `jitterSec`：間隔抖動秒數

> 注意：burst 進行中會佔住 `concurrency: court-watch` 鎖，擋掉下一次 cron tick（這是預期行為，避免重複掃）。
> 測試可設環境變數 `BURST_TEST=N`（間隔歸零、最多 N 輪）。

---

## 健康監測（不讓雷達靜默失效）

整套系統無人值守，若哪條外部命脈斷掉（官方 API 改版、日曆掛掉、cron-job.org 停跑、GitHub 停用排程），
雷達會「靜默停擺」，你卻以為「最近沒退訂」。`notify.js` 內建兩層監測：

- **(B) API 異常即時警報**：每輪統計有幾個場館正常回應。連續 **3 輪**「全部撈不到任何資料」才發一次
  `⚠️ 羽球雷達警告`（避免暫時性閃失誤報），恢復時發 `✅ 羽球雷達恢復`。
  「全部場館額滿」會回正常空陣列，**不會**被誤判為壞掉。
- **(A) 每日心跳**：每天台灣 **09:00** 後發一則 `✅ 羽球雷達運作中`（含監看範圍、API 狀態、過去一天通知數）。
  **哪天早上沒收到心跳 = 系統死了**（被動偵測，因為死掉的掃描器沒法自己回報死訊）。

### 可選：真・dead-man's-switch（healthchecks.io）

要主動偵測「掃描器整個停掉」，可接外部監測：

1. 到 [healthchecks.io](https://healthchecks.io)（免費）建一個 Check（Period 例如 1 小時、Grace 30 分）
2. 複製 Ping URL（`https://hc-ping.com/<uuid>`）
3. GitHub repo → Settings → Secrets → Actions 新增 `HEALTHCHECK_URL` ＝該 URL
4. 之後每次成功掃描會自動 ping；超時沒收到，healthchecks.io 會 email 你（獨立於 Telegram）

未設 `HEALTHCHECK_URL` 時自動略過，不影響運作。

---

## 版本規則

版本號使用年月日格式：`V<年>.<月>.<日>`，例如 V2026.06.16。
