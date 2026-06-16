import React, { useState, useEffect } from "react";

// ── 數據分頁：讀 data 分支累積的事件，做退訂規律分析 ───────────────────────
// 事件來源：notify.js 每輪掃描寫入 data/events-YYYY-MM.ndjson，推到 repo 的 data 分支。
// 純前端計算，無後端。資料只能從上線後往前累積（官方無歷史 API）。

const WD = ["日", "一", "二", "三", "四", "五", "六"];
const DAY_COLOR = ["#a855f7","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#6366f1"];
const VENUE_NAMES = { JJSC:"中正", NHSC:"內湖", WSSC:"文山", DASC:"大安", SLSC:"士林", WHSC:"萬華", BTSC:"北投" };
const REPO = "hsnu13148-debug/PlayBadmintonTaipei";

function monthKeys() {
  const now = new Date(), keys = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

async function loadEvents() {
  const out = [];
  for (const ym of monthKeys()) {
    const url = `https://raw.githubusercontent.com/${REPO}/data/data/events-${ym}.ndjson?t=${Date.now()}`;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const text = await r.text();
      text.split("\n").forEach(line => {
        const s = line.trim();
        if (!s) return;
        try { out.push(JSON.parse(s)); } catch (e) {}
      });
    } catch (e) {}
  }
  return out;
}

const startHour = slot => parseInt(String(slot).slice(0, 2), 10);
const twHour = t => new Date(t).getHours();
const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDur = mins => {
  if (mins == null) return "—";
  if (mins < 60) return `${Math.round(mins)} 分`;
  return `${(mins / 60).toFixed(1)} 小時`;
};

const card = { background:"#0f1923", border:"1px solid #1e293b", borderRadius:13, padding:"13px 13px 15px", marginBottom:12 };
const title = { fontSize:13, fontWeight:700, marginBottom:3, color:"#e2e8f0" };
const sub = { fontSize:10, color:"#64748b", marginBottom:10, lineHeight:1.5 };

function Loading() {
  return <div style={{textAlign:"center", color:"#64748b", fontSize:13, padding:"50px 20px"}}>
    <span style={{display:"inline-block", animation:"spin 1s linear infinite", marginRight:6}}>⟳</span>讀取數據中…
    <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
  </div>;
}

function EmptyState() {
  return <div style={card}>
    <div style={title}>📊 數據累積中</div>
    <div style={{fontSize:12, color:"#94a3b8", lineHeight:1.8, marginTop:6}}>
      官方系統沒有歷史資料，所以這裡的統計要從監看上線後一筆一筆累積。
      監看雷達每 5–15 分鐘掃一次，記錄每個時段「冒出空位」與「被搶走」的事件。
      <br/><br/>
      累積約 1–2 週後，這裡會自動長出：
      <div style={{marginTop:8, color:"#cbd5e1"}}>
        ・🔥 熱力圖：星期 × 時段，哪格最常冒退訂<br/>
        ・⏰ 退訂釋出時刻：一天中幾點最容易撿到<br/>
        ・⚡ 撿場速度：空位平均多久被搶走<br/>
        ・🏟 場館排名：哪個場館退訂最多
      </div>
    </div>
  </div>;
}

function Bars({ data, color }) {
  // data: [{label, value, sub}]
  const max = Math.max(1, ...data.map(d => d.value));
  return <div style={{display:"flex", flexDirection:"column", gap:5}}>
    {data.map((d, i) => (
      <div key={i} style={{display:"flex", alignItems:"center", gap:8}}>
        <span style={{fontSize:11, color:"#94a3b8", minWidth:52, textAlign:"right"}}>{d.label}</span>
        <div style={{flex:1, height:16, background:"#0a1018", borderRadius:5, overflow:"hidden"}}>
          <div style={{width:`${(d.value / max) * 100}%`, height:"100%", background:color, borderRadius:5, minWidth:d.value>0?3:0}}/>
        </div>
        <span style={{fontSize:11, color:"#cbd5e1", minWidth:54}}>{d.sub != null ? d.sub : d.value}</span>
      </div>
    ))}
  </div>;
}

