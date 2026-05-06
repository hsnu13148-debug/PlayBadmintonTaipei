import React, { useState, useEffect, useRef } from "react";

const DAY_COLOR = ["#a855f7","#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#6366f1"];
const DAY_BG    = ["rgba(168,85,247,0.13)","rgba(239,68,68,0.13)","rgba(249,115,22,0.13)","rgba(234,179,8,0.13)","rgba(34,197,94,0.13)","rgba(59,130,246,0.13)","rgba(99,102,241,0.13)"];
const WD = ["日","一","二","三","四","五","六"];
const dc = d => DAY_COLOR[d.getDay()];
const addDays = (d,n) => { const r=new Date(d); r.setDate(r.getDate()+n); return r; };
const sod = d => { const r=new Date(d); r.setHours(0,0,0,0); return r; };
const fmtD = d => `${d.getMonth()+1}/${d.getDate()}（${WD[d.getDay()]}）`;
const fmtS = d => `${d.getMonth()+1}/${d.getDate()}${WD[d.getDay()]}`;
const fmtH = h => `${String(h||0).padStart(2,"0")}:00`;

const PHOTOS = [
  "https://picsum.photos/seed/badminton1/400/270",
  "https://picsum.photos/seed/badminton2/400/270",
  "https://picsum.photos/seed/badminton3/400/270",
  "https://picsum.photos/seed/badminton4/400/270",
  "https://picsum.photos/seed/badminton5/400/270",
  "https://picsum.photos/seed/badminton6/400/270",
];
const PR_TP = (x) => [
  { label:"離峰", times:"平日06:00–18:00、假日06:00–12:00", price:"NT$300/小時" },
  { label:"尖峰", times:"平日18:00–22:00、假日12:00–22:00", price:`NT$500/小時${x?" "+x:""}` },
];
const PR_NT = () => [
  { label:"離峰", times:"平日06:00–18:00、假日06:00–12:00", price:"NT$200/小時 ⚠️估" },
  { label:"尖峰", times:"平日18:00–22:00、假日12:00–22:00", price:"NT$300/小時 ⚠️估" },
];
const PK = (car,mIn,mOut) => ({ car, motoIn:mIn, motoOut:mOut });
const RV = (t1,s1,a1,t2,s2,a2) => [{text:t1,stars:s1,author:a1},{text:t2,stars:s2,author:a2}];

