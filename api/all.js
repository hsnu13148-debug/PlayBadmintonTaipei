// api/all.js - V26.5.7
// One-click query: all sporetrofit LID venues for a given date.
// Throttled (concurrency 2) — parallel requests to the booking server fail intermittently.

const VENUES = [
  { lid: 'JJSC', name: '中正運動中心' },
  { lid: 'NHSC', name: '內湖運動中心' },
  { lid: 'WSSC', name: '文山運動中心' },
  { lid: 'DASC', name: '大安運動中心' },
  { lid: 'SLSC', name: '士林運動中心' },
  { lid: 'WHSC', name: '萬華運動中心' },
  { lid: 'BTSC', name: '北投運動中心' },
];

async function fetchVenue(lid, date) {
  const apiUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${date}`;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${date}`,
      },
      body: '_search=false&rows=200&page=1&sidx=&sord=asc',
      signal: AbortSignal.timeout(8000),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return { lid, error: 'not_json' }; }

    if (data.errorMsg) return { lid, error: 'no_data', msg: data.errorMsg };

    const rows = data.rows || [];
    const slotMap = {};
    rows.forEach(item => {
      const startH = item.StartTime?.Hours;
      const endH   = item.EndTime?.Hours;
      if (startH == null || endH == null) return;
      const t = `${String(startH).padStart(2,'0')}:00–${String(endH).padStart(2,'0')}:00`;
      if (!slotMap[t]) slotMap[t] = { avail: 0, booked: 0 };
      if (item.allowBooking === 'Y') slotMap[t].avail++;
      else slotMap[t].booked++;
    });

    const available = Object.entries(slotMap)
      .filter(([, v]) => v.avail > 0)
      .map(([t, v]) => ({ time: t, courts: v.avail }))
      .sort((a, b) => a.time.localeCompare(b.time));

    return { lid, available, total: rows.length };
  } catch (err) {
    return { lid, error: err.name === 'TimeoutError' ? 'timeout' : err.message };
  }
}

// Run tasks with limited concurrency
async function runPool(tasks, limit) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });

  const tasks = VENUES.map(v => () => fetchVenue(v.lid, date));
  const results = await runPool(tasks, 2);

  res.status(200).json({
    date,
    updatedAt: new Date().toISOString(),
    venues: VENUES.map((v, i) => ({ name: v.name, ...results[i] })),
  });
};
