const express = require('express');
const app = express();

const WORKER_URL = 'https://wingosatafecther.lordpainx4vv.workers.dev';
const SUPABASE_URL = 'https://jnhpnsfdnckkpnyrmpkc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t52nYcH5sW43P48ZSUE4eg_GWwyg_ma';

// ==========================================
// Supabase থেকে পুরনো ডেটা (History) আনা
// ==========================================
async function getHistoryData(game, page) {
  const limit = 50;
  const offset = (page - 1) * limit;
  try {
    const url = `${SUPABASE_URL}/rest/v1/wingo_history?game=eq.${game}&select=issue,number,color&order=issue.desc&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`[History] ${game} fail —`, e.message);
    return [];
  }
}

// ==========================================
// API Routes
// ==========================================
app.get('/api/history', async (req, res) => {
  const game = req.query.game === 'WinGo_1M' ? 'WinGo_1M' : 'WinGo_30S';
  const page = parseInt(req.query.page) || 1;
  const data = await getHistoryData(game, page);
  res.json({ status: 'success', data: data });
});

// 🔥 বটের জন্য নতুন এন্ডপয়েন্ট (সরাসরি Worker থেকে ফ্রেশ ডেটা)
app.get('/api/live', async (req, res) => {
  try {
    const [r30S, r1M] = await Promise.all([
      fetch(`${WORKER_URL}/live?game=WinGo_30S`).then(r => r.json()),
      fetch(`${WORKER_URL}/live?game=WinGo_1M`).then(r => r.json())
    ]);
    res.json({ 
      status: 'success', 
      winGo_30S: r30S.results ? r30S.results[0] : null, 
      winGo_1M: r1M.results ? r1M.results[0] : null 
    });
  } catch (e) {
    res.status(500).json({ status: 'error' });
  }
});

// Pages
app.get('/', (_, res) => res.type('html').send(LIVE_PAGE));
app.get('/history', (_, res) => res.type('html').send(HISTORY_PAGE));
app.listen(process.env.PORT || 3000, () => console.log('Server is running!'));

// ==========================================
// HTML: LIVE PAGE (আপনার ওল্ড কোড)
// ==========================================
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
  resultEl.innerHTML = \`<div class="circle \${style.cls}">\${data.number}</div><div class="color-text \${data.color ? data.color.split(',')[0] : ''}">\${style.txt}</div>\`;
}
async function poll(){
 try {
  const [res30S, res1M] = await Promise.all([
    fetch(WORKER_URL + '/live?game=WinGo_30S').then(r => r.json()),
    fetch(WORKER_URL + '/live?game=WinGo_1M').then(r => r.json())
  ]);
  renderCard('30S', res30S);
  renderCard('1M', res1M);
  document.getElementById('status').textContent = 'সর্বশেষ আপডেট: ' + new Date().toLocaleTimeString('en-GB');
 } catch(e) { document.getElementById('status').textContent = 'কানেকশন এরর!'; }
}
poll(); setInterval(poll, 3000);
</script></body></html>`;

// ==========================================
// HTML: HISTORY PAGE (আপনার ওল্ড কোড)
// ==========================================
const HISTORY_PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WinGo History</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
 body{font-family:sans-serif;margin:0;padding:20px;background:#0f0f13;color:#eee;display:flex;flex-direction:column;align-items:center}
 h1{font-size:24px;margin-bottom:10px;color:#fff}
 .nav{display:flex;gap:15px;margin-bottom:30px}
 .nav a{color:#aaa;text-decoration:none;padding:8px 16px;border-radius:8px;background:#1c1c24;border:1px solid #333;font-size:14px;transition:0.3s}
 .nav a.active, .nav a:hover{background:#333;color:#fff}
 .controls{margin-bottom:20px;display:flex;gap:10px}
 select, button {padding:10px;border-radius:8px;background:#1c1c24;color:#fff;border:1px solid #444;cursor:pointer;font-size:14px}
 button:hover{background:#333}
 table{width:100%;max-width:600px;border-collapse:collapse;font-size:14px;background:#1c1c24;border-radius:8px;overflow:hidden}
 th,td{padding:10px;border-bottom:1px solid #333;text-align:left}
 th{background:#2a2a35;color:#aaa;font-weight:normal}
 .red{color:#ff4757}.green{color:#2ed573}.violet{color:#a55eea}
 .pagination{display:flex;gap:15px;align-items:center;margin-top:20px}
 .page-info{font-size:14px;color:#888}
</style></head><body>
<h1>WinGo Full History</h1>
<div class="nav">
  <a href="/">Live Data</a>
  <a href="/history" class="active">Full History</a>
</div>

<div class="controls">
  <select id="game-select" onchange="loadHistory(1)">
    <option value="WinGo_30S">WinGo 30S</option>
    <option value="WinGo_1M">WinGo 1M</option>
  </select>
  <button onclick="loadHistory(1)">রিফ্রেশ</button>
</div>

<table>
  <thead><tr><th>Issue</th><th>Result</th><th>Color</th></tr></thead>
  <tbody id="history-body">
    <tr><td colspan="3" style="text-align:center;">লোড হচ্ছে...</td></tr>
  </tbody>
</table>

<div class="pagination">
  <button onclick="loadHistory(currentPage - 1)" id="btn-prev" disabled>আগের পেজ</button>
  <span class="page-info" id="page-info">পেজ: 1</span>
  <button onclick="loadHistory(currentPage + 1)" id="btn-next">পরের পেজ</button>
</div>

<script>
let currentPage = 1;
function cls(c){ if(!c) return ''; if(c.includes('red')) return 'red'; if(c.includes('green')) return 'green'; return 'violet'; }

async function loadHistory(page) {
  if (page < 1) return;
  const game = document.getElementById('game-select').value;
  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">লোড হচ্ছে...</td></tr>';
  
  try {
    const res = await fetch('/api/history?game='+game+'&page='+page);
    const j = await res.json();
    if(j.status === 'success'){
      const list = j.data;
      if(list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">এই পেজে কোনো ডেটা নেই</td></tr>';
        return;
      }
      tbody.innerHTML = list.map(r => 
        '<tr><td>'+r.issue+'</td><td><b>'+r.number+'</b></td><td class="'+cls(r.color)+'">'+r.color+'</td></tr>'
      ).join('');
      
      currentPage = page;
      document.getElementById('page-info').textContent = 'পেজ: ' + currentPage;
      document.getElementById('btn-prev').disabled = (currentPage === 1);
      document.getElementById('btn-next').disabled = (list.length < 50);
    }
  } catch(e) { 
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">এরর হয়েছে!</td></tr>';
  }
}
loadHistory(1);
</script></body></html>`;