const VENUES = [
  {id:"daan",       name:"大安運動中心",   city:"台北市",district:"大安區",  address:"台北市大安區辛亥路三段55號",        floor:"4F",courts:12,adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2377-0300",bookingUrl:"https://www.daansports.com.tw/",                   officialUrl:"https://www.daansports.com.tw",  openHours:"06:00–22:00",lighting:"專業",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("B1收費(NT$30/30分)","有，免費","有，免費"),       photos:[PHOTOS[0],PHOTOS[1]],reviews:RV("12面超寬敞，燈光專業，設施一流",5,"羽球愛好者","假日14天前00:00要守著搶",4,"週末球友"),lat:25.026,lng:121.537},
  {id:"wanhua",     name:"萬華運動中心",   city:"台北市",district:"萬華區",  address:"台北市萬華區東園街101號",           floor:"3F",courts:8, adv:14,sh:0, minD:8, onsiteOnly:false,phone:"02-2308-0800",bookingUrl:"https://whsc.com.tw/",                             officialUrl:"https://whsc.com.tw",            openHours:"07:00–22:00",lighting:"普通",note:"網路僅8–14天前，7天內僅電話",payNote:"付費預約後不可退費；7天內電話預約者，3天前繳費",pricing:PR_TP(),           parking:PK("週邊收費停車場","無","有，免費"),               photos:[PHOTOS[2],PHOTOS[3]],reviews:RV("新換木地板腳感超好",5,"桃園球友","8天前才能網路預約，但場地沒話說",3,"西區球員"),lat:25.035,lng:121.497},
  {id:"beitou",     name:"北投運動中心",   city:"台北市",district:"北投區",  address:"台北市北投區中央南路一段55號",       floor:"3F",courts:6, adv:null,sh:null,minD:null,onsiteOnly:true,onsiteAdv:7,phone:"02-2820-2880",bookingUrl:"https://www.btsport.org.tw/",officialUrl:"https://www.btsport.org.tw",openHours:"07:00–22:00",lighting:"普通",note:"僅電話/現場，7天內，3天前需繳費",payNote:"現場或電話預約，使用日3天前繳費",pricing:PR_TP(),parking:PK("地面停車場（免費）","無","有，免費"),photos:[PHOTOS[4],PHOTOS[5]],reviews:RV("場地乾淨，北投少見羽球場",3,"北投居民","冷氣涼，停車方便",4,"週末球友"),lat:25.132,lng:121.499},
  {id:"shilin",     name:"士林運動中心",   city:"台北市",district:"士林區",  address:"台北市士林區士商路1號",           floor:"7F",courts:10,adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2880-6066",bookingUrl:"https://www.slsc-taipei.org/",                     officialUrl:"https://www.slsc-taipei.org",    openHours:"07:00–22:00",lighting:"專業",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("B1–B3收費(NT$30/30分)","有，免費","有，免費"),   photos:[PHOTOS[0],PHOTOS[2]],reviews:RV("7樓燈光專業等級，超過癮",5,"士林球友","預約後當天不能取消要注意",4,"常客"),lat:25.088,lng:121.524},
  {id:"xinyi",      name:"信義運動中心",   city:"台北市",district:"信義區",  address:"台北市信義區松仁路70號",            floor:"6F",courts:8, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-8786-1911",bookingUrl:"https://xysc.teamxports.com/",                     officialUrl:"https://xysc.teamxports.com",    openHours:"06:00–22:00",lighting:"專業",note:"取消需3天前線上辦理", pricing:PR_TP(),           parking:PK("信義區週邊付費停車","有，免費","有，免費"),      photos:[PHOTOS[1],PHOTOS[3]],reviews:RV("信義地段好，設施新乾淨",5,"101球友","費用稍高但品質對得起",4,"信義上班族"),lat:25.033,lng:121.565},
  {id:"datong",     name:"大同運動中心",   city:"台北市",district:"大同區",  address:"台北市大同區鄭州路1號（台北車站附近）",             floor:"5F",courts:6, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2592-0055",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=DTSC",   officialUrl:"https://www.dtsc-wdyg.com.tw",   openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("週邊路邊停車","無","有，免費"),                   photos:[PHOTOS[4],PHOTOS[0]],reviews:RV("大稻埕附近交通方便，場地夠用",4,"大同球友","燈光普通打夜球略暗",3,"老球友"),lat:25.063,lng:121.513},
  {id:"zhongshan",  name:"中山運動中心",   city:"台北市",district:"中山區",  address:"台北市中山區民權東路二段69號",       floor:"4F",courts:8, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2596-5858",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=ZSSC",   officialUrl:"https://cssc.cyc.org.tw",        openHours:"07:00–22:00",lighting:"專業",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("B1收費停車場","有，免費","有，免費"),             photos:[PHOTOS[2],PHOTOS[5]],reviews:RV("4樓燈光專業，適合比賽練習",5,"競技球友","管理嚴格準時有效率",4,"中山上班族"),lat:25.063,lng:121.533},
  {id:"nangang",    name:"南港運動中心",   city:"台北市",district:"南港區",  address:"台北市南港區向陽路68號",            floor:"3F",courts:6, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2653-2279",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=NGSC",   officialUrl:"https://ngsc.cyc.org.tw",        openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("地面免費停車場","有，免費","有，免費"),           photos:[PHOTOS[3],PHOTOS[1]],reviews:RV("假日場比較好搶，場地乾淨",4,"南港球友","停車超方便免費",5,"開車族"),lat:25.054,lng:121.607},
  {id:"wenshan",    name:"文山運動中心",   city:"台北市",district:"文山區",  address:"台北市文山區興隆路三段222號",        floor:"6F",courts:6, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2230-8268",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=WSSC",   officialUrl:"https://wssc.cyc.org.tw",        openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("地面停車場","有，免費","有，免費"),               photos:[PHOTOS[5],PHOTOS[2]],reviews:RV("木柵好停車，場地寬敞",4,"家庭球友","燈光略暗，建議選早上",3,"文山球友"),lat:24.995,lng:121.568},
  {id:"neihu",      name:"內湖運動中心",   city:"台北市",district:"內湖區",  address:"台北市內湖區文湖街20號",            floor:"4F",courts:8, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2656-2869",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=NHSC",   officialUrl:"https://nhsc.cyc.org.tw",        openHours:"07:00–22:00",lighting:"專業",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("B1收費停車場","有，免費","有，免費"),             photos:[PHOTOS[0],PHOTOS[4]],reviews:RV("科技園區旁下班順路，場地新乾淨",5,"科技業球友","4樓燈光是專業賽事等級",5,"內湖居民"),lat:25.074,lng:121.587},
  {id:"zhongzheng", name:"中正運動中心",   city:"台北市",district:"中正區",  address:"台北市中正區汀州路三段70號",         floor:"3F",courts:6, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2375-0888",bookingUrl:"https://booking-tpsc.sporetrofit.com/?LID=JJSC",   officialUrl:"https://www.wsjjsc.com.tw",      openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP(),           parking:PK("週邊付費停車場","無","有，免費"),                 photos:[PHOTOS[3],PHOTOS[5]],reviews:RV("師大附近氣氛輕鬆",4,"師大球友","捷運步行即到",4,"通勤球友"),lat:25.032,lng:121.518},
  {id:"tsc",        name:"台北市網球中心", city:"台北市",district:"內湖區",  address:"台北市內湖區民善街1號",             floor:"2F",courts:6, adv:7, sh:6, minD:1, onsiteOnly:false,phone:"02-2795-1166",bookingUrl:"https://www.tsc.taipei/",                          officialUrl:"https://www.tsc.taipei",         openHours:"06:00–22:00",lighting:"專業",note:"06:00起開放，尖峰需租2小時",payNote:"網路預約後10分鐘內完成付款；使用日7天內預約者，當日21:00前繳費",pricing:PR_TP("（需租2小時）"),parking:PK("地面免費停車（2小時）","有，免費","有，免費"),photos:[PHOTOS[1],PHOTOS[3]],reviews:RV("設施一流，燈光真正專業賽事等級",5,"進階球友","尖峰需租2小時，但場地頂尖",4,"週末球友"),lat:25.075,lng:121.580},
  {id:"cyc",        name:"青年活動中心",   city:"台北市",district:"內湖區",  address:"台北市內湖區康寧路三段109號",        floor:"2F",courts:6, adv:14,sh:0, minD:1, onsiteOnly:false,phone:"02-2796-3558",bookingUrl:"https://scr.cyc.org.tw/tp02.aspx?module=net_booking&files=booking_before&PT=1",officialUrl:"https://scr.cyc.org.tw",openHours:"07:00–22:00",lighting:"普通",note:null,pricing:PR_TP(),parking:PK("地面停車(NT$20/30分)","有，免費","有，免費"),photos:[PHOTOS[4],PHOTOS[0]],reviews:RV("CP值高，費用合理，場地乾淨",4,"省錢球友","當天也能訂，臨時起意最佳",5,"內湖球友"),lat:25.073,lng:121.593},
  {id:"yonghe",     name:"永和運動中心",   city:"新北市",district:"永和區",  address:"新北市永和區永和路二段25號",         floor:"3F",courts:8, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2926-1885",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面停車場","有，免費","有，免費"),               photos:[PHOTOS[2],PHOTOS[4]],reviews:RV("離台北近費用便宜，值得跨縣市",4,"中和球友","假日比台北好搶",4,"新北球友"),lat:25.008,lng:121.516},
  {id:"banqiao",    name:"板橋體育館",     city:"新北市",district:"板橋區",  address:"新北市板橋區莊敬路62號",            floor:"2F",courts:8, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2955-3366",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面免費大停車場","有，免費","有，免費"),         photos:[PHOTOS[5],PHOTOS[1]],reviews:RV("停車超方便免費，帶家人推薦",5,"板橋球友","場地保養好，費用親民",4,"固定球友"),lat:25.013,lng:121.462},
  {id:"zhonghe",    name:"中和運動中心",   city:"新北市",district:"中和區",  address:"新北市中和區中安街107號",           floor:"3F",courts:6, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2240-3456",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("週邊付費停車場","無","有，免費"),                 photos:[PHOTOS[0],PHOTOS[3]],reviews:RV("環境不錯，場地整潔，服務好",4,"中和球友","費用比台北便宜，品質差不多",4,"比價達人"),lat:24.997,lng:121.499},
  {id:"xindian",    name:"新店運動中心",   city:"新北市",district:"新店區",  address:"新北市新店區北宜路一段16號",         floor:"3F",courts:6, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2911-5678",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面免費停車場","有，免費","有，免費"),           photos:[PHOTOS[1],PHOTOS[5]],reviews:RV("碧潭附近打完球可散步",5,"新店居民","假日競爭少，7天前通常搶得到",4,"南區球友"),lat:24.967,lng:121.535},
  {id:"xizhi",      name:"汐止運動中心",   city:"新北市",district:"汐止區",  address:"新北市汐止區新台五路一段182號",      floor:"3F",courts:6, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2641-2345",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面免費停車場","有，免費","有，免費"),           photos:[PHOTOS[3],PHOTOS[2]],reviews:RV("人少假日好搶，停車免費，從內湖不遠",4,"內湖球友","場地新設施好，比想像中棒",5,"汐止球友"),lat:25.067,lng:121.657},
  {id:"sanchong",   name:"三重運動中心",   city:"新北市",district:"三重區",  address:"新北市三重區重新路五段609號",        floor:"3F",courts:6, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2982-3456",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面停車場","有，免費","有，免費"),               photos:[PHOTOS[4],PHOTOS[0]],reviews:RV("交通方便，場地環境良好，費用實惠",4,"三重球友","工作人員親切，CP值高",4,"新北球友"),lat:25.063,lng:121.484},
  {id:"xinzhuang",  name:"新莊運動中心",   city:"新北市",district:"新莊區",  address:"新北市新莊區瓊林路28號",            floor:"3F",courts:6, adv:7, sh:0, minD:1, onsiteOnly:false,phone:"02-2992-4567",bookingUrl:"https://sports.ntpc.gov.tw/",                      officialUrl:"https://sports.ntpc.gov.tw",     openHours:"07:00–22:00",lighting:"普通",note:null,payNote:"預約後3天內完成繳費，逾時系統自動取消",pricing:PR_NT(),           parking:PK("地面免費停車場","有，免費","有，免費"),           photos:[PHOTOS[2],PHOTOS[5]],reviews:RV("場地新停車方便，環境輕鬆",4,"新莊球友","假日場好搶，建議選早上較涼快",3,"週末球友"),lat:25.035,lng:121.449},
];
// ── utils ─────────────────────────────────────────────────────────────────────
const getOpenTime = (v, d) => {
  if (!v.adv) return null;
  const o = addDays(sod(d), -v.adv);
  o.setHours(v.sh || 0, 0, 0, 0);
  return o;
};
const isInWin = (v, d, now) => {
  if (v.onsiteOnly) return false;
  const diff = Math.round((sod(d) - sod(now)) / 86400000);
  if (diff <= 0) return false;
  if (v.minD && diff < v.minD) return false;
  return diff <= v.adv;
};
const canNow = (v, d, now) => {
  if (!isInWin(v, d, now)) return false;
  const o = getOpenTime(v, d);
  return o && now >= o;
};
const getUntil = (adv, now) => addDays(sod(now), adv);
const getDist = (v, loc) => {
  if (!loc) return null;
  const R=6371, dL=(v.lat-loc.lat)*Math.PI/180, dN=(v.lng-loc.lng)*Math.PI/180;
  const a=Math.sin(dL/2)**2+Math.cos(loc.lat*Math.PI/180)*Math.cos(v.lat*Math.PI/180)*Math.sin(dN/2)**2;
  return (R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))).toFixed(1);
};
const getWeekends = (now, n) => {
  const res=[], d=new Date(now); d.setHours(0,0,0,0);
  while (res.length<n) { d.setDate(d.getDate()+1); if ([5,6,0].includes(d.getDay())) res.push(new Date(d)); }
  return res;
};
const getUpcoming = (now, n) => {
  const res=[], d=new Date(now); d.setHours(0,0,0,0);
  while (res.length<n) { d.setDate(d.getDate()+1); res.push(new Date(d)); }
  return res;
};

