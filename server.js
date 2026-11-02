const express = require('express');
const app = express();

const SUPABASE_URL = 'https://jnhpnsfdnckkpnyrmpkc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_t52nYcH5sW43P48ZSUE4eg_GWwyg_ma';

async function getLatest(game) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/wingo_history?game=eq.${game}&select=issue,number,color&order=issue.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  } catch (e) {
    return null;
  }
}

// এই এন্ডপয়েন্টটাই বট খুঁজছে
app.get('/api/live', async (req, res) => {
  const data30S = await getLatest('WinGo_30S');
  const data1M = await getLatest('WinGo_1M');
  res.json({ status: 'success', winGo_30S: data30S, winGo_1M: data1M });
});

app.get('/', (req, res) => res.send('API is running perfectly!'));

app.listen(process.env.PORT || 3000, () => console.log('API Server is live'));
