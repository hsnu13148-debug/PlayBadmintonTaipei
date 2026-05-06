# 🏸 台北羽球助手 | PlayBadmintonTaipei

## V26.5.6.1

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
