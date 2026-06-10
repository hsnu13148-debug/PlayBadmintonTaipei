// scripts/notify.js - V2026.06.11
// 空位監看：依 watch.json 條件掃描 /api/all，發現「新」空位時發 Telegram 通知。
// 狀態存在 state.json（由 GitHub Actions cache 保存），只通知上次沒看過的空位。
// 環境變數：TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID（未設定時只印出結果，不發通知）

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'https://play-badminton-taipei.vercel.app';
const STATE_FILE = path.join(process.cwd(), 'state.json');
const WATCH_FILE = path.join(__dirname, '..', 'watch.json');

const VENUE_NAMES = {
  JJSC: '中正', NHSC: '內湖', WSSC: '文山', DASC: '大安',
  SLSC: '士林', WHSC: '萬華', BTSC: '北投',
};
const WD = ['日', '一', '二', '三', '四', '五', '六'];

function twToday() {
  // GitHub Actions 跑在 UTC，轉成台灣時間 (UTC+8) 的當天日期
  const tw = new Date(Date.now() + 8 * 3600 * 1000);
  return new Date(Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate()));
}

function fmtDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log('[dry-run] Telegram 未設定，訊息內容：\n' + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const j = await res.json();
  if (!j.ok) console.error('Telegram 發送失敗：', JSON.stringify(j));
  else console.log('Telegram 已發送');
}

async function main() {
  const watch = loadJson(WATCH_FILE, {});
  const venues = watch.venues || Object.keys(VENUE_NAMES);
  const rules = watch.rules || [];
  const daysAhead = watch.daysAhead || 14;
  const minCourts = watch.minCourts || 1;

  const today = twToday();
  const dates = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400e3);
    if (rules.some(r => (r.days || []).includes(d.getUTCDay()))) dates.push(d);
  }
  console.log(`監看日期：${dates.map(fmtDate).join(', ')}`);

  // 掃描
  const matches = []; // {key, ds, day, lid, time, courts}
  for (const d of dates) {
    const ds = fmtDate(d);
    const dow = d.getUTCDay();
    const dayRules = rules.filter(r => (r.days || []).includes(dow));
    try {
      const r = await fetch(`${API_BASE}/api/all?date=${ds}`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { console.error(`${ds} HTTP ${r.status}`); continue; }
      const j = await r.json();
      for (const v of j.venues || []) {
        if (!venues.includes(v.lid)) continue;
        for (const slot of v.available || []) {
          const startH = parseInt(slot.time.slice(0, 2), 10);
          const hit = dayRules.some(rl => startH >= (rl.startHour ?? 0) && startH < (rl.endHour ?? 24));
          if (hit && (slot.courts || 0) >= minCourts) {
            matches.push({ key: `${ds}|${v.lid}|${slot.time}`, ds, dow, lid: v.lid, time: slot.time, courts: slot.courts });
          }
        }
      }
    } catch (e) {
      console.error(`${ds} 掃描失敗：${e.message}`);
    }
    await new Promise(res => setTimeout(res, 500));
  }
  console.log(`符合條件空位：${matches.length} 筆`);

  // 與上次狀態比對，只通知新出現的
  const prev = new Set(loadJson(STATE_FILE, []));
  const fresh = matches.filter(m => !prev.has(m.key));
  console.log(`其中新出現：${fresh.length} 筆`);

  if (fresh.length > 0) {
    const byDate = {};
    fresh.forEach(m => { (byDate[m.ds] = byDate[m.ds] || []).push(m); });
    let text = '🏸 發現新空位！\n';
    for (const ds of Object.keys(byDate).sort()) {
      const [y, mo, dd] = ds.split('-').map(Number);
      const dow = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
      text += `\n${mo}/${dd}（${WD[dow]}）\n`;
      for (const m of byDate[ds]) {
        text += `・${VENUE_NAMES[m.lid] || m.lid} ${m.time}（${m.courts}面）\n`;
      }
      const lids = [...new Set(byDate[ds].map(m => m.lid))];
      for (const lid of lids) {
        text += `→ ${VENUE_NAMES[lid]}預約 https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}\n`;
      }
    }
    if (text.length > 4000) text = text.slice(0, 3990) + '\n…(略)';
    await sendTelegram(text);
  }

  // 寫回狀態：保存目前所有符合條件的 key（含已通知過的），自動淘汰過期日期
  fs.writeFileSync(STATE_FILE, JSON.stringify(matches.map(m => m.key)));
  console.log('state.json 已更新');
}

main().catch(e => { console.error(e); process.exit(1); });