// ── ICS ───────────────────────────────────────────────────────────────────────
const mkEVT = (sum, desc, dt) => {
  const p=n=>String(n).padStart(2,"0"), f=d=>`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  const e=new Date(dt.getTime()+30*60000);
  return ["BEGIN:VEVENT",`DTSTART:${f(dt)}`,`DTEND:${f(e)}`,`SUMMARY:${sum}`,`DESCRIPTION:${desc}`,"BEGIN:VALARM","TRIGGER:PT0S","ACTION:DISPLAY",`DESCRIPTION:${sum}`,"END:VALARM","END:VEVENT"].join("\r\n");
};
const dlICS = (evts, name) => {
  const c=["BEGIN:VCALENDAR","VERSION:2.0","CALSCALE:GREGORIAN","METHOD:PUBLISH",...evts,"END:VCALENDAR"].join("\r\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([c],{type:"text/calendar;charset=utf-8"}));
  a.download=name||"提醒.ics"; a.click();
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [now, setNow]               = useState(new Date());
  const [tab, setTab]               = useState("realtime");
  const [favs, setFavs]             = useState(new Set());
  const [todayClicked, setTodayClicked] = useState(new Set());
  const [toast, setToast]           = useState("");
  useEffect(() => { const t=setInterval(()=>setNow(new Date()),30000); return ()=>clearInterval(t); }, []);
  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2200); };
  const togFav    = id  => setFavs(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const markClicked = id => setTodayClicked(p => new Set([...p,id]));
  const weekends  = getWeekends(now, 9);
  return (
    <div style={S.root}>
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:9,padding:"13px 14px 7px"}}>
          <span style={{fontSize:22}}>🏸</span>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:"#e2e8f0"}}>台北羽球助手</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:1}}>PlayBadmintonTaipei · V26.5.6.2</div>
            <div style={{fontSize:10,color:"#64748b",display:"flex",gap:6}}>
              {now.toLocaleDateString("zh-TW",{month:"long",day:"numeric",weekday:"short"})} {now.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
        </div>
        <div style={S.tabBar}>
          {[["realtime","⚡ 即時空位"],["lucky","📋 已開放預約"],["plan","📅 搶場計畫"]].map(([v,l]) => (
            <button key={v} onClick={()=>setTab(v)} style={{...S.tab,...(tab===v?S.tabOn:{})}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={S.body}>
        {tab==="realtime" && <RealtimeTab now={now} showToast={showToast} favs={favs} togFav={togFav} todayClicked={todayClicked} markClicked={markClicked}/>}
        {tab==="lucky"    && <LuckyTab    now={now} weekends={weekends} showToast={showToast} favs={favs} togFav={togFav} todayClicked={todayClicked} markClicked={markClicked}/>}
        {tab==="plan"     && <PlanTab     now={now} favs={favs} showToast={showToast}/>}
      </div>
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}


// ── LuckyTab: non-LID venues grouped by until-date, collapsible ───────────────
const NON_LID_IDS = ["daan","wanhua","beitou","shilin","xinyi","datong","zhongshan","nangang","tsc","cyc",
  "yonghe","banqiao","zhonghe","xindian","xizhi","sanchong","xinzhuang"];

function LuckyTab({ now, weekends, showToast, favs, togFav, todayClicked, markClicked }) {
  const [mapMode, setMapMode] = useState(false);
  // Build groups by adv (until date)
  const venues = VENUES.filter(v => NON_LID_IDS.includes(v.id));
  const groupMap = {};
  venues.forEach(v => {
    if (!v.adv) {
      const k = "onsite";
      if (!groupMap[k]) groupMap[k] = { adv:null, until:null, venues:[] };
      groupMap[k].venues.push(v);
      return;
    }
    const until = getUntil(v.adv, now);
    const k = until.toISOString();
    if (!groupMap[k]) groupMap[k] = { adv:v.adv, until, venues:[] };
    groupMap[k].venues.push(v);
  });
  const groups = Object.values(groupMap).sort((a,b) => {
    if (!a.until) return 1;
    if (!b.until) return -1;
    return b.adv - a.adv;
  });

  if (mapMode) {
    return (
      <div>
        <button onClick={()=>setMapMode(false)} style={{...S.chip,marginBottom:10}}>← 返回列表</button>
        <MapView venues={venues} now={now} weekends={weekends} favs={favs||new Set()}
          togFav={togFav||(()=>{})} todayClicked={todayClicked||new Set()}
          markClicked={markClicked||(()=>{})} showToast={showToast} loc={null}/>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div style={{
          flex:1,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:10,padding:"8px 12px",fontSize:11,color:"#fbbf24",lineHeight:1.6,
        }}>
          ⚠️ 規則推算，非即時查詢。實際空位請至官網確認。
        </div>
        <button onClick={()=>setMapMode(true)} style={{
          marginLeft:8,padding:"10px 13px",borderRadius:10,border:"1px solid #1e293b",
          background:"transparent",color:"#64748b",fontSize:13,cursor:"pointer",flexShrink:0,
        }}>🗺</button>
      </div>
      {groups.map((g,gi) => (
        <LuckyGroup key={gi} g={g} now={now} weekends={weekends}
          favs={favs} togFav={togFav} todayClicked={todayClicked}
          markClicked={markClicked} showToast={showToast}/>
      ))}
    </div>
  );
}

function LuckyGroup({ g, now, weekends, favs, togFav, todayClicked, markClicked, showToast }) {
  const [collapsed, setCollapsed] = useState(false);
  const label = g.until ? `可預約到 ${fmtD(g.until)}` : "僅電話/現場預約";
  const col   = g.until ? "#4ade80" : "#f59e0b";
  return (
    <div style={{marginBottom:16}}>
      <button onClick={()=>setCollapsed(c=>!c)} style={{
        width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
        borderRadius:10,border:`1px solid ${col}33`,
        background:`rgba(${g.until?"74,222,128":"245,158,11"},0.06)`,
        cursor:"pointer",textAlign:"left",marginBottom:collapsed?0:8,
      }}>
        <span style={{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0,boxShadow:`0 0 5px ${col}`}}/>
        <span style={{fontSize:13,fontWeight:700,color:col,flex:1}}>{label}</span>
        <span style={{fontSize:11,color:"#475569"}}>{g.venues.length} 個場館</span>
        <span style={{fontSize:11,color:col}}>{collapsed?"▶":"▼"}</span>
      </button>
      {!collapsed && (
        <div>
          {g.venues.map(v => (
            <VCard key={v.id} v={v} now={now} weekends={weekends}
              favs={favs} togFav={togFav}
              todayClicked={todayClicked} markClicked={markClicked}
              showToast={showToast} loc={null}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RealtimeTab ───────────────────────────────────────────────────────────────
const LID_VENUES = [
  { id:"wenshan",   name:"文山運動中心", lid:"WSSC", district:"文山區" },
  { id:"neihu",     name:"內湖運動中心", lid:"NHSC", district:"內湖區" },
  { id:"zhongzheng",name:"中正運動中心", lid:"JJSC", district:"中正區" },
];

const PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
  url => `https://thingproxy.freeboard.io/fetch/${url}`,
];
const JSON_API_PATHS = [
  (lid,ds) => `https://booking-tpsc.sporetrofit.com/BookingNew/GetBookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}&rows=100`,
  (lid,ds) => `https://booking-tpsc.sporetrofit.com/Location/GetBookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}&rows=100`,
];

function buildBookingUrl(lid, date) {
  const ds = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  return `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}`;
}

function parseSlots(html, dow) {
  const doc  = new DOMParser().parseFromString(html,"text/html");
  const rows = Array.from(doc.querySelectorAll("table tr")).slice(1);
  if (!rows.length) return null;
  const avail = new Set(), booked = new Set();
  rows.forEach(tr => {
    const cells = tr.querySelectorAll("td");
    if (cells.length < 5) return;
    const time   = cells[3]?.textContent?.trim();
    const status = cells[4]?.textContent?.trim();
    if (!time) return;
    const t = time.replace(" - ","–").replace("- ","–").replace(" -","–");
    if (status?.includes("預約") && !status?.includes("已被")) avail.add(t);
    else if (status?.includes("已被") || status?.includes("滿")) booked.add(t);
  });
  const f = t => dow !== 5 || parseInt(t.split(":")[0]) >= 18;
  return { available:[...avail].filter(f).sort(), booked:[...booked].sort(), total:rows.length };
}

