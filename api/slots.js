// api/slots.js
// Vercel Serverless Function - runs on server, no CORS issues
// Usage: /api/slots?lid=WSSC&date=2026-05-10

export default async function handler(req, res) {
  // CORS headers so browser can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { lid, date } = req.query;

  if (!lid || !date) {
    return res.status(400).json({ error: 'Missing lid or date' });
  }

  const targetUrl = `https://booking-tpsc.sporetrofit.com/Location/BookingList?LID=${lid}&CategoryId=Badminton&UseDate=${date}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'Referer': 'https://booking-tpsc.sporetrofit.com/',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream returned ${response.status}` });
    }

    const html = await response.text();

    // Parse the HTML table
    const available = [];
    const booked = [];

    // Match table rows: extract time and status columns
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    let rowMatch;
    let isFirstRow = true;

    while ((rowMatch = rowRegex.exec(html)) !== null) {
      if (isFirstRow) { isFirstRow = false; continue; } // skip header

      const cells = [];
      let cellMatch;
      const cellRegexLocal = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      while ((cellMatch = cellRegexLocal.exec(rowMatch[1])) !== null) {
        // Strip HTML tags
        const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
        cells.push(text);
      }

      if (cells.length >= 5) {
        const time   = cells[3]?.replace(/\s+/g, ' ').trim();
        const status = cells[4]?.replace(/\s+/g, ' ').trim();

        if (!time) continue;

        const normalized = time.replace(' - ', '–');

        if (status && status.includes('預約') && !status.includes('已被')) {
          if (!available.includes(normalized)) available.push(normalized);
        } else if (status && (status.includes('已被') || status.includes('滿'))) {
          if (!booked.includes(normalized)) booked.push(normalized);
        }
      }
    }

    available.sort();
    booked.sort();

    res.status(200).json({
      lid,
      date,
      available,
      booked,
      total: available.length + booked.length,
    });

  } catch (err) {
    console.error('Slots fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}
