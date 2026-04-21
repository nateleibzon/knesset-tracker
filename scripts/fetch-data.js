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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: HEADERS, timeout: 20000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
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

async function fetchJson(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `https://knesset.gov.il/Odata/ParliamentInfo.svc/${path}${sep}$format=json`;
  console.log('Fetching:', url);
  const { status, body } = await fetchUrl(url);
  const trimmed = body.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(`Got non-JSON response (status ${status}) — likely geo-blocked`);
  }
  return JSON.parse(trimmed);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Fetch bill statuses
  console.log('Fetching bill statuses...');
  const statusData = await fetchJson('KNS_BillStatus?$top=200');
  fs.writeFileSync(path.join(OUT_DIR, 'bill-status.json'), JSON.stringify(statusData, null, 2));
  console.log('Saved bill-status.json');

  // Fetch bills per Knesset
  for (const knum of KNESSET_NUMS) {
    console.log(`Fetching bills for Knesset ${knum}...`);
    const billData = await fetchJson(
      `KNS_Bill?$filter=KnessetNum eq ${knum}&$select=BillID,Name,StatusID,KnessetNum,IsGovernmentBill,PublicationDate,LastUpdatedDate,Summary,LawID&$orderby=LastUpdatedDate desc&$top=500`
    );
    fs.writeFileSync(path.join(OUT_DIR, `bills-${knum}.json`), JSON.stringify(billData, null, 2));
    console.log(`Saved bills-${knum}.json`);
  }

  console.log('Done.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
