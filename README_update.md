# V26.5.6.2 更新說明

## 主要改動
- `api/slots.js`：改用真正的 AJAX API `findAllowBookingList`
  - 直接回傳可預約時段，不用解析 HTML
  - 不需要翻頁，一次拿齊
  - 加入正確的 XHR headers

## 上傳方式
把以下檔案上傳到 GitHub（覆蓋舊的）：
- `api/slots.js` ← 最重要
- `src/App.jsx`