export default function DataTab() {
  const [events, setEvents] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    loadEvents().then(ev => { if (alive) setEvents(ev); }).catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  if (err) return <div style={card}><div style={title}>讀取失敗</div><div style={sub}>稍後再試，或確認 data 分支已建立。</div></div>;
  if (events === null) return <Loading/>;

  const appears = events.filter(e => e.ev === "appear");
  const disappears = events.filter(e => e.ev === "disappear");
  if (!appears.length && !disappears.length) return <EmptyState/>;

  // ── 涵蓋範圍 ──
  const times = events.map(e => +new Date(e.t)).filter(Boolean);
  const since = times.length ? new Date(Math.min(...times)) : null;
  const days = since ? Math.max(1, Math.round((Date.now() - +since) / 86400e3)) : 0;

  // ── 熱力圖：星期 × 起始時段 appear 次數 ──
  const heat = {};            // dow -> hour -> count
  const dowSet = new Set(), hourSet = new Set();
  appears.forEach(e => {
    const dow = e.dow != null ? e.dow : new Date(e.date + "T00:00:00").getDay();
    const h = startHour(e.slot);
    if (isNaN(h)) return;
    heat[dow] = heat[dow] || {};
    heat[dow][h] = (heat[dow][h] || 0) + 1;
    dowSet.add(dow); hourSet.add(h);
  });
  const dows = [...dowSet].sort((a, b) => a - b);
  const hours = [...hourSet].sort((a, b) => a - b);
  const heatMax = Math.max(1, ...Object.values(heat).flatMap(r => Object.values(r)));

  // ── 退訂釋出時刻（偵測小時，台灣）：退訂 vs 新日期釋出 ──
  const maxLead = Math.max(0, ...appears.map(e => e.lead || 0));
  const relByHour = Array.from({length:24}, () => ({ retry:0, fresh:0 }));
  appears.forEach(e => {
    const h = twHour(e.t);
    if (isNaN(h)) return;
    const isNew = e.nr ? true : ((e.lead || 0) >= maxLead && maxLead > 0);
    if (isNew) relByHour[h].fresh++;
    else relByHour[h].retry++;
  });
  const activeHours = relByHour.map((v, h) => ({ h, ...v })).filter(v => v.retry + v.fresh > 0);

  // ── 撿場速度：disappear dur 中位數 ──
  const durs = disappears.map(e => e.dur).filter(d => d != null && d > 0);
  const medDur = median(durs);
  const peakDurs = disappears.filter(e => { const h = startHour(e.slot); return h >= 18 || (e.dow !== undefined && [0,6].includes(e.dow) && h >= 12); }).map(e => e.dur).filter(d => d != null && d > 0);
  const fastShare = durs.length ? Math.round(durs.filter(d => d <= 15).length / durs.length * 100) : 0;

  // ── 場館排名：appear 次數 + 平均面數 ──
  const byVenue = {};
  appears.forEach(e => {
    const v = byVenue[e.lid] = byVenue[e.lid] || { n:0, courts:0 };
    v.n++; v.courts += e.courts || 0;
  });
  const venueRank = Object.entries(byVenue).map(([lid, v]) => ({
    lid, n: v.n, avg: v.n ? (v.courts / v.n) : 0,
  })).sort((a, b) => b.n - a.n);

  return (
    <div>
      {/* 涵蓋範圍 */}
      <div style={{...card, padding:"10px 13px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6}}>
          <span style={{fontSize:11, color:"#64748b"}}>
            📈 累積 {days} 天 · {appears.length} 次冒空位 · {disappears.length} 次被搶
          </span>
          <span style={{fontSize:10, color:"#475569"}}>
            {since ? `自 ${since.getMonth()+1}/${since.getDate()} 起` : ""}
          </span>
        </div>
      </div>

      {/* 熱力圖 */}
      <div style={card}>
        <div style={title}>🔥 退訂熱力圖</div>
        <div style={sub}>星期 × 時段，顏色越亮＝越常冒出空位＝越值得守。（依目前監看：放假日全天＋前一晚）</div>
        <div style={{overflowX:"auto"}}>
          <div style={{display:"inline-block", minWidth:"100%"}}>
            <div style={{display:"flex", gap:2, marginBottom:2, paddingLeft:30}}>
              {hours.map(h => <div key={h} style={{width:18, fontSize:8, color:"#475569", textAlign:"center"}}>{h}</div>)}
            </div>
            {dows.map(dow => (
              <div key={dow} style={{display:"flex", gap:2, marginBottom:2, alignItems:"center"}}>
                <div style={{width:28, fontSize:11, fontWeight:700, color:DAY_COLOR[dow], textAlign:"center"}}>{WD[dow]}</div>
                {hours.map(h => {
                  const c = (heat[dow] && heat[dow][h]) || 0;
                  const a = c ? 0.18 + 0.82 * (c / heatMax) : 0;
                  return <div key={h} title={`週${WD[dow]} ${h}:00 — ${c} 次`}
                    style={{width:18, height:18, borderRadius:3, background:c?`rgba(74,222,128,${a})`:"#0a1018", border:"1px solid #131c28"}}/>;
                })}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:5, marginTop:8, fontSize:9, color:"#475569"}}>
          少 <div style={{width:14,height:10,borderRadius:2,background:"rgba(74,222,128,0.18)"}}/>
          <div style={{width:14,height:10,borderRadius:2,background:"rgba(74,222,128,0.55)"}}/>
          <div style={{width:14,height:10,borderRadius:2,background:"rgba(74,222,128,1)"}}/> 多
        </div>
      </div>

      {/* 退訂釋出時刻 */}
      <div style={card}>
        <div style={title}>⏰ 退訂釋出時刻</div>
        <div style={sub}>一天中幾點最常冒出空位（台灣時間）。{maxLead > 0 ? "綠＝一般退訂，藍＝新日期剛釋出（搶頭香）。" : ""}</div>
        {activeHours.length ? (
          <div style={{display:"flex", alignItems:"flex-end", gap:3, height:90, paddingTop:6}}>
            {activeHours.map(({h, retry, fresh}) => {
              const total = retry + fresh;
              const maxT = Math.max(...activeHours.map(v => v.retry + v.fresh));
              const hPx = Math.round((total / maxT) * 72);
              return <div key={h} style={{flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2}}>
                <div style={{width:"100%", maxWidth:18, height:hPx, display:"flex", flexDirection:"column", justifyContent:"flex-end", borderRadius:"3px 3px 0 0", overflow:"hidden"}}>
                  <div style={{height:`${total?fresh/total*100:0}%`, background:"#60a5fa"}}/>
                  <div style={{height:`${total?retry/total*100:0}%`, background:"#4ade80"}}/>
                </div>
                <span style={{fontSize:8, color:"#475569"}}>{h}</span>
              </div>;
            })}
          </div>
        ) : <div style={sub}>尚無資料</div>}
      </div>

      {/* 撿場速度 */}
      <div style={card}>
        <div style={title}>⚡ 撿場速度</div>
        <div style={sub}>空位出現後多久被搶走 — 越短代表手速要越快。</div>
        <div style={{display:"flex", gap:8}}>
          <div style={{flex:1, background:"#0a1018", borderRadius:9, padding:"10px 8px", textAlign:"center"}}>
            <div style={{fontSize:18, fontWeight:700, color:"#4ade80"}}>{fmtDur(medDur)}</div>
            <div style={{fontSize:9, color:"#64748b", marginTop:2}}>被搶走中位數</div>
          </div>
          <div style={{flex:1, background:"#0a1018", borderRadius:9, padding:"10px 8px", textAlign:"center"}}>
            <div style={{fontSize:18, fontWeight:700, color:"#fbbf24"}}>{fastShare}%</div>
            <div style={{fontSize:9, color:"#64748b", marginTop:2}}>15 分內被秒殺</div>
          </div>
          <div style={{flex:1, background:"#0a1018", borderRadius:9, padding:"10px 8px", textAlign:"center"}}>
            <div style={{fontSize:18, fontWeight:700, color:"#f97316"}}>{fmtDur(median(peakDurs))}</div>
            <div style={{fontSize:9, color:"#64748b", marginTop:2}}>尖峰時段</div>
          </div>
        </div>
        {durs.length < 5 && <div style={{...sub, marginTop:8, marginBottom:0}}>樣本還少（{durs.length} 筆），多累積幾天會更準。</div>}
      </div>

      {/* 場館排名 */}
      <div style={card}>
        <div style={title}>🏟 場館退訂排名</div>
        <div style={sub}>哪個場館最常冒退訂，及平均一次釋出幾面。</div>
        {venueRank.length ? (
          <Bars color="#4ade80" data={venueRank.map(v => ({
            label: VENUE_NAMES[v.lid] || v.lid,
            value: v.n,
            sub: `${v.n} 次 · 均${v.avg.toFixed(1)}面`,
          }))}/>
        ) : <div style={sub}>尚無資料</div>}
      </div>

      <div style={{fontSize:9, color:"#475569", textAlign:"center", padding:"4px 0 10px"}}>
        資料每輪掃描更新 · 凌晨 01:00–08:30 監看休眠不計入
      </div>
    </div>
  );
}
