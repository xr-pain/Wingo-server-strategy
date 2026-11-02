const express = require('express');
const app = express();

const URLS = {
  '30S': 'https://wingosatafecther.lordpainx4vv.workers.dev/history?game=WinGo_30S',
  '1M':  'https://wingosatafecther.lordpainx4vv.workers.dev/history?game=WinGo_1M'
};

// Server-side cache — কেউ যতবারই হিট করুক, worker-এ ততবার ফেচ যাবে না
const cache = {
  '30S': { data: null, updatedAt: null },
  '1M':  { data: null, updatedAt: null }
};

async function fetchData(key) {
  try {
    const res = await fetch(URLS[key]);
    const json = await res.json();
    cache[key] = { data: json, updatedAt: Date.now() };
    console.log(`[${key}] ok — ${json.results?.length ?? 0} results`);
  } catch (e) {
    console.error(`[${key}] fail —`, e.message);
  }
}

// 30S → প্রতি 32 সেকেন্ডে (30 + 2s)
// 1M  → প্রতি 62 সেকেন্ডে (60 + 2s)
setInterval(() => fetchData('30S'), 32 * 1000);
setInterval(() => fetchData('1M'),  62 * 1000);
fetchData('30S'); // প্রথমবার সাথে সাথে
fetchData('1M');

app.get('/api/data', (_, res) => res.json(cache));
app.get('/', (_, res) => res.type('html').send(PAGE));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on', PORT));

// ---------- HTML page ----------
const PAGE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>WinGo History</title>
<style>
  body { font-family: sans-serif; margin: 20px; background: #111; color: #eee; }
  .wrap { display: flex; gap: 20px; flex-wrap: wrap; }
  .col { flex: 1; min-width: 320px; }
  h2 { margin: 0 0 6px; }
  .meta { font-size: 12px; opacity: 0.75; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #333; text-align: left; }
  th { opacity: 0.7; font-weight: 500; }
  .red { color: #ff6b6b; }
  .green { color: #51cf66; }
  .violet { color: #b197fc; }
</style>
</head>
<body>
<h1>WinGo History</h1>
<div class="wrap">
  <div class="col"><h2>30 Seconds</h2><div class="meta" id="meta-30S">loading…</div><table id="tbl-30S"></table></div>
  <div class="col"><h2>1 Minute</h2><div class="meta" id="meta-1M">loading…</div><table id="tbl-1M"></table></div>
</div>
<script>
function bdTime(ms) {
  return new Date(ms).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
function colorClass(c) {
  if (c.includes('red'))   return 'red';
  if (c.includes('green')) return 'green';
  return 'violet';
}
function render(key, entry) {
  const tbl  = document.getElementById('tbl-' + key);
  const meta = document.getElementById('meta-' + key);
  if (!entry || !entry.data) { meta.textContent = 'loading…'; return; }
  const last = entry.data.results?.[0];
  meta.textContent =
    'Last fetch: ' + bdTime(entry.updatedAt) +
    '  |  Latest round: ' + (last ? bdTime(last.saved_at) : '—');
  const rows = (entry.data.results || []).map(r => \`
    <tr>
      <td>\${r.issue}</td>
      <td>\${r.number}</td>
      <td class="\${colorClass(r.color)}">\${r.color}</td>
      <td>\${bdTime(r.saved_at)}</td>
    </tr>\`).join('');
  tbl.innerHTML =
    '<tr><th>Issue</th><th>No.</th><th>Color</th><th>Time (BD)</th></tr>' + rows;
}
async function poll() {
  try {
    const res  = await fetch('/api/data');
    const json = await res.json();
    render('30S', json['30S']);
    render('1M',  json['1M']);
  } catch (e) { console.error(e); }
}
poll();
setInterval(poll, 1000); // শুধু নিজের API থেকে পড়ছে — worker-এ চাপ পড়ছে না
</script>
</body>
</html>`;
