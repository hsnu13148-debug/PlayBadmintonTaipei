// scripts/notify.js - V2026.06.16c
// 空位監看 + 事件記錄 + 搶頭香標記。依 watch.json 掃描 /api/all。
//  - mode="holiday"（預設）：放假日（含國定假日，依官方辦公日曆 isHoliday）全天通知；
//    放假日的「前一天」（若本身非放假日，如連假前的上班日）通知 eveBeforeHours 時段。
//    日曆抓不到時自動退回「週末全天 + 週六前一晚(週五)」。
//  - mode="rules"：舊版 days/時段規則（向後相容）。
//  搶頭香：state 記 scannedDates；某日期「第一次進入掃描窗」→ 其空位是「新日期釋出」(場最多)，
//    通知標 🆕、優先掃、事件記 nr:1；已在窗內的日期冒空位＝退訂。冷啟動不標記。
//  通知：發現「新出現且符合條件」的空位發 Telegram。
//  事件：記錄監看場館全時段 appear/disappear → data/events-YYYY-MM.ndjson（推 data 分支）。
// 環境變數：TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID（未設定時 dry-run）。

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'https://play-badminton-taipei.vercel.app';
const STATE_FILE = path.join(process.cwd(), 'state.json');
const WATCH_FILE = path.join(__dirname, '..', 'watch.json');
const DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_CAL = 'https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar@master/data/{year}.json';

const VENUE_NAMES = {
  JJSC: '中正', NHSC: '內湖', WSSC: '文山', DASC: '大安',
  SLSC: '士林', WHSC: '萬華', BTSC: '北投',
};
const WD = ['日', '一', '二', '三', '四', '五', '六'];

function twToday() {
  const tw = new Date(Date.now() + 8 * 3600 * 1000);
  return new Date(Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate()));
}

function fmtDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

