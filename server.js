const express = require('express');
const app = express();

const URLS = {
  '30S': 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
  '1M':  'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json'
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://draw.ar-lottery01.com/'
};

const INTERVAL = 30 * 1000;      // ৩০ সেকেন্ড
const TIMEOUT  = 10 * 1000;      // ১০ সেকেন্ড
const RETRIES  = 3;              // ৩ বার
const DAILY_CAP = 70000;

const cache = {
  '30S': { data: null, updatedAt: null },
  '1M':  { data: null, updatedAt: null }
};

const counter = { date: today(), count: 0 };
function today() { return new Date().toISOString().slice(0, 10); }
function rollover() {
  if (today() !== counter.date) { counter.date = today(); counter.count = 0; }
}

// ১০s timeout সহ fetch
async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ৩ বার retry
async function fetchWithRetry(url) {
  let lastErr;
  for (let i = 1; i <= RETRIES; i++) {
    try { return await fetchWithTimeout(url); }
    catch (e) {
      lastErr = e;
      console.warn(`retry ${i}/${RETRIES} —`, e.message);
      if (i < RETRIES) await new Promise(r => setTimeout(r, 1000 * i)); // ব্যাকঅফ
    }
  }
  throw lastErr;
}

async function fetchData(key) {
  rollover();
  if (counter.count >= DAILY_CAP) return;
  try {
    const json = await fetchWithRetry(URLS[key]);
    counter.count++;
    cache[key] = { data: json, updatedAt: Date.now() };
    console.log(`[${key}] ok — ${counter.count}/${DAILY_CAP}`);
  } catch (e) {
    console.error(`[${key}] fail —`, e.message);
  }
}

// ৩০ সেকেন্ড পর পর
setInterval(() => { fetchData('30S'); fetchData('1M'); }, INTERVAL);
fetchData('30S');
fetchData('1M');

app.get('/api/data', (_, res) => res.json({ cache, counter }));
app.get('/', (_, res) => res.type('html').send(PAGE));

app.listen(process.env.PORT || 3000, () => console.log('up'));

// ---------- UI ----------
const PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WinGo</title>
<style>
 body{font-family:sans-serif;margin:20px;background:#111;color:#eee}
 .wrap{display:flex;gap:20px;flex-wrap:wrap}
 .col{flex:1;min-width:320px} h2{margin:0 0 6px}
 .meta{font-size:12px;opacity:.75;margin-bottom:8px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th,td{padding:4px 6px;border-bottom:1px solid #333;text-align:left}
 th{opacity:.7;font-weight:500}
 .red{color:#ff6b6b}.green{color:#51cf66}.violet{color:#b197fc}
 .counter{font-size:12px;margin-bottom:12px;padding:6px 10px;background:#1c1c1c;border-radius:4px;display:inline-block}
</style></head><body>
<h1>WinGo History</h1>
<div class="counter" id="counter">daily: …</div>
<div class="wrap">
 <div class="col"><h2>30 Seconds</h2><div class="meta" id="meta-30S">…</div><table id="tbl-30S"></table></div>
 <div class="col"><h2>1 Minute</h2><div class="meta" id="meta-1M">…</div><table id="tbl-1M"></table></div>
</div>
<script>
function bd(ms){return new Date(ms).toLocaleString('en-GB',{timeZone:'Asia/Dhaka',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});}
function cls(c){if(!c)return'';if(c.includes('red'))return'red';if(c.includes('green'))return'green';return'violet';}
function render(key,e){
 const t=document.getElementById('tbl-'+key),m=document.getElementById('meta-'+key);
 if(!e||!e.data){m.textContent='loading…';return;}
 const list=e.data.list||e.data.results||e.data.data||[];
 const last=list[0];
 m.textContent='Last fetch: '+bd(e.updatedAt)+'  |  Latest: '+(last?(last.issue||last.issueNumber||'—'):'—');
 t.innerHTML='<tr><th>Issue</th><th>No.</th><th>Color</th><th>Time (BD)</th></tr>'+
  list.map(r=>'<tr><td>'+(r.issue||r.issueNumber||'—')+'</td><td>'+(r.number||r.num||'—')+'</td><td class="'+cls(r.color)+'">'+(r.color||'—')+'</td><td>'+(r.saved_at?bd(r.saved_at):'—')+'</td></tr>').join('');
}
async function poll(){
 try{
  const j=await(await fetch('/api/data')).json();
  render('30S',j.cache['30S']);render('1M',j.cache['1M']);
  document.getElementById('counter').textContent='fetch count ('+j.counter.date+'): '+j.counter.count+' / 70000';
 }catch(e){console.error(e);}
}
poll();setInterval(poll,1000);
</script></body></html>`;
