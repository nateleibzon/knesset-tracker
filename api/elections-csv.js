const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const knesset = req.query.knesset || '25';
  const allowed = ['21', '22', '23', '24', '25'];
  if (!allowed.includes(knesset)) return res.status(400).send('Invalid knesset number');

  const url = `https://media${knesset}.bechirot.gov.il/files/expb.csv`;

  const fetchCsv = (targetUrl) => new Promise((resolve, reject) => {
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://votes${knesset}.bechirot.gov.il/`,
        'Accept': 'text/csv,text/plain,*/*',
      }
    }, (r) => {
      if ((r.statusCode === 301 || r.statusCode === 302) && r.headers.location) {
        return fetchCsv(r.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks).toString('latin1')));
    }).on('error', reject);
  });

  try {
    const body = await fetchCsv(url);
    return res.status(200).send(body);
  } catch (err) {
    return res.status(502).send(`Error: ${err.message}`);
  }
};
