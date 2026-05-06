// api/slots.js - V26.5.6.2 final
// Correct parsing: StartTime.Hours, EndTime.Hours, allowBooking="Y"

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lid, date } = req.query;
  if (!lid || !date) return res.status(400).json({ error: 'Missing lid or date' });

  // Use rows=100 to get all slots in one request (64 rows per venue per day)
  const apiUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${date}&rows=100&page=1`;

  try {
    // Step 1: Get session from main page
    const mainUrl = `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${date}`;
    let cookies = '';
    try {
      const mainRes = await fetch(mainUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'zh-TW,zh;q=0.9',
        },
        redirect: 'follow',
      });
      cookies = mainRes.headers.get('set-cookie') || '';
    } catch(_) {}

    // Step 2: Call the real AJAX API
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': mainUrl,
        'Cookie': cookies,
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream ${response.status}` });
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      return res.status(200).json({
        available: [], booked: [], total: 0,
        error: 'not_json', raw: text.slice(0, 100)
      });
    }

    const rows = data.rows || [];

    // Group by time slot, check if any court has allowBooking="Y"
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
      .map(([t]) => t)
      .sort();

    const booked = Object.entries(slotMap)
      .filter(([, v]) => v.avail === 0)
      .map(([t]) => t)
      .sort();

    res.status(200).json({
      lid, date,
      available,
      booked,
      total: rows.length,
      totalrows: data.paging?.totalrows || rows.length,
    });

  } catch (err) {
    console.error('Slots error:', err);
    res.status(500).json({ error: err.message });
  }
};