async function tryFetchSlots(lid, date) {
  const ds  = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

  // Method 1: Direct browser call (uses browser session - best chance)
  try {
    const directUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${ds}`;
    const r = await fetch(directUrl, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Referer": `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${ds}`,
      },
      credentials: "include",
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const ct = r.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const data = await r.json();
        const arr = Array.isArray(data) ? data : data.data||data.rows||data.list||[];
        const seen = new Set(), avail = [];
        arr.forEach(item => {
          const raw = item.UseTime||item.useTime||item.time||item.Time||item.startTime||"";
          if (!raw) return;
          const t = raw.toString().replace(" - ","–").replace("- ","–").replace(" -","–").trim();
          if (!seen.has(t)) { seen.add(t); avail.push(t); }
        });
        avail.sort();
        return { available:avail, total:arr.length, via:"direct" };
      }
    }
  } catch(_) {}

  // Method 2: Vercel backend proxy
  try {
    const r = await fetch(`/api/slots?lid=${lid}&date=${ds}`, { signal:AbortSignal.timeout(10000) });
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j.available)) {
        return { available:j.available, total:j.total||0, via:"server" };
      }
    }
  } catch(_) {}

  // Method 3: CORS proxies
  for (const mkProxy of PROXIES) {
    try {
      const targetUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${ds}`;
      const r = await fetch(mkProxy(targetUrl), { signal:AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "";
      let text = "";
      if (ct.includes("json")) {
        const j = await r.json();
        text = j.contents || j.body || JSON.stringify(j);
      } else {
        text = await r.text();
      }
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : data.data||data.rows||data.list||[];
        if (arr.length >= 0) {
          const seen = new Set(), avail = [];
          arr.forEach(item => {
            const raw = item.UseTime||item.useTime||item.time||item.Time||item.startTime||"";
            if (!raw) return;
            const t = raw.toString().replace(" - ","–").replace("- ","–").replace(" -","–").trim();
            if (!seen.has(t)) { seen.add(t); avail.push(t); }
          });
          avail.sort();
          return { available:avail, total:arr.length, via:"proxy" };
        }
      } catch(_) {}
    } catch(_) {}
  }

  throw new Error("all methods failed");
}


