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
（預設：放假日含國定假日全天、放假日前一晚 18:00–22:00、7 個場館）發現**新**空位時發 Telegram 通知。

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

官方系統沒有歷史 API，所以