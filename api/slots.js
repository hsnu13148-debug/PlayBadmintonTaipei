// api/slots.js - V26.5.6.2
// Uses the real AJAX API: findAllowBookingList
// Returns only available slots directly - no HTML parsing needed

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { lid, date } = req.query;
  if (!lid || !date) return res.status(400).json({ error: 'Missing lid or date' });

  const apiUrl = `https://booking-tpsc.sporetrofit.com/Location/findAllowBookingList?LID=${lid}&categoryId=Badminton&useDate=${date}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${date}`,
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream ${response.status}` });
    }

    const data = await response.json();

    // data is an array of available slot objects
    // Each item should have time/useTime field
    const available = [];
    const timesSeen = new Set();

    const items = Array.isArray(data) ? data :
                  data.data ? data.data :
                  data.rows ? data.rows :
                  data.list ? data.list : [];

    items.forEach(item => {
      // Try common field names for time
      const raw = item.UseTime || item.useTime || item.time || item.Time ||
                  item.startTime || item.StartTime || item.timeSlot || '';
      if (!raw) return;
      const t = raw.toString().replace(' - ', '–').replace('- ', '–').replace(' -', '–').trim();
      if (!timesSeen.has(t)) {
        timesSeen.add(t);
        available.push(t);
      }
    });

    available.sort();

    res.status(200).json({
      lid,
      date,
      available,
      total: items.length,
      raw_sample: items.slice(0, 2), // for debugging
    });

  } catch (err) {
    console.error('Slots API error:', err);
    res.status(500).json({ error: err.message });
  }
}