// 抓官方辦公日曆，回傳「放假日」字串 Set（YYYY-MM-DD）。全抓失敗回 null（呼叫端退回週末）。
async function loadHolidaySet(years, tmpl) {
  const set = new Set();
  let ok = false;
  for (const y of years) {
    try {
      const r = await fetch(tmpl.replace('{year}', y), { signal: AbortSignal.timeout(15000) });
      if (!r.ok) { console.error(`日曆 ${y} HTTP ${r.status}`); continue; }
      const arr = await r.json();
      for (const e of arr) {
        if (e && e.isHoliday && e.date && e.date.length === 8) {
          set.add(`${e.date.slice(0, 4)}-${e.date.slice(4, 6)}-${e.date.slice(6, 8)}`);
        }
      }
      ok = true;
    } catch (e) { console.error(`日曆 ${y} 抓取失敗：${e.message}`); }
  }
  return ok ? set : null;
}

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
  const force = !!process.env.FORCE_RUN;

  // 安靜時段：台灣時間 01:00–08:30 不掃描
  const twNow = new Date(Date.now() + 8 * 3600 * 1000);
  const hm = twNow.getUTCHours() * 60 + twNow.getUTCMinutes();
  if (!force && hm >= 60 && hm < 510) {
    console.log(`台灣時間 ${String(twNow.getUTCHours()).padStart(2, '0')}:${String(twNow.getUTCMinutes()).padStart(2, '0')}，安靜時段（01:00–08:30），本輪跳過`);
    return;
  }

  // 隨機間隔 5–15 分鐘
  const rawState = loadJson(STATE_FILE, {});
  const st = Array.isArray(rawState) ? { keys: rawState } : rawState;
  const coldStart = !st.slots && !st.keys;
  const prevSlots = st.slots
    ? st.slots
    : Object.fromEntries((st.keys || []).map(k => [k, { courts: 0, since: Date.now() }]));
  const prevScanned = Array.isArray(st.scannedDates) ? st.scannedDates : null; // 上輪掃過的日期（搶頭香判斷）

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
  const mode = watch.mode || (rules.length ? 'rules' : 'holiday');
  const holidayHours = watch.holidayHours || { startHour: 6, endHour: 22 };
  const eveHours = watch.eveBeforeHours || { startHour: 18, endHour: 22 };

  const today = twToday();
  const todayStr = fmtDate(today);

  // 假日模式：載入官方日曆（涵蓋 window + 隔天）
  let holidaySet = null;
  if (mode === 'holiday') {
    const yrs = new Set();
    for (let i = 0; i <= daysAhead; i++) yrs.add(new Date(today.getTime() + i * 86400e3).getUTCFullYear());
    holidaySet = await loadHolidaySet([...yrs], watch.calendarUrlTemplate || DEFAULT_CAL);
    console.log(holidaySet ? `日曆載入：${holidaySet.size} 個放假日` : '日曆載入失敗 → 退回週末模式');
  }
  const isHol = (d) => {
    if (mode === 'holiday' && holidaySet) return holidaySet.has(fmtDate(d));
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6; // 退回：週末
  };

  // 決定要掃的日期與各自的時段窗
  const activeDates = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400e3);
    let windows = [];
    let kind = '';
    if (mode === 'holiday') {
      const next = new Date(d.getTime() + 86400e3);
      if (isHol(d)) { windows = [holidayHours]; kind = '假日'; }
      else if (isHol(next)) { windows = [eveHours]; kind = '前一晚'; }
    } else {
      const dow = d.getUTCDay();
      windows = rules.filter(r => (r.days || []).includes(dow))
        .map(r => ({ startHour: r.startHour ?? 0, endHour: r.endHour ?? 24 }));
      if (windows.length) kind = '規則';
    }
    if (windows.length) activeDates.push({ d, ds: fmtDate(d), dow: d.getUTCDay(), windows, kind });
  }

  // 搶頭香：某日期上輪沒掃過（第一次進窗）→ 新釋出。冷啟動或無 prevScanned 時不標記。
  const isNewDate = (ds) => !!prevScanned && !prevScanned.includes(ds);
  // 優先掃新釋出的日期（剛進 14 天窗，場最多）
  activeDates.sort((a, b) => (isNewDate(b.ds) ? 1 : 0) - (isNewDate(a.ds) ? 1 : 0));
  console.log(`監看日期：${activeDates.map(a => `${a.ds}(${a.kind}${isNewDate(a.ds) ? '🆕' : ''})`).join(', ') || '（無）'}`);

  // 掃描：observed = 監看場館全時段空位；matches = 符合時段窗+面數的子集
  const observed = [];
  const matches = [];
  for (const ad of activeDates) {
    const { d, ds, dow, windows } = ad;
    const lead = Math.round((d.getTime() - today.getTime()) / 86400e3);
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
          const hit = windows.some(w => startH >= w.startHour && startH < w.endHour);
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

  // 事件偵測
  const nowIso = new Date().toISOString();
  const observedMap = {};
  observed.forEach(o => { observedMap[o.key] = o; });
  const events = [];

  if (!coldStart) {
    for (const o of observed) {
      if (!prevSlots[o.key]) {
        const ev = { t: nowIso, ev: 'appear', lid: o.lid, date: o.ds, dow: o.dow, slot: o.time, courts: o.courts, lead: o.lead };
        if (isNewDate(o.ds)) ev.nr = 1; // 搶頭香：新日期釋出
        events.push(ev);
      }
    }
    for (const [key, prev] of Object.entries(prevSlots)) {
      if (observedMap[key]) continue;
      const dateStr = key.split('|')[0];
      if (dateStr < todayStr) continue;
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

  // Telegram 通知（新日期釋出的日期標 🆕）
  const fresh = coldStart ? [] : matches.filter(m => !prevSlots[m.key]);
  console.log(`其中新出現（通知）：${fresh.length} 筆`);

  if (fresh.length > 0) {
    const byDate = {};
    fresh.forEach(m => { (byDate[m.ds] = byDate[m.ds] || []).push(m); });
    let text = '🏸 發現新空位！\n';
    for (const ds of Object.keys(byDate).sort()) {
      const [y, mo, dd] = ds.split('-').map(Number);
      const dow = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
      const tag = isNewDate(ds) ? ' 🆕新日期釋出（場最多！）' : '';
      text += `\n${mo}/${dd}（${WD[dow]}）${tag}\n`;
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

  // 寫回狀態（含 scannedDates 供下輪判斷搶頭香）
  const nextGap = 5 + Math.random() * 10;
  const newSlots = {};
  for (const o of observed) {
    newSlots[o.key] = {
      courts: o.courts,
      since: prevSlots[o.key]?.since || Date.now(),
    };
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    slots: newSlots,
    scannedDates: activeDates.map(a => a.ds),
    lastRun: Date.now(),
    nextGap,
  }));
  console.log(`state.json 已更新（${Object.keys(newSlots).length} 個時段、${activeDates.length} 個日期），下次間隔 ${nextGap.toFixed(1)} 分`);
}

main().catch(e => { console.error(e); process.exit(1); });
