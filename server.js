const express = require('express');
const app = express();

const BASE_URLS = {
  '30S': 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
  '1M':  'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json'
};

// একাধিক ফ্রি প্রক্সির লিস্ট
const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

const INTERVAL = 30 * 1000;      // ৩০ সেকেন্ড
const TIMEOUT  = 15 * 1000;      // টাইমআউট ১৫ সেকেন্ড বাড়ানো হলো
const DAILY_CAP = 70000;

const cache = {
  '30S': { data: null, updatedAt: null },
  '1M':  { data: null, updatedAt: null }
};

const counter = { date: new Date().toISOString().slice(0, 10), count: 0 };

async function fetchData(key) {
  const baseUrl = BASE_URLS[key];
  
  // প্রতিটি প্রক্সি একে একে ট্রাই করবে
  for (let proxyFn of PROXIES) {
    const proxyUrl = proxyFn(baseUrl);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT);

    try {
      const res = await fetch(proxyUrl, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Blocked by Cloudflare Challenge');
      }
      
      const json = JSON.parse(text);
      clearTimeout(t);
      
      // সফল হলে ডেটা ক্যাশে সেভ হবে
      counter.count++;
      cache[key] = { data: json, updatedAt: Date.now() };
      console.log(`[${key}] ok via ${proxyUrl.split('/')[2]} — ${counter.count}/${DAILY_CAP}`);
      return; // সফল হলে লুপ শেষ
      
    } catch (e) {
      clearTimeout(t);
      console.warn(`[${key}] proxy failed (${proxyUrl.split('/')[2]}) — ${e.message}`);
      // পরের প্রক্সি ট্রাই করবে
    }
  }
  console.error(`[${key}] fail — All proxies failed or timed out.`);
}

// প্রতি ৩০ সেকেন্ডে ফেচ
setInterval(() => { fetchData('30S'); fetchData('1M'); }, INTERVAL);
fetchData('30S');
fetchData('1M');

app.get('/api/data', (_, res) => res.json({ cache, counter }));
app.get('/', (_, res) => res.type('html').send(PAGE));
app.listen(process.env.PORT || 3000, () => console.log('up'));

// ---------- UI (আগের মতোই) ----------
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
 
 const list=e.data.data || e.data.list || e.data.results || [];
 const last=list[0];
 
 m.textContent='Last fetch: '+bd(e.updatedAt)+'  |  Latest Issue: '+(last?(last.issueNumber||last.issue||'—'):'—');
 
 t.innerHTML='<tr><th>Issue</th><th>No.</th><th>Color</th></tr>'+
  list.map(r=>'<tr><td>'+(r.issueNumber||r.issue||'—')+'</td><td>'+(r.number||r.num||'—')+'</td><td class="'+cls(r.color)+'">'+(r.color||'—')+'</td></tr>').join('');
}
async function poll(){
 try{
  const j=await(await fetch('/api/data')).json();
  render('30S',j.cache['30S']);render('1M',j.cache['1M']);
  document.getElementById('counter').textContent='Fetch count ('+j.counter.date+'): '+j.counter.count+' / 70000';
 }catch(e){console.error(e);}
}
poll();setInterval(poll,1000);
</script></body></html>`;
