// api/slots.js - V26.5.6.2 fix2
// CommonJS format for Vercel serverless functions

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lid, date } = req.query;
  if (!lid || !date) return res.status(400).json({ error: 'Missing lid or date' });

  const apiUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${date}`;

  try {
    // Step 1: Get session cookie from main page
    const mainUrl = `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${date}`;
    const mainRes = await fetch(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-TW,zh;q=0.9',
      },
      redirect: 'follow',
    });

    const cookies = mainRes.headers.get('set-cookie') || '';

    // Step 2: Call the AJAX API with the session cookie
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': mainUrl,
        'Cookie': cookies,
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream ${response.status}`, url: apiUrl });
    }

    const text = await response.text();

    let items = [];
    try {
      const data = JSON.parse(text);
      items = Array.isArray(data) ? data :
              data.data ? data.data :
              data.rows ? data.rows :
              data.list ? data.list : [];
    } catch(e) {
      return res.status(200).json({ available: [], total: 0, raw: text.slice(0, 200) });
    }

    const available = [];
    const seen = new Set();
    items.forEach(item => {
      const raw = item.UseTime || item.useTime || item.time || item.Time || item.startTime || '';
      if (!raw) return;
      const t = raw.toString().replace(' - ', '–').replace('- ', '–').replace(' -', '–').trim();
      if (!seen.has(t)) { seen.add(t); available.push(t); }
    });
    available.sort();

    res.status(200).json({ lid, date, available, total: items.length });

  } catch (err) {
    console.error('Slots error:', err);
    res.status(500).json({ error: err.message });
  }
};
