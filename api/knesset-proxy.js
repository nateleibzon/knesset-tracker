const https = require('https');

function fetchUrl(url, reqHeaders) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: reqHeaders, timeout: 12000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchUrl(res.headers.location, reqHeaders).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const path = req.query.path || '';
  if (!path) return res.status(400).json({ error: 'Missing path' });

  const sep = path.includes('?') ? '&' : '?';
  const targetUrl = `https://knesset.gov.il/Odata/ParliamentInfo.svc/${path}${sep}$format=json`;

  const reqHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://main.knesset.gov.il/',
    'Origin': 'https://main.knesset.gov.il',
    'Cache-Control': 'no-cache',
  };

  try {
    const result = await fetchUrl(targetUrl, reqHeaders);
    const trimmed = result.body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(trimmed);
    }
    return res.status(503).json({ error: 'geo_blocked', message: 'הכנסת API חוסם בקשות מהשרת.' });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
