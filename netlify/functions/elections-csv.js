const https = require('https');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'text/plain; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const knesset = event.queryStringParameters?.knesset || '25';
  const allowed = ['21','22','23','24','25'];
  if (!allowed.includes(knesset)) {
    return { statusCode: 400, headers, body: 'Invalid knesset number' };
  }

  const url = `https://media${knesset}.bechirot.gov.il/files/expb.csv`;
  console.log('Fetching:', url);

  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `https://votes${knesset}.bechirot.gov.il/`,
        'Accept': 'text/csv,text/plain,*/*',
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        https.get(redirectUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
          const chunks = [];
          res2.on('data', chunk => chunks.push(chunk));
          res2.on('end', () => {
            const body = Buffer.concat(chunks).toString('latin1');
            resolve({ statusCode: 200, headers, body });
          });
        }).on('error', err => resolve({ statusCode: 502, headers, body: err.message }));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        // The CSV uses Windows-1255 (Hebrew) encoding
        const body = Buffer.concat(chunks).toString('latin1');
        resolve({ statusCode: 200, headers, body });
      });
    }).on('error', (err) => {
      console.error('Fetch error:', err.message);
      resolve({ statusCode: 502, headers, body: `Error: ${err.message}` });
    });
  });
};
