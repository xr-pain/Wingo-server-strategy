app.get('/api/live', async (req, res) => {
  try {
    // ১. সরাসরি Worker থেকে ফ্রেশ ডেটা আনার চেষ্টা
    const [r30S, r1M] = await Promise.all([
      fetch('https://wingosatafecther.lordpainx4vv.workers.dev/live?game=WinGo_30S').then(r => r.json()),
      fetch('https://wingosatafecther.lordpainx4vv.workers.dev/live?game=WinGo_1M').then(r => r.json())
    ]);

    // ২. Worker থেকে সঠিকভাবে ডেটা আসলে সেটা রেসপন্স করবে
    if (r30S.results && r1M.results) {
      return res.json({ 
        status: 'success', 
        winGo_30S: r30S.results[0], 
        winGo_1M: r1M.results[0] 
      });
    }
  } catch (e) {
    console.log("Worker failed, falling back to Supabase...");
  }

  // ৩. Worker ফেইল করলে Supabase থেকে ব্যাকআপ ডেটা আনবে
  const data30S = await getLatest('WinGo_30S');
  const data1M = await getLatest('WinGo_1M');
  res.json({ status: 'success', winGo_30S: data30S, winGo_1M: data1M });
});
