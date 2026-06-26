async function testTickers() {
  const tickers = ['^EGX30', 'EGX30.CA', 'CASE30.CA', '^CASE30'];
  for (const ticker of tickers) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1mo&interval=1d`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const data = await res.json();
      const timestamps = data.chart?.result?.[0]?.timestamp || [];
      console.log(`Ticker: ${ticker} | Timestamps: ${timestamps.length}`);
    } catch {
      console.log(`Ticker: ${ticker} | Failed`);
    }
  }
  process.exit(0);
}

testTickers();
