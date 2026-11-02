const express = require('express');
const app = express();

// আপনার Cloudflare Worker এর লিংক
const WORKER_URL = 'https://wingosatafecther.lordpainx4vv.workers.dev';

// Render থেকে Worker-এ ফেচ করার ফাংশন
async function fetchFromWorker(game) {
  try {
    const res = await fetch(`${WORKER_URL}/history?game=${game}&limit=50`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.results || [];
  } catch (e) {
    console.error(`[${game}] fetch failed —`, e.message);
    return [];
  }
}

// API এন্ডপয়েন্ট যা ব্রাউজার কল করবে
app.get('/api/data', async (req, res) => {
  const [data30S, data1M] = await Promise.all([
    fetchFromWorker('WinGo_30S'),
    fetchFromWorker('WinGo_1M')
  ]);

  res.json({
    status: 'success',
    winGo_30S: data30S,
    winGo_1M: data1M
  });
});

app.get('/', (_, res) => res.type('html').send(PAGE));
app.listen(process.env.PORT || 3000, () => console.log('up'));

// ---------- UI ----------
const PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WinGo History</title>
<style>
 body{font-family:sans-serif;margin:20px;background:#111;color:#eee}
 .wrap{display:flex;gap:20px;flex-wrap:wrap}
 .col{flex:1;min-width:320px} h2{margin:0 0 6px}
 .meta{font-size:12px;opacity:.75;margin-bottom:8px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th,td{padding:4px 6px;border-bottom:1px solid #333;text-align:left}
 th{opacity:.7;font-weight:500}
 .red{color:#ff6b6b}.green{color:#51cf66}.violet{color:#b197fc}
</style></head><body>
<h1>WinGo History</h1>
<div class="wrap">
 <div class="col"><h2>30 Seconds</h2><div class="meta" id="meta-30S">loading…</div><table id="tbl-30S"></table></div>
 <div class="col"><h2>1 Minute</h2><div class="meta" id="meta-1M">loading…</div><table id="tbl-1M"></table></div>
</div>
<script>
function bd(ms){
  if(!ms) return '—';
  return new Date(ms).toLocaleString('en-GB',{timeZone:'Asia/Dhaka',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
}
function cls(c){
  if(!c) return '';
  if(c.includes('red')) return 'red';
  if(c.includes('green')) return 'green';
  return 'violet';
}
function render(key, list){
  const t = document.getElementById('tbl-'+key);
  const m = document.getElementById('meta-'+key);
  
  if(!list || list.length === 0){ 
    m.textContent = 'কোনো ডেটা নেই'; 
    t.innerHTML = ''; 
    return; 
  }
  
  const last = list[0];
  m.textContent = 'সর্বশেষ রাউন্ড: ' + last.issue;
  
  t.innerHTML = '<tr><th>Issue</th><th>No.</th><th>Color</th></tr>' +
    list.map(r => '<tr><td>'+r.issue+'</td><td>'+r.number+'</td><td class="'+cls(r.color)+'">'+r.color+'</td></tr>').join('');
}

async function poll(){
 try {
  const res = await fetch('/api/data');
  const j = await res.json();
  
  if(j.status === 'success'){
    render('30S', j.winGo_30S);
    render('1M', j.winGo_1M);
  }
 } catch(e) { console.error(e); }
}

poll(); 
setInterval(poll, 5000); // প্রতি ৫ সেকেন্ডে Worker থেকে নতুন ডেটা চেক করবে
</script></body></html>`;
