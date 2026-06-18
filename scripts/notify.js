// scripts/notify.js - V2026.06.18
// 空位監看 + 事件記錄 + 搶頭香 + 健康監測 + 熱區迴圈 + 事件觸發密集追蹤。依 watch.json 掃描 /api/all。
//  - mode="holiday"：放假日(含國定假日)全天 + 前一晚通知；抓不到日曆退回週末。mode="rules" 相容。
//  - 搶頭香：某日期第一次進掃描窗→新釋出(場最多)，通知標🆕、優先掃、事件記 nr:1。
//  - 健康監測：連續3輪 API 全撈不到→⚠️警報、恢復→✅；每日台灣09:00後發心跳；可選 HEALTHCHECK_URL。
//  - 熱區迴圈：落在 hotWindows 時間窗內時，改成每 intervalSec 秒密集掃指定 lead 的日期、迴圈到窗結束。
//    （00:00–00:20 掃新釋出+付費過時第二波；20:00–22:00 掃使用日前 1–3 天的退訂。）
//  - 事件觸發密集追蹤（reactiveBurst）：正常輪一旦偵測到 appear（新退訂），立刻針對那些日期切進
//    每 ~60s 的密集 loop，追到它們都被搶走或逾時（預設 10 分）。目的：把「被搶走的時刻」量準。
//    注意：解析度受 /api/all 的 Vercel 快取 s-maxage=60 限制，最細約 60 秒，刻意不繞快取以保護官方 server。
//  - 事件：監看場館全時段 appear/disappear → data/events-YYYY-MM.ndjson（推 data 分支）。
//    disappear 帶 dur(分,自首次偵測)、prec(秒,本次量測不確定度=距上次看到它多久)、burst(1=密集追蹤期間量到)。
// 環境變數：TELEGRAM_BOT_TOKEN、TELEGRAM_CHAT_ID（未設定 dry-run）、HEALTHCHECK_URL（可選）、
//           FORCE_RUN（無視安靜/間隔）、HOT_FORCE=N（測試：強制熱區迴圈跑 N 輪、間隔0）、
//           BURST_TEST=N（測試：密集追蹤間隔歸零、最多 N 輪）。

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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function twToday() {
  const tw = new Date(Date.now() + 8 * 3600 * 1000);
  return new Date(Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate()));
}
function twHourMin() {
  const t = new Date(Date.now() + 8 * 3600 * 1000);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}
function fmtDate(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

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
    fs.appendFileSync(path.join(DATA_DIR, `events-${ym}.ndjson`), events.map(e => JSON.stringify(e)).join('\n') + '\n');
    console.log(`  已寫入 ${events.length} 筆事件`);
  } catch (e) { console.error('寫入事件檔失敗：', e.message); }
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) { console.log('[dry-run] Telegram 訊息：\n' + text); return; }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const j = await res.json();
  if (!j.ok) console.error('Telegram 發送失敗：', JSON.stringify(j)); else console.log('  Telegram 已發送');
}

