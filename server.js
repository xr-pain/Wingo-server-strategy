const express = require('express');
const app = express();

const WORKER_URL = 'https://wingosatafecther.lordpainx4vv.workers.dev';
const SUPABASE_URL = 'https://jnhpnsfdnckkpnyrmpkc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t52nYcH5sW43P48ZSUE4eg_GWwyg_ma';

// বটের জন্য ফ্রেশ ডেটা (সরাসরি Worker থেকে)
app.get('/api/live', async (req, res) => {
  try {
    const [r30, r1m] = await Promise.all([
      fetch(`${WORKER_URL}/live?game=WinGo_30S`).then(r => r.json()),
      fetch(`${WORKER_URL}/live?game=WinGo_1M`).then(r => r.json())
    ]);
    res.json({ 
      status: 'success', 
      winGo_30S: r30.results ? r30.results[0] : null, 
      winGo_1M: r1m.results ? r1m.results[0] : null 
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// বটের জন্য রেজাল্ট চেক (Worker History থেকে)
app.get('/api/history', async (req, res) => {
  const game = req.query.game === 'WinGo_1M' ? 'WinGo_1M' : 'WinGo_30S';
  try {
    const r = await fetch(`${WORKER_URL}/history?game=${game}&limit=50`);
    const data = await r.json();
    res.json({ status: 'success', data: data.results || [] });
  } catch (e) {
    res.status(500).json({ status: 'error' });
  }
});

// HTML পেজ (আপনার আগের ডিজাইন)
app.get('/', (_, res) => res.type('html').send(LIVE_PAGE));
app.get('/history', (_, res) => res.type('html').send(HISTORY_PAGE));

app.listen(process.env.PORT || 3000, () => console.log('Render 1 is live'));

const LIVE_PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WinGo Live</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
 body{font-family:sans-serif;margin:0;padding:20px;background:#0f0f13;color:#eee;display:flex;flex-direction:column;align-items:center;min-height:90vh}
 h1{font-size:24px;margin-bottom:10px;color:#fff}
 .nav{display:flex;gap:15px;margin-bottom:30px}
 .nav a{color:#aaa;text-decoration:none;padding:8px 16px;border-radius:8px;background:#1c1c24;border:1px solid #333;font-size:14px;transition:0.3s}
 .nav a.active, .nav a:hover{background:#333;color:#fff}
 .container{display:flex;gap:20px;flex-wrap:wrap;justify-content:center;width:100%;max-width:600px}
 .card{background:#1c1c24;border:1px solid #333;border-radius:12px;padding:25px;flex:1;min-width:260px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
 .title{font-size:18px;font-weight:bold;margin-bottom:15px;color:#fff}
 .issue{font-size:13px;color:#888;margin-bottom:15px}
 .circle{width:70px;height:70px;border-radius:50%;margin:0 auto 15px auto;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:#fff;background:#333}
 .color-text{font-size:20px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
 .red-bg{background:#ff4757;box-shadow:0 0 20px rgba(255,71,87,0.6)}
 .green-bg{background:#2ed573;box-shadow:0 0 20px rgba(46,213,115,0.6)}
 .violet-bg{background:#a55eea;box-shadow:0 0 20px rgba(165,94,234,0.6)}
 .mix-bg{background:linear-gradient(135deg, #ff4757 50%, #a55eea 50%)}
 .status{font-size:12px;color:#666;margin-top:30px}
</style></head><body>
<h1>WinGo Live Results</h1>
<div class="nav">
  <a href="/" class="active">Live Data</a>
  <a href="/history">Full History</a>
</div>
<div class="container">
  <div class="card" id="card-30S">
    <div class="title">WinGo 30 Seconds</div>
    <div class="issue" id="issue-30S">লোড হচ্ছে...</div>
    <div id="result-30S"></div>
  </div>
  <div class="card" id="card-1M">
    <div class="title">WinGo 1 Minute</div>
    <div class="issue" id="issue-1M">লোড হচ্ছে...</div>
    <div id="result-1M"></div>
  </div>
</div>
<div class="status" id="status">স্বয়ংক্রিয়ভাবে আপডেট হচ্ছে...</div>

<script>
const WORKER_URL = 'https://wingosatafecther.lordpainx4vv.workers.dev';
function getStyleClass(colorStr) {
  if(!colorStr) return {cls: '', txt: ''};
  const c = colorStr.toLowerCase();
  if(c.includes('red') && c.includes('violet')) return {cls: 'mix-bg', txt: 'Red / Violet'};
  if(c.includes('green') && c.includes('violet')) return {cls: 'mix-bg', txt: 'Green / Violet'};
  if(c.includes('red')) return {cls: 'red-bg', txt: 'Red'};
  if(c.includes('green')) return {cls: 'green-bg', txt: 'Green'};
  if(c.includes('violet')) return {cls: 'violet-bg', txt: 'Violet'};
  return {cls: '', txt: colorStr};
}
function renderCard(key, data) {
  const issueEl = document.getElementById('issue-'+key);
  const resultEl = document.getElementById('result-'+key);
  if(!data || data.status !== 'success') { issueEl.textContent = 'কানেক্ট হচ্ছে...'; return; }
  issueEl.textContent = 'Issue: ' + data.issue;
  const style = getStyleClass(data.color);
  resultEl.innerHTML = \`<div class="circle \${style.cls}">\${data.number}</div><div class="color-text">\${style.txt}</div>\`;
}
async function poll(){
 try {
  const [res30S, res1M] = await Promise.all([
    fetch(WORKER_URL + '/live?game=WinGo_30S').then(r => r.json()),
    fetch(WORKER_URL + '/live?game=WinGo_1M').then(r => r.json())
  ]);
  renderCard('30S', res30S.results ? res30S.results[0] : null);
  renderCard('1M', res1M.results ? res1M.results[0] : null);
  document.getElementById('status').textContent = 'সর্বশেষ আপডেট: ' + new Date().toLocaleTimeString('en-GB');
 } catch(e) { document.getElementById('status').textContent = 'কানেকশন এরর!'; }
}
poll(); setInterval(poll, 3000);
</script></body></html>`;

const HISTORY_PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>History</title>
<style>body{font-family:sans-serif;background:#0f0f13;color:#eee;padding:20px}table{width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#1c1c24}th,td{padding:10px;border-bottom:1px solid #333;text-align:left}</style>
</head><body><h2 style="text-align:center">History</h2><table><thead><tr><th>Issue</th><th>Result</th><th>Color</th></tr></thead><tbody id="b"></tbody></table>
<script>
fetch('/api/history?game=WinGo_30S').then(r=>r.json()).then(j=>{
 if(j.data) document.getElementById('b').innerHTML = j.data.map(r=>'<tr><td>'+r.issue+'</td><td>'+r.number+'</td><td>'+r.color+'</td></tr>').join('');
});
</script></body></html>`;