function RealtimeTab({ now, showToast, favs, togFav, todayClicked, markClicked }) {
  const weekendDates  = getNextWeekendDates(now);
  const [scanning, setScanning] = useState(false);
  const [results,  setResults]  = useState({});
  const [mapMode,  setMapMode]  = useState(false);

  const [scanProgress, setScanProgress] = useState(""); // e.g. "文山 5/9 ✓"

  const scan = async () => {
    setScanning(true);
    setResults({});
    setScanProgress("");
    // out[dateStr][lid] = { available, error }
    const out = {};
    for (const d of weekendDates) {
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!out[ds]) out[ds] = {};
      for (const v of LID_VENUES) {
        setScanProgress(`掃描中… ${v.name} ${d.getMonth()+1}/${d.getDate()}`);
        try {
          // Use /api/slots (Vercel backend)
          const r = await fetch(`/api/slots?lid=${v.lid}&date=${ds}`, {signal:AbortSignal.timeout(10000)});
          if (r.ok) {
            const j = await r.json();
            out[ds][v.lid] = { available: j.available||[], error: false };
          } else {
            out[ds][v.lid] = { available:[], error:true };
          }
        } catch(e) {
          out[ds][v.lid] = { available:[], error:true };
        }
        setResults({...out});
      }
    }
    setScanning(false);
    setScanProgress("");
    const totalAvail = Object.values(out).flatMap(d=>Object.values(d)).filter(r=>r.available?.length>0).length;
    showToast(totalAvail>0?`掃描完成！${totalAvail}個場館有空位`:"掃描完成，目前全滿");
  };

  if (mapMode) {
    const lidData = VENUES.filter(v=>LID_VENUES.some(l=>l.id===v.id));
    return (
      <div>
        <button onClick={()=>setMapMode(false)} style={{...S.chip,marginBottom:10}}>← 返回</button>
        <MapView venues={lidData} now={now} weekends={weekendDates} favs={favs}
          togFav={togFav} todayClicked={todayClicked} markClicked={markClicked}
          showToast={showToast} loc={null}/>
      </div>
    );
  }

  return (
    <div>
      {/* Top action buttons */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        <button onClick={scan} disabled={scanning} style={{
          flex:1,padding:"12px",borderRadius:11,border:"1px solid rgba(59,130,246,0.3)",
          background:scanning?"#111827":"rgba(59,130,246,0.08)",
          color:scanning?"#64748b":"#60a5fa",fontSize:13,fontWeight:700,cursor:scanning?"wait":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        }}>
          <span style={{display:"inline-block",animation:scanning?"spin 1s linear infinite":"none"}}>
            {scanning?"⟳":"🔍"}
          </span>
          {scanning?"掃描中…":"自動掃描空位"}
        </button>
        <button onClick={()=>setMapMode(true)} style={{
          padding:"12px 14px",borderRadius:11,border:"1px solid #1e293b",
          background:"transparent",color:"#64748b",fontSize:12,fontWeight:600,cursor:"pointer",
          display:"flex",alignItems:"center",gap:5,
        }}>🗺 地圖檢視</button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Scan results - grouped by date */}
      {Object.keys(results).length>0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10,color:"#64748b",marginBottom:8}}>掃描結果</div>
          {weekendDates.map(d=>{
            const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            const dayRes=results[ds]; if(!dayRes) return null;
            const col=DAY_COLOR[d.getDay()];
            const hasAny=Object.values(dayRes).some(r=>r.available?.length>0);
            return(
              <div key={ds} style={{marginBottom:10,background:"#0a1018",borderRadius:11,border:`1px solid ${hasAny?"rgba(74,222,128,0.2)":"#1e293b"}`,overflow:"hidden"}}>
                {/* Date header */}
                <div style={{padding:"8px 12px",background:hasAny?"rgba(74,222,128,0.05)":"transparent",borderBottom:"1px solid #1e293b",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:col}}>{d.getMonth()+1}/{d.getDate()}（{["日","一","二","三","四","五","六"][d.getDay()]}）</span>
                  {hasAny
                    ? <span style={{fontSize:10,color:"#4ade80"}}>✅ 有空位</span>
                    : <span style={{fontSize:10,color:"#64748b"}}>❌ 全滿</span>}
                </div>
                {/* Venue results */}
                <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:6}}>
                  {LID_VENUES.map(v=>{
                    const res=dayRes[v.lid];
                    if(!res) return(
                      <div key={v.lid} style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11,color:"#64748b",minWidth:90}}>{v.name}</span>
                        <span style={{fontSize:10,color:"#475569"}}>掃描中…</span>
                      </div>
                    );
                    return(
                      <div key={v.lid}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:res.available?.length>0?5:0}}>
                          <span style={{fontSize:12,fontWeight:600,minWidth:90}}>{v.name}</span>
                          {res.error
                            ? <span style={{fontSize:10,color:"#ef4444"}}>撈取失敗</span>
                            : res.available?.length>0
                            ? <span style={{fontSize:10,color:"#4ade80"}}>✅ {res.available.length}段有空</span>
                            : <span style={{fontSize:10,color:"#64748b"}}>❌ 全滿</span>}
                        </div>
                        {res.available?.length>0 && (
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {res.available.map(t=>(
                              <a key={t} href={buildBookingUrl(v.lid,d)} target="_blank" rel="noreferrer"
                                style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:6,
                                  background:"rgba(74,222,128,0.1)",color:"#4ade80",
                                  border:"1px solid rgba(74,222,128,0.3)",textDecoration:"none"}}>
                                {t} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Venue cards - same style as 已開放預約, date chips = manual links */}
      {LID_VENUES.map(v => (
        <RealtimeVCard key={v.id} v={VENUES.find(vv=>vv.id===v.id)} lid={v.lid}
          now={now} weekendDates={weekendDates} favs={favs} togFav={togFav}
          todayClicked={todayClicked} markClicked={markClicked} showToast={showToast}/>
      ))}
    </div>
  );
}

// VCard for realtime tab - date chips = direct booking links
function RealtimeVCard({ v, lid, now, weekendDates, favs, togFav, todayClicked, markClicked, showToast }) {
  const [open, setOpen] = useState(false);
  if (!v) return null;
  const isFav  = favs?.has(v.id);
  const booked = todayClicked?.has(v.id);
  const lightCol = {"專業":"#4ade80","普通":"#fbbf24","偏暗":"#f87171"}[v.lighting]||"#94a3b8";
  const dayName = d => ["日","一","二","三","四","五","六"][d.getDay()];
  const dayCol  = d => DAY_COLOR[d.getDay()];

  return (
    <div style={{...S.card,...(isFav?{borderColor:"rgba(251,191,36,0.22)"}:{})}}>
      <div style={{padding:"11px 12px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700}}>{v.name}</span>
              {isFav && <span>⭐</span>}
              {booked && <span style={{fontSize:10,color:"#64748b",background:"#1e293b",padding:"1px 6px",borderRadius:5}}>今日已點</span>}
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{v.floor} · {v.courts}面 · {v.openHours}</div>
            <div style={{fontSize:11,color:"#475569",marginTop:2,display:"flex",alignItems:"center",flexWrap:"wrap",gap:5}}>
              <span>📍 {v.address}</span>
              <a href={v.officialUrl} target="_blank" rel="noreferrer"
                style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",textDecoration:"none"}}>
                官網↗
              </a>
            </div>
          </div>
          <button onClick={()=>togFav&&togFav(v.id)}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"2px 4px",color:isFav?"#fbbf24":"#334155"}}>
            {isFav?"⭐":"☆"}
          </button>
        </div>

        {/* 可預約到 */}
        {v.adv && (
          <div style={{marginTop:6,padding:"5px 9px",borderRadius:7,background:"rgba(96,165,250,0.07)",display:"flex",alignItems:"center"}}>
            <span style={{fontSize:10,color:"#64748b"}}>可預約到</span>
            <span style={{fontSize:12,fontWeight:700,color:"#93c5fd",marginLeft:5}}>{fmtD(getUntil(v.adv,now))}</span>
          </div>
        )}

        {/* Date chips as booking links */}
        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:8}}>
          {weekendDates.map(d => {
            const col = dayCol(d);
            const url = buildBookingUrl(lid, d);
            return (
              <a key={d.toISOString()} href={url} target="_blank" rel="noreferrer"
                onClick={()=>showToast&&showToast(`開啟 ${v.name} ${d.getMonth()+1}/${d.getDate()} 預約頁`)}
                style={{
                  padding:"5px 10px",borderRadius:8,textDecoration:"none",textAlign:"center",minWidth:60,
                  border:`1px solid ${col}55`,background:`rgba(${col==="4ade80"?"74,222,128":col==="6366f1"?"99,102,241":"96,165,250"},0.07)`,
                  color:col,
                }}>
                <div style={{fontWeight:700,fontSize:11}}>{d.getMonth()+1}/{d.getDate()}（{dayName(d)}）</div>
                <div style={{fontSize:9,marginTop:1,opacity:0.8}}>手動查看↗</div>
              </a>
            );
          })}
        </div>

        {v.note && <div style={{...S.note,marginTop:7}}>📌 {v.note}</div>}
      </div>

      {/* Phone + booking */}
      <div style={S.cardBtns}>
        <a href={`tel:${v.phone}`} style={S.phoneBtn}>📞 {v.phone}</a>
        <a href={v.bookingUrl} target="_blank" rel="noreferrer" onClick={()=>markClicked&&markClicked(v.id)}
          style={{...S.bookBtn,...(booked?{background:"rgba(100,116,139,0.1)",borderColor:"#334155",color:"#64748b"}:{})}}>
          {booked?"✅ 今日已點過":"前往預約 →"}
        </a>
      </div>

      <button onClick={()=>setOpen(o=>!o)} style={S.expandBtn}>
        {open?"▲ 收起詳情":"▼ 詳情（照片、費用、停車、評論）"}
      </button>

      {open && (
        <div style={{padding:"12px 12px 14px",borderTop:"1px solid #1e293b"}}>
          {/* Photos */}
          <div style={{display:"flex",gap:7,overflowX:"auto",marginBottom:12}}>
            {v.photos.map((p,i)=>(
              <img key={i} src={p} alt={v.name}
                style={{width:160,height:107,objectFit:"cover",borderRadius:9,flexShrink:0}}
                onError={e=>e.target.style.display="none"}/>
            ))}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            <span style={{fontSize:11,padding:"4px 9px",borderRadius:7,color:lightCol,border:`1px solid ${lightCol}44`,background:"rgba(0,0,0,0.25)"}}>💡 燈光：{v.lighting}</span>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(v.name+" "+v.district)}`}
              target="_blank" rel="noreferrer"
              style={{fontSize:11,padding:"4px 9px",borderRadius:7,background:"rgba(96,165,250,0.08)",color:"#60a5fa",textDecoration:"none",border:"1px solid rgba(96,165,250,0.25)"}}>
              🧭 Google地圖
            </a>
          </div>
          {/* Pricing */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>時段費用</div>
            {v.pricing.map((p,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 10px",borderRadius:8,background:i%2?"#0a1018":"#0d1520",marginBottom:3}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:i===0?"#93c5fd":"#f97316"}}>{p.label}</span>
                  <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{p.times}</div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0",whiteSpace:"nowrap",marginLeft:8}}>{p.price}</span>
              </div>
            ))}
          </div>
          {/* Parking */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>停車資訊</div>
            {[["🚗 汽車",v.parking.car],["🏍 室內機車",v.parking.motoIn],["🏍 室外機車",v.parking.motoOut]].map(([label,val])=>(
              <div key={label} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #1e293b"}}>
                <span style={{fontSize:11,color:"#64748b",minWidth:76}}>{label}</span>
                <span style={{fontSize:11,color:"#94a3b8"}}>{val}</span>
              </div>
            ))}
          </div>
          {/* Reviews */}
          <div>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>精選評論</div>
            {v.reviews.map((r,i)=>(
              <div key={i} style={{padding:"8px 10px",borderRadius:8,background:"#0a1018",marginBottom:5}}>
                <div style={{fontSize:11,color:"#e2e8f0",lineHeight:1.6}}>「{r.text}」</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:10,color:"#64748b"}}>— {r.author}</span>
                  <span style={{fontSize:10}}>{"⭐".repeat(r.stars)}</span>
                </div>
              </div>
            ))}
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(v.name+" "+v.district)}`}
              target="_blank" rel="noreferrer" style={{fontSize:11,color:"#60a5fa",textDecoration:"none"}}>
              查看 Google 完整評論 ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextWeekendDates(now) {
  const result = [], d = new Date(now);
  d.setHours(0,0,0,0);
  while (result.length < 3) {
    d.setDate(d.getDate()+1);
    if ([5,6,0].includes(d.getDay())) result.push(new Date(d));
  }
  return result;
}


function CollapsibleGroup({ g, now, weekends, favs, togFav, todayClicked, markClicked, showToast, loc }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
        <div style={{marginBottom:20}}>
          {/* Group header - collapsible */}
          <button onClick={()=>setCollapsed(c=>!c)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,marginBottom:collapsed?0:8,padding:"7px 12px",borderRadius:10,background:"rgba(74,222,128,0.06)",border:"1px solid rgba(74,222,128,0.2)",cursor:"pointer",textAlign:"left"}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block",flexShrink:0,boxShadow:"0 0 6px #4ade80"}}/>
            <span style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>目前可預約到 {fmtD(g.until)}</span>
            <span style={{fontSize:11,color:"#475569",marginLeft:"auto"}}>{g.venues.length} 個場館</span>
            <span style={{fontSize:11,color:"#4ade80"}}>{collapsed?"▶":"▼"}</span>
          </button>
          {!collapsed && <div>
          {/* Sort by distance if loc, else by name */}
          {[...g.venues]
            .sort((a,b) => loc ? getDist(a,loc)-getDist(b,loc) : a.name.localeCompare(b.name,"zh"))
            .map(v => (
              <VCard key={v.id} v={v} now={now} weekends={weekends} favs={favs} togFav={togFav}
                todayClicked={todayClicked} markClicked={markClicked} showToast={showToast} loc={loc}/>
            ))
          }
          </div>}
        </div>
  );
}
// ── VCard ─────────────────────────────────────────────────────────────────────
function VCard({ v, now, weekends, favs, togFav, todayClicked, markClicked, showToast, loc }) {
  const [open, setOpen]           = useState(false);
  const [showDates, setShowDates] = useState(true);
  const isFav   = favs.has(v.id);
  const booked  = todayClicked.has(v.id);
  const dist    = getDist(v, loc);
  const rel     = weekends.filter(d => isInWin(v,d,now));
  const lightCol = {"專業":"#4ade80","普通":"#fbbf24","偏暗":"#f87171"}[v.lighting]||"#94a3b8";
  return (
    <div style={{...S.card,...(isFav?{borderColor:"rgba(251,191,36,0.22)"}:{})}}>
      <div style={{padding:"11px 12px 8px"}}>
        {/* Name row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{fontSize:14,fontWeight:700}}>{v.name}</span>
              {isFav && <span style={{fontSize:11}}>⭐</span>}
              {booked && <span style={{fontSize:10,color:"#64748b",background:"#1e293b",padding:"1px 6px",borderRadius:5}}>今日已點</span>}
            </div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{v.floor} · {v.courts}面 · {v.openHours}</div>
            {/* Address + 官網 button */}
            <div style={{fontSize:11,color:"#475569",marginTop:3,display:"flex",alignItems:"center",flexWrap:"wrap",gap:5}}>
              <span>📍 {v.address}{dist?` (${dist}km)`:""}</span>
              <a href={v.officialUrl} target="_blank" rel="noreferrer"
                style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",textDecoration:"none",flexShrink:0}}>
                官網 ↗
              </a>
            </div>
          </div>
          <button onClick={()=>togFav(v.id)}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:"2px 4px",color:isFav?"#fbbf24":"#334155",flexShrink:0}}>
            {isFav?"⭐":"☆"}
          </button>
        </div>
        {/* Date chips - collapsible */}
        {rel.length>0 && (
          <div style={{marginTop:8}}>
            <button onClick={()=>setShowDates(s=>!s)} style={{display:"flex",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"0 0 5px 0",color:"#64748b",fontSize:11}}>
              <span style={{fontSize:9}}>{showDates?"▼":"▶"}</span>
              <span>可搶日期 ({rel.length})</span>
            </button>
            {showDates && <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {rel.map(d => {
              const ot=getOpenTime(v,d), ok=canNow(v,d,now), opn=ot&&now>=ot;
              return (
                <div key={d.toISOString()} style={{padding:"5px 9px",borderRadius:8,textAlign:"center",minWidth:56,
                  border:`1px solid ${ok?"rgba(74,222,128,0.5)":opn?"#1e293b":dc(d)+"55"}`,
                  background:ok?"rgba(74,222,128,0.07)":"transparent",
                  color:ok?"#4ade80":opn?"#374151":dc(d),
                  opacity:opn&&!ok?0.4:1}}>
                  <div style={{fontWeight:700,fontSize:11}}>{fmtS(d)}</div>
                  <div style={{fontSize:9,marginTop:1}}>{ok?"✅可搶":opn?"已開":ot?`${ot.getMonth()+1}/${ot.getDate()} ${fmtH(v.sh)}起`:"—"}</div>
                </div>
              );
            })}
            </div>}
          </div>
        )}
        {v.onsiteOnly && <div style={{...S.note,marginTop:7,color:"#fbbf24"}}>⚠ 僅電話/現場 · {v.onsiteAdv}天內</div>}
        {v.note && <div style={{...S.note,marginTop:5}}>📌 {v.note}</div>}
      </div>
      {/* Action buttons */}
      <div style={S.cardBtns}>
        <a href={`tel:${v.phone}`} style={S.phoneBtn}>📞 {v.phone}</a>
        <a href={v.bookingUrl} target="_blank" rel="noreferrer" onClick={()=>markClicked(v.id)}
          style={{...S.bookBtn,...(booked?{background:"rgba(100,116,139,0.1)",borderColor:"#334155",color:"#64748b"}:{})}}>
          {booked?"✅ 今日已點過":"前往預約 →"}
        </a>
      </div>
      {/* Expand toggle */}
      <button onClick={()=>setOpen(o=>!o)} style={S.expandBtn}>
        {open?"▲ 收起詳情":"▼ 詳情（照片、費用、停車、評論）"}
      </button>
      {/* Detail section – no duplicate info */}
      {open && (
        <div style={{padding:"12px 12px 14px",borderTop:"1px solid #1e293b"}}>
          {/* Photos */}
          <div style={{display:"flex",gap:7,overflowX:"auto",marginBottom:12}}>
            {v.photos.map((p,i) => (
              <img key={i} src={p} alt={v.name} style={{width:160,height:107,objectFit:"cover",borderRadius:9,flexShrink:0}}
                onError={e=>e.target.style.display="none"}/>
            ))}
          </div>
          {/* Lighting + nav */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            <span style={{fontSize:11,padding:"4px 9px",borderRadius:7,color:lightCol,border:`1px solid ${lightCol}44`,background:"rgba(0,0,0,0.25)"}}>💡 燈光：{v.lighting}</span>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(v.name+" "+v.district)}`}
              target="_blank" rel="noreferrer"
              style={{fontSize:11,padding:"4px 9px",borderRadius:7,background:"rgba(96,165,250,0.08)",color:"#60a5fa",textDecoration:"none",border:"1px solid rgba(96,165,250,0.25)"}}>
              🧭 Google導航
            </a>
          </div>
          {/* Pricing */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>時段費用</div>
            {v.pricing.map((p,i) => (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"7px 10px",borderRadius:8,background:i%2?"#0a1018":"#0d1520",marginBottom:3}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:i===0?"#93c5fd":"#f97316"}}>{p.label}</span>
                  <div style={{fontSize:10,color:"#64748b",marginTop:1}}>{p.times}</div>
                </div>
                <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0",whiteSpace:"nowrap",marginLeft:8}}>{p.price}</span>
              </div>
            ))}
          </div>
          {/* Parking */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>停車資訊</div>
            {[["🚗 汽車",v.parking.car],["🏍 室內機車",v.parking.motoIn],["🏍 室外機車",v.parking.motoOut]].map(([label,val]) => (
              <div key={label} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:"1px solid #1e293b"}}>
                <span style={{fontSize:11,color:"#64748b",minWidth:76}}>{label}</span>
                <span style={{fontSize:11,color:"#94a3b8"}}>{val}</span>
              </div>
            ))}
          </div>
          {/* Payment reminders */}
          {rel.filter(d=>canNow(v,d,now)).length>0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>💳 繳費截止提醒</div>
              {v.payNote && <div style={{fontSize:10,color:"#fbbf24",background:"rgba(245,158,11,0.06)",padding:"5px 8px",borderRadius:6,marginBottom:6,border:"1px solid rgba(245,158,11,0.2)"}}>⚠ {v.payNote}</div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {rel.filter(d=>canNow(v,d,now)).map(d => {
                  const dl=addDays(sod(d),-3);
                  return (
                    <button key={d.toISOString()} onClick={()=>{
                      const t=new Date(dl); t.setHours(9,0,0,0);
                      dlICS([mkEVT(`💳 繳費截止 ${v.name}`,`${fmtD(d)} 場地，最晚 ${fmtD(dl)} 前繳費`,t)],"繳費提醒.ics");
                      showToast("已下載繳費提醒");
                    }} style={{padding:"5px 9px",borderRadius:7,border:"1px solid rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.06)",color:"#fbbf24",fontSize:11,cursor:"pointer"}}>
                      搶{fmtS(d)} → {fmtD(dl).slice(0,fmtD(dl).indexOf("（"))}前繳
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Reviews */}
          <div>
            <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>精選評論</div>
            {v.reviews.map((r,i) => (
              <div key={i} style={{padding:"8px 10px",borderRadius:8,background:"#0a1018",marginBottom:5}}>
                <div style={{fontSize:11,color:"#e2e8f0",lineHeight:1.6}}>「{r.text}」</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  <span style={{fontSize:10,color:"#64748b"}}>— {r.author}</span>
                  <span style={{fontSize:10}}>{"⭐".repeat(r.stars)}</span>
                </div>
              </div>
            ))}
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(v.name+" "+v.district)}`}
              target="_blank" rel="noreferrer" style={{fontSize:11,color:"#60a5fa",textDecoration:"none"}}>
              查看 Google 完整評論 ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MapView ───────────────────────────────────────────────────────────────────
function MapView({ venues, now, weekends, favs, togFav, todayClicked, markClicked, showToast, loc }) {
  const mapRef    = useRef(null);
  const mapDivRef = useRef(null);
  const mrkRef    = useRef({});
  const selCardRef= useRef(null);
  const [ready, setReady] = useState(!!window.L);
  const [selId, setSelId] = useState(null);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link=document.createElement("link"); link.rel="stylesheet"; link.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(link);
    const s=document.createElement("script"); s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload=()=>setReady(true); document.body.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !mapDivRef.current || mapRef.current) return;
    const L=window.L;
    const map=L.map(mapDivRef.current,{center:[25.04,121.53],zoom:11}); mapRef.current=map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:18}).addTo(map);
    venues.forEach(v => {
      const icon=L.divIcon({html:`<div style="width:14px;height:14px;border-radius:50%;background:#4ade80;border:2px solid #fff;box-shadow:0 0 8px #4ade80"></div>`,className:"",iconSize:[14,14],iconAnchor:[7,7]});
      const m=L.marker([v.lat,v.lng],{icon}).addTo(map);
      m.on("click",()=>{
        setSelId(id => {
          const next = id===v.id ? null : v.id;
          return next;
        });
      });
      mrkRef.current[v.id]={m,L};
    });
    return () => { if(mapRef.current){mapRef.current.remove();mapRef.current=null;} };
  }, [ready]);

  // Scroll to top of page when venue selected
  useEffect(() => {
    if (selId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selId]);

  // Update marker sizes
  useEffect(() => {
    if (!mapRef.current) return;
    venues.forEach(v => {
      const e=mrkRef.current[v.id]; if(!e) return;
      const isSel=selId===v.id, sz=isSel?18:13;
      e.m.setIcon(e.L.divIcon({html:`<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:#4ade80;border:${isSel?"3px":"2px"} solid #fff;box-shadow:0 0 ${isSel?"16":"8"}px #4ade80"></div>`,className:"",iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]}));
    });
  }, [selId]);

  const selVenue = venues.find(v=>v.id===selId);

  return (
    <div>
      <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #1e293b",marginBottom:10}}>
        {!ready && <div style={{height:280,display:"flex",alignItems:"center",justifyContent:"center",background:"#08111e",color:"#64748b"}}>🗺 地圖載入中…</div>}
        <div ref={mapDivRef} style={{height:280,display:ready?"block":"none"}}/>
        <div style={{background:"#08111e",padding:"4px 10px 5px",fontSize:10,color:"#475569"}}>
          <span style={{color:"#4ade80"}}>●</span> 現可搶場館 · 點標記查看詳情
        </div>
      </div>

      {/* Selected card pinned at top with ref for scroll */}
      {selVenue && (
        <div ref={selCardRef} style={{marginBottom:8,borderRadius:13,border:"2px solid rgba(74,222,128,0.5)",overflow:"hidden"}}>
          <VCard v={selVenue} now={now} weekends={weekends} favs={favs} togFav={togFav}
            todayClicked={todayClicked} markClicked={markClicked} showToast={showToast} loc={loc}/>
        </div>
      )}

      {/* Compact list */}
      {venues.map(v => (
        <button key={v.id} onClick={()=>setSelId(id=>id===v.id?null:v.id)}
          style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 11px",borderRadius:9,marginBottom:5,cursor:"pointer",textAlign:"left",
            border:`1px solid ${selId===v.id?"rgba(74,222,128,0.5)":"#1e293b"}`,
            background:selId===v.id?"rgba(74,222,128,0.05)":"#0f1923"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:"#4ade80",display:"inline-block",flexShrink:0,boxShadow:"0 0 5px #4ade80"}}/>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{v.name}</div>
              <div style={{fontSize:10,color:"#64748b"}}>{v.district} · {v.floor} · {v.courts}面</div>
            </div>
          </div>
          <span style={{fontSize:10,color:"#4ade80",fontWeight:700,flexShrink:0}}>可搶</span>
        </button>
      ))}
    </div>
  );
}
// ── PlanTab ───────────────────────────────────────────────────────────────────
function PlanTab({ now, favs, showToast }) {
  const [selDates, setSelDates] = useState([]);
  const [selIds,   setSelIds]   = useState(VENUES.map(v=>v.id));
  const [showVL,   setShowVL]   = useState(false);
  const [repeat,   setRepeat]   = useState(0);
  const [calMonth, setCalMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const togDate = d => {
    const k=sod(d).toISOString();
    setSelDates(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);
  };
  const isSel   = d => selDates.includes(sod(d).toISOString());
  const togV    = id => setSelIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const quickV  = mode => {
    if (mode==="fav")  return setSelIds(favs.size?[...favs]:VENUES.map(v=>v.id));
    if (mode==="all")  return setSelIds(VENUES.map(v=>v.id));
    if (mode==="tp")   return setSelIds(VENUES.filter(v=>v.city==="台北市").map(v=>v.id));
    if (mode==="ntpc") return setSelIds(VENUES.filter(v=>v.city==="新北市").map(v=>v.id));
  };
  const isQuickOn = mode => {
    if (mode==="fav")  return favs.size>0&&selIds.length===favs.size&&[...favs].every(id=>selIds.includes(id));
    if (mode==="all")  return selIds.length===VENUES.length;
    const cv=VENUES.filter(v=>v.city===(mode==="tp"?"台北市":"新北市"));
    return selIds.length===cv.length&&cv.every(v=>selIds.includes(v.id));
  };

  // Build all dates with repeat
  const baseDates=getUpcoming(now,42).filter(d=>isSel(d));
  const dateMap=new Map();
  baseDates.forEach(d=>{
    dateMap.set(sod(d).toISOString(),d);
    for(let w=1;w<=repeat;w++){const r=addDays(d,w*7);dateMap.set(sod(r).toISOString(),r);}
  });
  const allDates=[...dateMap.values()].sort((a,b)=>a-b);

  // Build groups – KEY FIX: include ALL future dates, not just those within window
  // For each (venue, targetDate) where targetDate > today and venue is not onsiteOnly,
  // compute when booking opens (may be in the future) and group by that time
  const groupMap=new Map();
  VENUES.filter(v=>selIds.includes(v.id)&&!v.onsiteOnly&&v.adv).forEach(v=>{
    allDates.forEach(d=>{
      const diff=Math.round((sod(d)-sod(now))/86400000);
      if(diff<=0) return;                      // skip past dates
      if(v.minD&&diff<v.minD) return;          // skip if too close (e.g. wanhua 8-day min)
      const ot=getOpenTime(v,d); if(!ot) return;
      const k=ot.toISOString();
      if(!groupMap.has(k)) groupMap.set(k,{ot,items:[]});
      groupMap.get(k).items.push({v,d,ot});
    });
  });
  const sorted=[...groupMap.values()].sort((a,b)=>a.ot-b.ot);

  const addAllICS=()=>{
    if(!sorted.length){showToast("請先選擇日期與場館");return;}
    const evts=[];
    sorted.forEach(g=>{
      const names=g.items.map(i=>i.v.name).join("、");
      const targets=[...new Set(g.items.map(i=>fmtD(i.d)))].join("/");
      evts.push(mkEVT(`🏸 搶場！${targets}`,`${fmtH(g.ot.getHours())} 開搶\n${names}`,g.ot));
      g.items.forEach(item=>{
        const dl=new Date(addDays(sod(item.d),-3));dl.setHours(9,0,0,0);
        evts.push(mkEVT(`💳 繳費截止 ${item.v.name}`,`${fmtD(item.d)} 場地繳費截止`,dl));
      });
    });
    dlICS(evts,"搶場計畫.ics");
    showToast(`已下載 ${sorted.length} 個開搶時段提醒`);
  };

  const shareLineAll=()=>{
    if(!sorted.length){showToast("請先選擇日期");return;}
    const lines=sorted.map(g=>{
      const names=g.items.map(i=>i.v.name).join("、");
      const targets=[...new Set(g.items.map(i=>fmtD(i.d)))].join("/");
      return `⏰ ${fmtD(g.ot)} ${fmtH(g.ot.getHours())} 開搶\n🎯 ${targets}\n📍 ${names}`;
    }).join("\n\n");
    window.open(`https://line.me/R/share?text=${encodeURIComponent("🏸 搶場計畫\n"+lines)}`);
  };

  const calDays=()=>{
    const y=calMonth.getFullYear(),m=calMonth.getMonth(),days=[];
    for(let i=0;i<new Date(y,m,1).getDay();i++) days.push(null);
    for(let d=1;d<=new Date(y,m+1,0).getDate();d++) days.push(new Date(y,m,d));
    return days;
  };

  return (
    <div>
      {/* ① Calendar */}
      <div style={S.planBox}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={S.planTitle}>① 選擇打球日期</div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))} style={S.calNav}>‹</button>
            <span style={{fontSize:11,color:"#94a3b8",minWidth:55,textAlign:"center"}}>{calMonth.getFullYear()}/{calMonth.getMonth()+1}</span>
            <button onClick={()=>setCalMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))} style={S.calNav}>›</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1,marginBottom:4}}>
          {WD.map((w,i)=><div key={w} style={{textAlign:"center",fontSize:10,color:DAY_COLOR[i],fontWeight:600,padding:"2px 0"}}>{w}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {calDays().map((d,i)=>{
            if(!d) return <div key={i}/>;
            const isPast=sod(d)<=sod(now),on=isSel(d);
            return (
              <button key={i} disabled={isPast} onClick={()=>togDate(d)} style={{
                padding:"5px 2px",borderRadius:7,cursor:isPast?"default":"pointer",
                border:`1px solid ${on?dc(d):"transparent"}`,
                background:on?DAY_BG[d.getDay()]:"transparent",
                opacity:isPast?0.2:1,textAlign:"center"}}>
                <div style={{fontSize:12,fontWeight:on?700:400,color:on?dc(d):"#94a3b8"}}>{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        {selDates.length>0&&<div style={{marginTop:5,fontSize:10,color:"#64748b"}}>已選 {selDates.length} 天</div>}
      </div>

      {/* ② Venue selection */}
      <div style={S.planBox}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={S.planTitle}>② 選擇場館 <span style={{color:"#64748b",fontSize:11,fontWeight:400}}>（{selIds.length}/{VENUES.length}）</span></div>
          <button onClick={()=>setShowVL(p=>!p)} style={{fontSize:11,color:"#60a5fa",background:"none",border:"none",cursor:"pointer"}}>{showVL?"收起▲":"展開▼"}</button>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:7}}>
          {[["fav","⭐ 最愛"],["all","全選"],["tp","台北市"],["ntpc","新北市"]].map(([m,l])=>(
            <button key={m} onClick={()=>quickV(m)} style={{...S.chip,...(isQuickOn(m)?S.chipOn:{})}}>{l}</button>
          ))}
        </div>
        {showVL&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>
            {VENUES.map(v=>{const on=selIds.includes(v.id);return(
              <button key={v.id} onClick={()=>togV(v.id)} style={{padding:"3px 8px",borderRadius:7,fontSize:11,cursor:"pointer",
                border:`1px solid ${on?"#4ade80":"#1e293b"}`,background:on?"rgba(74,222,128,0.08)":"transparent",color:on?"#4ade80":"#64748b"}}>
                {on?"✓ ":""}{v.name}
              </button>
            );})}
          </div>
        )}
      </div>

      {/* ③ Repeat */}
      <div style={S.planBox}>
        <div style={S.planTitle}>③ 重複週數</div>
        <div style={{display:"flex",gap:5}}>
          {[[0,"不重複"],[2,"再+2週"],[4,"再+4週"]].map(([n,l])=>(
            <button key={n} onClick={()=>setRepeat(n)} style={{...S.chip,...(repeat===n?S.chipOn:{})}}>{l}</button>
          ))}
        </div>
      </div>

      {selDates.length===0&&<div style={S.empty}>請先在月曆點選打球日期 ↑</div>}

      {/* Results */}
      {sorted.length>0&&(
        <div>
          <div style={{fontSize:11,color:"#64748b",padding:"4px 2px 8px"}}>共 {sorted.length} 個開搶時段</div>
          {sorted.map(g=>{
            const isPast=g.ot<now, isNear=!isPast&&g.ot-now<3600000;
            const col=isPast?"#64748b":isNear?"#4ade80":"#60a5fa";
            const copyG=()=>navigator.clipboard.writeText(
              `🏸 搶場提醒\n⏰ ${fmtD(g.ot)} ${fmtH(g.ot.getHours())} 開搶\n`+
              g.items.map(i=>`• ${i.v.name} → 搶 ${fmtD(i.d)}`).join("\n")
            ).then(()=>showToast("已複製！"));
            return (
              <div key={g.ot.toISOString()} style={S.gCard}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>開搶時間</div>
                    <div style={{fontSize:14,fontWeight:700,color:col}}>
                      {isPast&&<span style={{fontSize:10,marginRight:3,opacity:0.6}}>（已過）</span>}
                      {fmtD(g.ot)} {fmtH(g.ot.getHours())}
                    </div>
                    <div style={{fontSize:10,color:"#475569",marginTop:1}}>
                      {g.items.length}個場館 · 搶 {[...new Set(g.items.map(i=>fmtD(i.d)))].join(" / ")}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:4}}>
                    <button onClick={copyG} style={S.smBtn}>💬</button>
                    <button onClick={()=>{dlICS([mkEVT(`🏸 搶場`,g.items.map(i=>i.v.name).join("、"),g.ot)]);showToast("已下載");}}
                      style={{...S.smBtn,background:"rgba(96,165,250,0.1)",borderColor:"rgba(96,165,250,0.3)",color:"#93c5fd"}}>📅</button>
                  </div>
                </div>
                {g.items.map((item,i)=>(
                  <div key={i} style={S.gItem}>
                    <div>
                      <span style={{fontSize:13,fontWeight:600}}>{item.v.name}</span>
                      <span style={{fontSize:11,color:"#64748b",marginLeft:4}}>{item.v.district}</span>
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#94a3b8"}}>搶{fmtS(item.d)}</span>
                      <a href={item.v.bookingUrl} target="_blank" rel="noreferrer"
                        style={{fontSize:11,color:"#4ade80",textDecoration:"none",padding:"2px 6px",border:"1px solid rgba(74,222,128,0.3)",borderRadius:5}}>預約↗</a>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
          {/* Action buttons at bottom of results */}
          <div style={{display:"flex",gap:7,marginTop:8,paddingTop:12,borderTop:"1px solid #1e293b"}}>
            <button onClick={addAllICS}    style={{...S.allBtn,flex:1}}>📅 全加行事曆</button>
            <button onClick={shareLineAll} style={{...S.allBtn,flex:1,background:"rgba(74,222,128,0.04)"}}>💬 分享 LINE</button>
          </div>
        </div>
      )}
    </div>
  );
}

const S={
  root:{minHeight:"100vh",background:"#07090f",color:"#e2e8f0",fontFamily:"'Noto Sans TC','PingFang TC',sans-serif",maxWidth:480,margin:"0 auto"},
  hdr:{background:"#0d1521",borderBottom:"1px solid #1e293b",position:"sticky",top:0,zIndex:10},
  tabBar:{display:"flex",borderTop:"1px solid #1e293b"},
  tab:{flex:1,padding:"12px 8px",background:"none",border:"none",color:"#64748b",fontSize:13,fontWeight:500,cursor:"pointer",borderBottom:"2px solid transparent"},
  tabOn:{color:"#e2e8f0",borderBottomColor:"#4ade80"},
  body:{padding:"12px 12px 80px"},
  chip:{padding:"4px 12px",borderRadius:20,border:"1px solid #1e293b",background:"transparent",color:"#64748b",fontSize:12,cursor:"pointer"},
  chipOn:{borderColor:"#4ade80",background:"rgba(74,222,128,0.1)",color:"#4ade80"},
  empty:{textAlign:"center",color:"#475569",fontSize:13,padding:"44px 20px",lineHeight:2},
  card:{background:"#0f1923",border:"1px solid #1e293b",borderRadius:13,marginBottom:10,overflow:"hidden"},
  note:{padding:"5px 9px",borderRadius:7,background:"#0a1018",fontSize:11,color:"#94a3b8"},
  cardBtns:{display:"flex",gap:6,padding:"6px 11px"},
  phoneBtn:{flex:1,padding:"9px 5px",borderRadius:9,textAlign:"center",background:"#111827",border:"1px solid #1e293b",color:"#94a3b8",fontSize:11,textDecoration:"none"},
  bookBtn:{flex:1.6,padding:"9px 5px",borderRadius:9,textAlign:"center",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.25)",color:"#4ade80",fontSize:13,fontWeight:700,textDecoration:"none"},
  expandBtn:{width:"100%",padding:"8px",background:"#0a1018",border:"none",borderTop:"1px solid #1e293b",color:"#64748b",fontSize:11,cursor:"pointer"},
  planBox:{background:"#0f1923",border:"1px solid #1e293b",borderRadius:13,padding:"12px 12px 13px",marginBottom:10},
  planTitle:{fontSize:13,fontWeight:700,marginBottom:8},
  calNav:{padding:"2px 8px",borderRadius:6,border:"1px solid #1e293b",background:"transparent",color:"#94a3b8",cursor:"pointer",fontSize:14},
  allBtn:{padding:"12px",borderRadius:10,border:"1px solid rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.07)",color:"#4ade80",fontSize:13,fontWeight:700,cursor:"pointer"},
  gCard:{background:"#0f1923",border:"1px solid #1e293b",borderRadius:12,padding:"11px",marginBottom:8},
  gItem:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",borderRadius:7,background:"#0a1018",marginBottom:3},
  smBtn:{padding:"5px 8px",borderRadius:7,border:"1px solid #1e293b",background:"#111827",color:"#94a3b8",fontSize:13,cursor:"pointer"},
  toast:{position:"fixed",bottom:26,left:"50%",transform:"translateX(-50%)",background:"#1e293b",color:"#e2e8f0",padding:"9px 20px",borderRadius:20,fontSize:13,fontWeight:600,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,0.5)",whiteSpace:"nowrap"},
};