// 掃一組日期：與 prevSlots 比對發 appear/disappear 事件、發通知。回傳本組的新 slots 與統計。
// disappear 只看「本組有掃的日期」，避免熱區只掃部分日期時把沒掃的誤判成消失。
async function scanCycle(ctx) {
  const { datesToScan, prevSlots, cold, isNewDate, venues, minCourts, today, todayStr, burst } = ctx;
  const observed = [], matches = [];
  let okResp = 0, errResp = 0;
  const scannedSet = new Set(datesToScan.map(a => a.ds));
  for (const ad of datesToScan) {
    const { ds, dow, windows, lead } = ad;
    try {
      const r = await fetch(`${API_BASE}/api/all?date=${ds}`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { console.error(`  ${ds} HTTP ${r.status}`); errResp += venues.length; continue; }
      const j = await r.json();
      for (const v of j.venues || []) {
        if (!venues.includes(v.lid)) continue;
        if (Array.isArray(v.available)) okResp++; else errResp++;
        for (const slot of v.available || []) {
          const courts = slot.courts || 0;
          const key = `${ds}|${v.lid}|${slot.time}`;
          observed.push({ key, ds, dow, lid: v.lid, time: slot.time, courts, lead });
          const startH = parseInt(slot.time.slice(0, 2), 10);
          const hit = windows.some(w => startH >= w.startHour && startH < w.endHour);
          if (hit && courts >= minCourts) matches.push({ key, ds, dow, lid: v.lid, time: slot.time, courts });
        }
      }
    } catch (e) { console.error(`  ${ds} 掃描失敗：${e.message}`); errResp += venues.length; }
    await sleep(500 + Math.floor(Math.random() * 1000));
  }

  const nowIso = new Date().toISOString();
  const observedMap = {};
  observed.forEach(o => { observedMap[o.key] = o; });
  const events = [];
  const appearDates = new Set();
  if (!cold) {
    for (const o of observed) {
      if (!prevSlots[o.key]) {
        const ev = { t: nowIso, ev: 'appear', lid: o.lid, date: o.ds, dow: o.dow, slot: o.time, courts: o.courts, lead: o.lead };
        if (isNewDate(o.ds)) ev.nr = 1;
        events.push(ev);
        appearDates.add(o.ds);
      }
    }
    for (const [key, prev] of Object.entries(prevSlots)) {
      if (observedMap[key]) continue;
      const ds = key.split('|')[0];
      if (!scannedSet.has(ds)) continue; // 本組沒掃 → 不能說它消失
      if (ds < todayStr) continue;
      const dur = prev.since ? +(((Date.now() - prev.since) / 60000).toFixed(1)) : null;
      // prec：本次量測的不確定度（秒）＝距上次看到它多久。越小＝被搶走的時刻量得越準。
      // 受 /api/all 快取 s-maxage=60 限制，實際最細約 60s，故 DataTab 以 prec<=90 視為高精度。
      const prec = prev.last ? Math.round((Date.now() - prev.last) / 1000) : null;
      const [, lid, slot] = key.split('|');
      const lead = Math.round((Date.parse(ds + 'T00:00:00Z') - today.getTime()) / 86400e3);
      const evd = { t: nowIso, ev: 'disappear', lid, date: ds, slot, dur, lead };
      if (prec != null) evd.prec = prec;
      if (burst) evd.burst = 1;
      events.push(evd);
    }
  }
  appendEvents(events);

  const fresh = cold ? [] : matches.filter(m => !prevSlots[m.key]);
  let msgCount = 0;
  if (fresh.length > 0) {
    const byDate = {};
    fresh.forEach(m => { (byDate[m.ds] = byDate[m.ds] || []).push(m); });
    let text = '🏸 發現新空位！\n';
    for (const ds of Object.keys(byDate).sort()) {
      const [y, mo, dd] = ds.split('-').map(Number);
      const dow = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
      const tag = isNewDate(ds) ? ' 🆕新日期釋出（場最多！）' : '';
      text += `\n${mo}/${dd}（${WD[dow]}）${tag}\n`;
      for (const m of byDate[ds]) text += `・${VENUE_NAMES[m.lid] || m.lid} ${m.time}（${m.courts}面）\n`;
      const lids = [...new Set(byDate[ds].map(m => m.lid))];
      for (const lid of lids) text += `→ ${VENUE_NAMES[lid]}預約 https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}\n`;
    }
    if (text.length > 4000) text = text.slice(0, 3990) + '\n…(略)';
    await sendTelegram(text);
    msgCount = 1;
  }

  const newSlots = {};
  const nowMs = Date.now();
  for (const o of observed) newSlots[o.key] = { courts: o.courts, since: prevSlots[o.key]?.since || nowMs, last: nowMs };
  console.log(`  cycle${burst ? '⚡' : ''}：觀測 ${observed.length}、符合 ${matches.length}、fresh ${fresh.length}、ok ${okResp}/err ${errResp}、事件 ${events.length}`);
  return { scannedSet, newSlots, okResp, errResp, freshCount: fresh.length, msgCount, appearDates };
}

// 合併：保留「本輪沒掃且未過期」的日期的舊 slots，覆蓋掃過的日期。
function mergeSlots(liveSlots, res, todayStr) {
  const out = {};
  for (const [k, v] of Object.entries(liveSlots)) {
    const ds = k.split('|')[0];
    if (!res.scannedSet.has(ds) && ds >= todayStr) out[k] = v;
  }
  Object.assign(out, res.newSlots);
  return out;
}

async function main() {
  const force = !!process.env.FORCE_RUN;

  // 安靜時段：台灣 01:00–08:30 不掃描
  const hm0 = twHourMin();
  if (!force && hm0 >= 60 && hm0 < 510) {
    console.log(`台灣 ${String(Math.floor(hm0 / 60)).padStart(2, '0')}:${String(hm0 % 60).padStart(2, '0')}，安靜時段，跳過`);
    return;
  }

  const rawState = loadJson(STATE_FILE, {});
  const st = Array.isArray(rawState) ? { keys: rawState } : rawState;
  const coldStart0 = !st.slots && !st.keys;
  const prevSlots0 = st.slots ? st.slots : Object.fromEntries((st.keys || []).map(k => [k, { courts: 0, since: Date.now() }]));
  const prevScanned = Array.isArray(st.scannedDates) ? st.scannedDates : null;

  const watch = loadJson(WATCH_FILE, {});
  const venues = watch.venues || Object.keys(VENUE_NAMES);
  const rules = watch.rules || [];
  const daysAhead = watch.daysAhead || 14;
  const minCourts = watch.minCourts || 1;
  const mode = watch.mode || (rules.length ? 'rules' : 'holiday');
  const holidayHours = watch.holidayHours || { startHour: 6, endHour: 22 };
  const eveHours = watch.eveBeforeHours || { startHour: 18, endHour: 22 };
  const hotWindows = watch.hotWindows || [];
  const hotJitterSec = watch.hotJitterSec ?? 5;
  const hotMaxMin = watch.hotMaxMin ?? 25;
  const rb = watch.reactiveBurst || {};

  const nowMin = twHourMin();
  const inHotTime = !!process.env.HOT_FORCE || hotWindows.some(w => nowMin >= w.startMin && nowMin < w.endMin);

  // 間隔閘（熱區時間不套用，要立刻開掃）
  if (!force && !inHotTime && st.lastRun && st.nextGap) {
    const elapsedMin = (Date.now() - st.lastRun) / 60000;
    if (elapsedMin < st.nextGap) {
      console.log(`距上次 ${elapsedMin.toFixed(1)} 分 < 間隔 ${st.nextGap.toFixed(1)} 分，跳過`);
      return;
    }
  }
  // 抖動（熱區不抖，要準時）
  if (!process.env.NO_JITTER && !inHotTime) {
    const jitter = Math.floor(Math.random() * 60000);
    console.log(`隨機延遲 ${Math.round(jitter / 1000)} 秒`);
    await sleep(jitter);
  }

  const today = twToday();
  const todayStr = fmtDate(today);

  let holidaySet = null;
  if (mode === 'holiday') {
    const yrs = new Set();
    for (let i = 0; i <= daysAhead; i++) yrs.add(new Date(today.getTime() + i * 86400e3).getUTCFullYear());
    holidaySet = await loadHolidaySet([...yrs], watch.calendarUrlTemplate || DEFAULT_CAL);
    console.log(holidaySet ? `日曆載入：${holidaySet.size} 個放假日` : '日曆載入失敗 → 退回週末');
  }
  const isHol = (d) => {
    if (mode === 'holiday' && holidaySet) return holidaySet.has(fmtDate(d));
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  };

  const activeDates = [];
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today.getTime() + i * 86400e3);
    let windows = [], kind = '';
    if (mode === 'holiday') {
      const next = new Date(d.getTime() + 86400e3);
      if (isHol(d)) { windows = [holidayHours]; kind = '假日'; }
      else if (isHol(next)) { windows = [eveHours]; kind = '前一晚'; }
    } else {
      const dow = d.getUTCDay();
      windows = rules.filter(r => (r.days || []).includes(dow)).map(r => ({ startHour: r.startHour ?? 0, endHour: r.endHour ?? 24 }));
      if (windows.length) kind = '規則';
    }
    if (windows.length) {
      const lead = Math.round((d.getTime() - today.getTime()) / 86400e3);
      activeDates.push({ d, ds: fmtDate(d), dow: d.getUTCDay(), windows, kind, lead });
    }
  }
  const isNewDate = (ds) => !!prevScanned && !prevScanned.includes(ds);
  activeDates.sort((a, b) => (isNewDate(b.ds) ? 1 : 0) - (isNewDate(a.ds) ? 1 : 0));
  console.log(`監看日期：${activeDates.map(a => `${a.ds}(${a.kind}${isNewDate(a.ds) ? '🆕' : ''})`).join(', ') || '（無）'}`);

  // 決定熱區
  let hw = hotWindows.find(w => nowMin >= w.startMin && nowMin < w.endMin);
  let hotDates = hw ? activeDates.filter(a => a.lead >= (hw.leadMin ?? 0) && a.lead <= (hw.leadMax ?? 99)) : [];
  let hotMode = !!(hw && hotDates.length);
  let intervalSec = hw ? (hw.intervalSec ?? 30) : 30;
  let maxIters = Math.max(1, Math.floor((hotMaxMin * 60) / Math.max(intervalSec, 5)));
  if (process.env.HOT_FORCE) { hotMode = true; hotDates = activeDates; intervalSec = 0; maxIters = parseInt(process.env.HOT_FORCE) || 3; hw = hw || { name: 'TEST', endMin: 99999 }; }
  if (process.env.HOT_TEST) { intervalSec = 0; maxIters = Math.min(maxIters, parseInt(process.env.HOT_TEST) || 3); } // 測試：限輪數、間隔歸零

  let liveSlots = prevSlots0;
  let cold = coldStart0;
  let totalOk = 0, totalErr = 0, totalFresh = 0, totalMsgs = 0, iters = 0;

  const ctxBase = { isNewDate, venues, minCourts, today, todayStr };

  if (hotMode) {
    console.log(`🔥 熱區迴圈「${hw.name || ''}」：掃 ${hotDates.map(a => a.ds).join(',')}，每 ${intervalSec}s，上限 ${maxIters} 輪`);
    while (iters < maxIters) {
      const res = await scanCycle({ ...ctxBase, datesToScan: hotDates, prevSlots: liveSlots, cold });
      liveSlots = mergeSlots(liveSlots, res, todayStr);
      totalOk += res.okResp; totalErr += res.errResp; totalFresh += res.freshCount; totalMsgs += res.msgCount;
      cold = false; iters++;
      // 每輪寫回狀態（崩潰安全）
      fs.writeFileSync(STATE_FILE, JSON.stringify({ slots: liveSlots, scannedDates: activeDates.map(a => a.ds), health: st.health || {}, lastRun: Date.now(), nextGap: 5 + Math.random() * 10 }));
      if (iters >= maxIters) break;
      if (!process.env.HOT_FORCE && twHourMin() >= hw.endMin) break;
      if (intervalSec > 0) {
        const sleepSec = Math.max(5, intervalSec + (Math.random() * 2 - 1) * hotJitterSec);
        await sleep(sleepSec * 1000);
      }
    }
    console.log(`熱區迴圈結束：${iters} 輪、fresh 共 ${totalFresh}`);
  } else {
    const res = await scanCycle({ ...ctxBase, datesToScan: activeDates, prevSlots: liveSlots, cold });
    liveSlots = mergeSlots(liveSlots, res, todayStr);
    totalOk = res.okResp; totalErr = res.errResp; totalFresh = res.freshCount; totalMsgs = res.msgCount; iters = 1;

    // ── 事件觸發密集追蹤（reactiveBurst）──
    // 本輪（正常掃描）若冒出新退訂，就針對那些日期密集追到被搶走或逾時，把「被搶走時刻」量準。
    // 冷啟動只建狀態不追；HOT_FORCE 測試模式下交給熱區邏輯、這裡略過。
    const rbEnabled = rb.enabled !== false;
    if (rbEnabled && !cold && !process.env.HOT_FORCE && res.appearDates && res.appearDates.size > 0) {
      const burstSet = res.appearDates;
      const burstDates = activeDates.filter(a => burstSet.has(a.ds));
      const bInterval = Math.max(60, rb.intervalSec ?? 65);     // 不低於 60（快取下限）
      const bMaxMin = rb.maxMin ?? 10;
      const bJitter = rb.jitterSec ?? 5;
      let bMaxIters = Math.max(1, Math.floor((bMaxMin * 60) / bInterval));
      let zeroInterval = false;
      if (process.env.BURST_TEST) { zeroInterval = true; bMaxIters = Math.min(bMaxIters, parseInt(process.env.BURST_TEST) || 3); }
      const burstEndAt = Date.now() + bMaxMin * 60000;
      // 監看集：這些日期上目前還開著的空位。全部被搶走（或逾時）就結束。
      const liveCount = () => Object.keys(liveSlots).filter(k => burstSet.has(k.split('|')[0])).length;
      console.log(`⚡ 事件觸發密集追蹤：${[...burstSet].join(',')}，每 ~${bInterval}s，上限 ${bMaxMin} 分（${bMaxIters} 輪），起始開著 ${liveCount()} 個`);
      let bIter = 0;
      while (bIter < bMaxIters && liveCount() > 0 && (zeroInterval || Date.now() < burstEndAt)) {
        if (!zeroInterval) {
          const sleepSec = Math.max(60, bInterval + (Math.random() * 2 - 1) * bJitter);
          if (Date.now() + sleepSec * 1000 > burstEndAt) break;
          await sleep(sleepSec * 1000);
        }
        const r2 = await scanCycle({ ...ctxBase, datesToScan: burstDates, prevSlots: liveSlots, cold: false, burst: true });
        liveSlots = mergeSlots(liveSlots, r2, todayStr);
        totalOk += r2.okResp; totalErr += r2.errResp; totalFresh += r2.freshCount; totalMsgs += r2.msgCount;
        bIter++; iters++;
        // 每輪寫回狀態（崩潰安全）
        fs.writeFileSync(STATE_FILE, JSON.stringify({ slots: liveSlots, scannedDates: activeDates.map(a => a.ds), health: st.health || {}, lastRun: Date.now(), nextGap: 5 + Math.random() * 10 }));
      }
      console.log(`密集追蹤結束：${bIter} 輪、剩 ${liveCount()} 個未被搶走`);
    }
  }

  // ── 健康監測（整輪一次）──
  const health = (st.health && typeof st.health === 'object') ? st.health : { lastHbDay: null, notifsSinceHb: 0, apiFailStreak: 0, apiAlerted: false };
  health.notifsSinceHb = (health.notifsSinceHb || 0) + totalMsgs;
  const apiEvaluable = (hotMode ? hotDates.length : activeDates.length) > 0;
  const apiOk = totalOk > 0;
  if (apiEvaluable) {
    if (!apiOk) {
      health.apiFailStreak = (health.apiFailStreak || 0) + 1;
      console.warn(`API 異常：ok ${totalOk}/err ${totalErr}，連續 ${health.apiFailStreak} 輪`);
      if (health.apiFailStreak >= 3 && !health.apiAlerted) {
        await sendTelegram(`⚠️ 羽球雷達警告\n官方訂場 API 連續 ${health.apiFailStreak} 輪撈不到任何資料，雷達可能已失效。\n請檢查 booking-tpsc.sporetrofit.com 是否改版，或看 GitHub Actions log。`);
        health.apiAlerted = true;
      }
    } else {
      if (health.apiAlerted) await sendTelegram(`✅ 羽球雷達恢復\n官方 API 已恢復正常（本輪 ${totalOk} 個場館回應）。`);
      health.apiFailStreak = 0; health.apiAlerted = false;
    }
  }
  // 每日心跳（台灣 09:00 後第一輪）
  if (twHourMin() >= 540 && health.lastHbDay !== todayStr) {
    const kinds = activeDates.map(a => a.kind);
    const nNew = activeDates.filter(a => isNewDate(a.ds)).length;
    const scope = activeDates.length
      ? `目前監看 ${activeDates.length} 天（假日 ${kinds.filter(k => k === '假日').length}、前一晚 ${kinds.filter(k => k === '前一晚').length}${nNew ? `、🆕新釋出 ${nNew}` : ''}）`
      : '近 14 天無假日可監看';
    await sendTelegram(`✅ 羽球雷達運作中\n${scope}\nAPI ${apiOk ? '正常' : '⚠️異常'}${holidaySet ? '' : '｜日曆退回週末模式'}\n過去一天發出 ${health.notifsSinceHb || 0} 則空位通知`);
    health.lastHbDay = todayStr; health.notifsSinceHb = 0;
  }
  // 可選 dead-man's-switch
  if (apiOk && process.env.HEALTHCHECK_URL) {
    try { await fetch(process.env.HEALTHCHECK_URL, { signal: AbortSignal.timeout(8000) }); console.log('healthcheck 已 ping'); }
    catch (e) { console.error('healthcheck ping 失敗：', e.message); }
  }

  // 最終寫回狀態
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    slots: liveSlots,
    scannedDates: activeDates.map(a => a.ds),
    health,
    lastRun: Date.now(),
    nextGap: 5 + Math.random() * 10,
  }));
  console.log(`state.json 已更新（${Object.keys(liveSlots).length} 時段、${iters} 輪、apiFailStreak ${health.apiFailStreak}）`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
module.exports = { scanCycle, mergeSlots, main };
