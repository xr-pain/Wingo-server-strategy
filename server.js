const express = require('express');
const app = express();

const SUPABASE_URL = 'https://jnhpnsfdnckkpnyrmpkc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t52nYcH5sW43P48ZSUE4eg_GWwyg_ma';
const WORKER_SYNC_URL = 'https://wingosatafecther.lordpainx4vv.workers.dev/sync';

async function fetchLatestFromSupabase(game) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/wingo_history?game=eq.${game}&select=issue,number,color&order=issue.desc&limit=1`;
    const res = await fetch(url, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.length > 0 ? json[0] : null;
  } catch (e) {
    console.error(`[${game}] fail —`, e.message);
    return null;
  }
}

app.get('/api/latest', async (req, res) => {
  try {
    // ১. প্রথমে Worker-কে হিট করছি যাতে লেটেস্ট ডেটা সুপাবেসে সেভ হয়ে যায়
    await fetch(WORKER_SYNC_URL).catch(() => console.log("Worker sync failed"));
    
    // ২. এরপর সুপাবেস থেকে ডেটা রিড করছি
    const [data30S, data1M] = await Promise.all([
      fetchLatestFromSupabase('WinGo_30S'),
      fetchLatestFromSupabase('WinGo_1M')
    ]);
    
    res.json({ status: 'success', winGo_30S: data30S, winGo_1M: data1M });
  } catch (e) {
    res.status(500).json({ status: 'error' });
  }
});

app.get('/', (_, res) => res.type('html').send(PAGE));
app.listen(process.env.PORT || 3000, () => console.log('up'));

// ---------- UI ----------
const PAGE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WinGo Latest Result</title>
<style>
 body{font-family:sans-serif;margin:0;padding:20px;background:#0f0f13;color:#eee;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh}
 h1{font-size:24px;margin-bottom:30px;color:#aaa}
 .container{display:flex;gap:30px;flex-wrap:wrap;justify-content:center;width:100%;max-width:800px}
 .card{background:#1c1c24;border:1px solid #333;border-radius:12px;padding:30px;flex:1;min-width:280px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,0.5)}
 .title{font-size:20px;font-weight:bold;margin-bottom:20px;color:#fff}
 .issue{font-size:14px;color:#888;margin-bottom:20px}
 .circle{width:80px;height:80px;border-radius:50%;margin:0 auto 15px auto;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:bold;color:#fff;background:#333;}
 .color-text{font-size:22px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;}
 .red-bg{background:#ff4757; box-shadow:0 0 20px rgba(255,71,87,0.6);}
 .green-bg{background:#2ed573; box-shadow:0 0 20px rgba(46,213,115,0.6);}
 .violet-bg{background:#a55eea; box-shadow:0 0 20px rgba(165,94,234,0.6);}
 .mix-bg{background:linear-gradient(135deg, #ff4757 50%, #a55eea 50%);}
 .status{font-size:12px;color:#666;margin-top:40px;}
</style></head><body>
<h1>WinGo Live Results</h1>
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
  
  if(!data) {
    issueEl.textContent = 'কোনো ডেটা পাওয়া যায়নি';
    resultEl.innerHTML = '';
    return;
  }
  
  issueEl.textContent = 'Issue: ' + data.issue;
  
  const style = getStyleClass(data.color);
  
  resultEl.innerHTML = \`
    <div class="circle \${style.cls}">\${data.number}</div>
    <div class="color-text \${data.color ? data.color.split(',')[0] : ''}">\${style.txt}</div>
  \`;
}

async function poll(){
 try {
  const res = await fetch('/api/latest');
  const j = await res.json();
  
  if(j.status === 'success'){
    renderCard('30S', j.winGo_30S);
    renderCard('1M', j.winGo_1M);
    document.getElementById('status').textContent = 'সর্বশেষ আপডেট: ' + new Date().toLocaleTimeString('en-GB');
  }
 } catch(e) { 
   console.error(e); 
   document.getElementById('status').textContent = 'কানেকশন এরর!';
 }
}

poll(); 
setInterval(poll, 5000); // প্রতি ৫ সেকেন্ডে আপডেট হবে
</script></body></html>`;
