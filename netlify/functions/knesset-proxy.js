const https = require('https');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function fetchUrl(url, reqHeaders) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: reqHeaders, timeout: 12000 }, (res) => {
      // Follow redirects
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchUrl(res.headers.location, reqHeaders).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString('utf-8')
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const path = event.queryStringParameters?.path || '';
  if (!path) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing path' }) };
  }

  const sep = path.includes('?') ? '&' : '?';
  const targetUrl = `https://knesset.gov.il/Odata/ParliamentInfo.svc/${path}${sep}$format=json`;
  console.log('Fetching:', targetUrl);

  const reqHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    'Accept-Encoding': 'identity',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://main.knesset.gov.il/',
    'Origin': 'https://main.knesset.gov.il',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };

  try {
    const result = await fetchUrl(targetUrl, reqHeaders);
    console.log('Response status:', result.status, '| Body start:', result.body.substring(0, 100));

    // Check if we got JSON back
    const trimmed = result.body.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return { statusCode: 200, headers: CORS, body: trimmed };
    }

    // Got HTML or redirect page — API is geo-blocking us
    // Return a clear error so the frontend can handle it gracefully
    console.error('Got non-JSON response:', trimmed.substring(0, 200));
    return {
      statusCode: 503,
      headers: CORS,
      body: JSON.stringify({
        error: 'geo_blocked',
        message: 'הכנסת API חוסם בקשות מהשרת. משתמש בנתוני הדגמה.',
        statusCode: result.status
      })
    };

  } catch (err) {
    console.error('Fetch error:', err.message);
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({ error: err.message })
    };
  }
};
