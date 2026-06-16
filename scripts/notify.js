// scripts/notify.js - V2026.06.16
// 空位監看 + 事件記錄：依 watch.json 條件掃描 /api/all。
//  1) 發現「新」空位（符合通知規則）時發 Telegram 通知。
//  2) 記錄所有監看場館「全時段」的 appear / disappear 事件到 data/events-YYYY-MM.ndjson，
//     供 App 的「數據」分頁分析（退訂釋出時刻、撿場速度、熱力圖、搶頭香規律）。
//
// 狀態存在 state.json（由 GitHub Actions cache 保存）：記住每個時段上次的 courts 與首次出現時間。
// 事件檔 commit 進 repo，長期累積。
// 環境變數：TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID（未設定時只印出結果，不發通知）

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'https://play-badminton-taipei.vercel.app';
const STATE_FILE = path.join(process.cwd(), 'state.json');
const WATCH_FILE = path.join(__dirname, '..', 'watch.json');
const DATA_DIR = path.join(process.cwd(), 'data');

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

// 事件以 NDJSON 逐行 append，依「偵測月份」分檔（台灣時間），檔案累積在 repo。
function appendEvents(events) {
  if (!events.length) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tw = new Date(Date.now() + 8 * 3600 * 1000);
    const ym = `${tw.getUTCFullYear()}-${String(tw.getUTCMonth() + 1).padStart(2, '0')}`;
    const file = path.join(DATA_DIR, `events-${ym}.ndjson`);
    fs.appendFileSync(file, events.map(e => JSON.stringify(e)).join('\n') + '\n');
    console.log(`已寫入 ${events.length} 筆事件 → data/events-${ym}.ndjson`);
  } catch (e) {
    console.error('寫入事件檔失敗：', e.message);
  }
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
  const force = !!process.env.FORCE_RUN; // 手動觸發時無視安靜時段與間隔

  // 安靜時段：台灣時間 01:00–08:30 不掃描
  const twNow = new Date(Date.now() + 8 * 3600 * 1000);
  const hm = twNow.getUTCHours() * 60 + twNow.getUTCMinutes();
  if (!force && hm >= 60 && hm < 510) {
    console.log(`台灣時間 ${String(twNow.getUTCHours()).padStart(2, '0')}:${String(twNow.getUTCMinutes()).padStart(2, '0')}，安靜時段（01:00–08:30），本輪跳過`);
    return;
  }

  // 隨機間隔 5–15 分鐘：cron 每 5 分鐘醒來，但只有距上次掃描超過抽到的間隔才真的跑
  const rawState = loadJson(STATE_FILE, {});
  // 相容舊格式：陣列 → {keys}; {keys:[...]} → 轉成 slots map
  const st = Array.isArray(rawState) ? { keys: rawState } : rawState;
  const coldStart = !st.slots && !st.keys; // 全新狀態：本輪只建檔，不發 appear 事件（避免冷啟動爆量假釋出）
  const prevSlots = st.slots
    ? st.slots
    : Object.fromEntries((st.keys || []).map(k => [k, { courts: 0, since: Date.now() }]));

  if (!force && st.lastRun && st.nextGap) {
    const elapsedMin = (Date.now() - st.lastRun) / 60000;
    if (elapsedMin < st.nextGap) {
      console.log(`距上次掃描 ${elapsedMin.toFixed(1)} 分，未達本輪間隔 ${st.nextGap.toFixed(1)} 分，跳過`);
      return;
    }
  }

  // 小抖動 0–60 秒
  if (!process.env.NO_JITTER) {
    const jitter = Math.floor(Math.random() * 60000);
    console.log(`隨機延遲 ${Math.round(jitter / 1000)} 秒`);
    await new Promise(r => setTimeout(r, jitter));
  }

  const watch = loadJson(WATCH_FILE, {});
  const venues = watch.venues || Object.keys(VENUE_NAMES);
  const rules = watch.rules || [];
  const daysAhead = watch.daysAhead || 14;
  const minCourts = watch.minCourts || 1;

  const today = twToday();
  const todayStr = fmtDate(today);
  const dates = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400e3);
    if (rules.some(r => (r.days || []).includes(d.getUTCDay()))) dates.push(d);
  }
  console.log(`監看日期：${dates.map(fmtDate).join(', ')}`);

  // 掃描：observed = 監看場館的「全時段」可預約空位（事件記錄用）
  //       matches  = 其中符合通知規則（時段+面數）的子集（Telegram 通知用）
  const observed = [];   // { key, ds, dow, lid, time, courts, lead }
  const matches = [];
  for (const d of dates) {
    const ds = fmtDate(d);
    const dow = d.getUTCDay();
    const lead = Math.round((d.getTime() - today.getTime()) / 86400e3); // 距今幾天（搶頭香判斷）
    const dayRules = rules.filter(r => (r.days || []).includes(dow));
    try {
      const r = await fetch(`${API_BASE}/api/all?date=${ds}`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { console.error(`${ds} HTTP ${r.status}`); continue; }
      const j = await r.json();
      for (const v of j.venues || []) {
        if (!venues.includes(v.lid)) continue;
        for (const slot of v.available || []) {
          const courts = slot.courts || 0;
          const key = `${ds}|${v.lid}|${slot.time}`;
          observed.push({ key, ds, dow, lid: v.lid, time: slot.time, courts, lead });
          const startH = parseInt(slot.time.slice(0, 2), 10);
          const hit = dayRules.some(rl => startH >= (rl.startHour ?? 0) && startH < (rl.endHour ?? 24));
          if (hit && courts >= minCourts) {
            matches.push({ key, ds, dow, lid: v.lid, time: slot.time, courts });
          }
        }
      }
    } catch (e) {
      console.error(`${ds} 掃描失敗：${e.message}`);
    }
    await new Promise(res => setTimeout(res, 500 + Math.floor(Math.random() * 1000)));
  }
  console.log(`觀測空位：${observed.length} 筆，其中符合通知條件：${matches.length} 筆`);

  // ── 事件偵測：與上一輪的 prevSlots 比對 ──────────────────────────────
  const nowIso = new Date().toISOString();
  const observedMap = {};
  observed.forEach(o => { observedMap[o.key] = o; });
  const events = [];

  if (!coldStart) {
    // appear：本輪有、上輪沒有
    for (const o of observed) {
      if (!prevSlots[o.key]) {
        events.push({ t: nowIso, ev: 'appear', lid: o.lid, date: o.ds, dow: o.dow, slot: o.time, courts: o.courts, lead: o.lead });
      }
    }
    // disappear：上輪有、本輪沒有，且該日期仍在可掃描範圍內（排除「過期下架」的假消失）
    for (const [key, prev] of Object.entries(prevSlots)) {
      if (observedMap[key]) continue;
      const dateStr = key.split('|')[0];
      if (dateStr < todayStr) continue; // 日期已過 → 自然下架，非被搶
      const dur = prev.since ? +(((Date.now() - prev.since) / 60000).toFixed(1)) : null;
      const [, lid, slot] = key.split('|');
      const lead = Math.round((Date.parse(dateStr + 'T00:00:00Z') - today.getTime()) / 86400e3);
      events.push({ t: nowIso, ev: 'disappear', lid, date: dateStr, slot, dur, lead });
    }
  } else {
    console.log('冷啟動：本輪僅建立狀態，不記錄 appear 事件');
  }
  console.log(`事件：appear ${events.filter(e => e.ev === 'appear').length}、disappear ${events.filter(e => e.ev === 'disappear').length}`);
  appendEvents(events);

  // ── Telegram 通知：只通知「新出現且符合規則」的空位 ──────────────────
  const fresh = coldStart ? [] : matches.filter(m => !prevSlots[m.key]);
  console.log(`其中新出現（通知）：${fresh.length} 筆`);

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

  // ── 寫回狀態：保存目前所有 observed 的 courts 與首次出現時間（since） ──
  const nextGap = 5 + Math.random() * 10; // 下次間隔 5–15 分鐘
  const newSlots = {};
  for (const o of observed) {
    newSlots[o.key] = {
      courts: o.courts,
      since: prevSlots[o.key]?.since || Date.now(), // 沿用首次出現時間，供 disappear 計算 dur
    };
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({ slots: newSlots, lastRun: Date.now(), nextGap }));
  console.log(`state.json 已更新（${Object.keys(newSlots).length} 個時段），下次間隔 ${nextGap.toFixed(1)} 分`);
}

main().catch(e => { console.error(e); process.exit(1); });
