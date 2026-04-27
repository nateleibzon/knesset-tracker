const https = require('https');
const fs = require('fs');
const path = require('path');

const KNESSET_NUMS = [22, 23, 24, 25];
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');

const HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
  'Accept-Encoding': 'identity',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://main.knesset.gov.il/',
  'Origin': 'https://main.knesset.gov.il',
  'Cache-Control': 'no-cache',
};

function fetchUrl(url, depth = 0) {
  if (depth > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: HEADERS, timeout: 20000 }, (res) => {
      // Follow ALL redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        console.log(`  → Redirect ${res.statusCode} to: ${next}`);
        fetchUrl(next, depth + 1).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function fetchJson(apiPath) {
  const sep = apiPath.includes('?') ? '&' : '?';
  const url = `https://knesset.gov.il/Odata/ParliamentInfo.svc/${apiPath}${sep}$format=json`;
  console.log('Fetching:', url);
  const { status, body } = await fetchUrl(url);
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    console.log('  Body preview:', trimmed.substring(0, 200));
    throw new Error(`Got non-JSON response (status ${status})`);
  }
  return JSON.parse(trimmed);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fetch bill statuses
  console.log('Fetching bill statuses...');
  const statusData = await fetchJson('KNS_Status?$top=500&$select=StatusID,Desc');
  fs.writeFileSync(path.join(OUT_DIR, 'bill-status.json'), JSON.stringify(statusData, null, 2));
  console.log('Saved bill-status.json');

  // Fetch bills per Knesset
  for (const knum of KNESSET_NUMS) {
    console.log(`Fetching bills for Knesset ${knum}...`);
    const billData = await fetchJson(
      `KNS_Bill?$filter=KnessetNum eq ${knum}&$select=BillID,Name,StatusID,KnessetNum,SubTypeDesc,PublicationDate,LastUpdatedDate,SummaryLaw&$orderby=LastUpdatedDate desc&$top=500`
    );
    fs.writeFileSync(path.join(OUT_DIR, `bills-${knum}.json`), JSON.stringify(billData, null, 2));
    console.log(`Saved bills-${knum}.json (${(billData?.d?.results || billData?.value || []).length} bills)`);
  }

  console.log('Done.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
