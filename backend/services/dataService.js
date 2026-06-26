import fs from 'fs';
import path from 'path';

const CACHE_FILE = process.env.VERCEL 
  ? path.join('/tmp', 'cache.json') 
  : path.resolve('cache.json');

// List of EGX 30 constituents with static details, sector, dividend yields, and advanced Egyptian market fundamentals
export const EGX_30_STOCKS = [
  { ticker: "COMI.CA", name: "Commercial International Bank", sector: "Banking", divYield: 0.06, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "TMGH.CA", name: "Talaat Moustafa Group", sector: "Real Estate", divYield: 0.03, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "High", isExporter: false, earningsStability: "Medium" },
  { ticker: "ABUK.CA", name: "Abou Kir Fertilizers", sector: "Materials", divYield: 0.12, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: true, earningsStability: "High" },
  { ticker: "FWRY.CA", name: "Fawry for Banking & Payment", sector: "Technology", divYield: 0.00, pricingPower: "Medium", revenueGrowth: "Strong", debtLevel: "Low", isExporter: false, earningsStability: "Medium" },
  { ticker: "EAST.CA", name: "Eastern Company", sector: "Consumer Staples", divYield: 0.15, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "ETEL.CA", name: "Telecom Egypt", sector: "Telecom", divYield: 0.10, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "High" },
  { ticker: "SWDY.CA", name: "Elsewedy Electric", sector: "Industrials", divYield: 0.08, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Medium", isExporter: true, earningsStability: "High" },
  { ticker: "HRHO.CA", name: "EFG Holding", sector: "Financial Services", divYield: 0.04, pricingPower: "Medium", revenueGrowth: "Strong", debtLevel: "Low", isExporter: false, earningsStability: "Medium" },
  { ticker: "EFIH.CA", name: "e-finance", sector: "Technology", divYield: 0.05, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "AMOC.CA", name: "Alexandria Mineral Oils", sector: "Energy", divYield: 0.12, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Low", isExporter: true, earningsStability: "Medium" },
  { ticker: "EKHO.CA", name: "Egypt Kuwait Holding", sector: "Financial Services", divYield: 0.09, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: true, earningsStability: "High" },
  { ticker: "JUFO.CA", name: "Juhayna Food Industries", sector: "Consumer Staples", divYield: 0.05, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "High" },
  { ticker: "EFID.CA", name: "Edita Food Industries", sector: "Consumer Staples", divYield: 0.06, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "PHDC.CA", name: "Palm Hills Developments", sector: "Real Estate", divYield: 0.05, pricingPower: "Medium", revenueGrowth: "Strong", debtLevel: "High", isExporter: false, earningsStability: "Medium" },
  { ticker: "EMFD.CA", name: "Emaar Misr for Development", sector: "Real Estate", divYield: 0.06, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "HELI.CA", name: "Heliopolis Housing", sector: "Real Estate", divYield: 0.04, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Low", isExporter: false, earningsStability: "Low" },
  { ticker: "ORHD.CA", name: "Orascom Development Egypt", sector: "Real Estate", divYield: 0.00, pricingPower: "Medium", revenueGrowth: "Strong", debtLevel: "High", isExporter: false, earningsStability: "Medium" },
  { ticker: "ORAS.CA", name: "Orascom Construction", sector: "Industrials", divYield: 0.08, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Low", isExporter: true, earningsStability: "High" },
  { ticker: "ORWE.CA", name: "Oriental Weavers", sector: "Consumer Discretionary", divYield: 0.12, pricingPower: "High", revenueGrowth: "Stable", debtLevel: "Low", isExporter: true, earningsStability: "High" },
  { ticker: "EGAL.CA", name: "Egypt Aluminum", sector: "Materials", divYield: 0.10, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Low", isExporter: true, earningsStability: "High" },
  { ticker: "GBCO.CA", name: "GB Corp", sector: "Consumer Discretionary", divYield: 0.07, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "Medium" },
  { ticker: "ADIB.CA", name: "Abu Dhabi Islamic Bank Egypt", sector: "Banking", divYield: 0.08, pricingPower: "High", revenueGrowth: "Strong", debtLevel: "Low", isExporter: false, earningsStability: "High" },
  { ticker: "ISPH.CA", name: "Ibnsina Pharma", sector: "Healthcare", divYield: 0.04, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "High" },
  { ticker: "RMDA.CA", name: "Rameda Pharmaceuticals", sector: "Healthcare", divYield: 0.05, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Low", isExporter: false, earningsStability: "Medium" },
  { ticker: "BTFH.CA", name: "Beltone Holding", sector: "Financial Services", divYield: 0.00, pricingPower: "Low", revenueGrowth: "Strong", debtLevel: "High", isExporter: false, earningsStability: "Low" },
  { ticker: "CCAP.CA", name: "Qalaa Holdings", sector: "Financial Services", divYield: 0.00, pricingPower: "Low", revenueGrowth: "Stable", debtLevel: "High", isExporter: false, earningsStability: "Low" },
  { ticker: "ARCC.CA", name: "Arabian Cement Company", sector: "Materials", divYield: 0.10, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "Medium" },
  { ticker: "EGCH.CA", name: "Kima (Chemical Industries)", sector: "Materials", divYield: 0.00, pricingPower: "Low", revenueGrowth: "Weak", debtLevel: "High", isExporter: false, earningsStability: "Low" },
  { ticker: "RAYA.CA", name: "Raya Holding", sector: "Financial Services", divYield: 0.05, pricingPower: "Medium", revenueGrowth: "Stable", debtLevel: "Medium", isExporter: false, earningsStability: "Medium" }
];

// Helper to read cache
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Cache read error:", err);
  }
  return { quotes: {}, history: {} };
}

// Helper to write cache
function writeCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error("Cache write error:", err);
  }
}

// Fetch helper with headers to prevent block
async function fetchYahooChart(ticker, periodInYears = 1) {
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (periodInYears * 365 * 24 * 60 * 60);
  
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance responded with status ${res.status}`);
  }

  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) {
    throw new Error(`Invalid response structure for ${ticker}`);
  }
  return result;
}

// Get quote (cached for 15 minutes)
export async function getQuote(ticker) {
  const cache = readCache();
  const now = Date.now();
  const cached = cache.quotes[ticker];

  // 15 mins cache TTL
  if (cached && (now - cached.timestamp < 15 * 60 * 1000)) {
    return cached.data;
  }

  console.log(`[DataService] Fetching quote from Yahoo API for: ${ticker}`);
  try {
    const result = await fetchYahooChart(ticker, 1);
    const meta = result.meta;
    
    // Find static metadata
    const staticStock = EGX_30_STOCKS.find(s => s.ticker === ticker);
    
    const prevClose = meta.chartPreviousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const cleanData = {
      ticker,
      price,
      change,
      changePercent,
      prevClose,
      open: prevClose,
      high: price,
      low: price,
      volume: 0,
      marketCap: 0,
      trailingPE: 0,
      dividendYield: staticStock ? staticStock.divYield : 0,
      longName: meta.longName || ticker,
      // Injecting localized Egypt fundamentals
      pricingPower: staticStock ? staticStock.pricingPower : 'Medium',
      revenueGrowth: staticStock ? staticStock.revenueGrowth : 'Stable',
      debtLevel: staticStock ? staticStock.debtLevel : 'Medium',
      isExporter: staticStock ? staticStock.isExporter : false,
      earningsStability: staticStock ? staticStock.earningsStability : 'Medium'
    };
    
    cache.quotes[ticker] = {
      timestamp: now,
      data: cleanData
    };
    writeCache(cache);
    return cleanData;
  } catch (err) {
    console.error(`Error fetching quote for ${ticker}:`, err.message);
    if (cached) {
      console.log(`[DataService] Returning expired cache for ${ticker}`);
      return cached.data;
    }
    // Fallback data
    const staticStock = EGX_30_STOCKS.find(s => s.ticker === ticker);
    return {
      ticker,
      price: ticker === 'USDEGP=X' ? 47.50 : ticker === '^CASE30' ? 26500 : 50.0,
      change: 0,
      changePercent: 0,
      prevClose: 50.0,
      open: 50.0,
      high: 50.0,
      low: 50.0,
      volume: 0,
      marketCap: 0,
      trailingPE: 0,
      dividendYield: staticStock ? staticStock.divYield : 0.05,
      longName: ticker,
      pricingPower: staticStock ? staticStock.pricingPower : 'Medium',
      revenueGrowth: staticStock ? staticStock.revenueGrowth : 'Stable',
      debtLevel: staticStock ? staticStock.debtLevel : 'Medium',
      isExporter: staticStock ? staticStock.isExporter : false,
      earningsStability: staticStock ? staticStock.earningsStability : 'Medium'
    };
  }
}

// Get history (cached for 24 hours)
export async function getHistory(ticker, periodInYears = 1) {
  const cache = readCache();
  const now = Date.now();
  const cacheKey = `${ticker}_${periodInYears}y`;
  const cached = cache.history[cacheKey];

  // 24 hours cache TTL
  if (cached && (now - cached.timestamp < 24 * 60 * 60 * 1000)) {
    return cached.data;
  }

  console.log(`[DataService] Fetching history from Yahoo API for: ${ticker}`);
  try {
    const result = await fetchYahooChart(ticker, periodInYears);
    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const opens = result.indicators?.quote?.[0]?.open || [];
    const highs = result.indicators?.quote?.[0]?.high || [];
    const lows = result.indicators?.quote?.[0]?.low || [];

    const cleanData = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null && timestamps[i] != null) {
        cleanData.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: opens[i] || closes[i],
          high: highs[i] || closes[i],
          low: lows[i] || closes[i],
          close: closes[i],
          volume: 0
        });
      }
    }

    // Sort chronologically
    cleanData.sort((a, b) => new Date(a.date) - new Date(b.date));

    cache.history[cacheKey] = {
      timestamp: now,
      data: cleanData
    };
    writeCache(cache);
    return cleanData;
  } catch (err) {
    console.error(`Error fetching history for ${ticker}:`, err.message);
    if (cached) {
      console.log(`[DataService] Returning expired history cache for ${ticker}`);
      return cached.data;
    }
    return [];
  }
}

// Fetch benchmarks (EGX30, USD/EGP, Gold)
export async function getBenchmarks() {
  try {
    const egx30 = await getQuote('^CASE30');
    const usdegp = await getQuote('USDEGP=X');
    const goldFutures = await getQuote('GC=F');

    // Calculate EGP Gold 21K price per gram
    const goldPriceUsd = goldFutures.price || 2300;
    const usdegpRate = usdegp.price || 47.5;
    const gold24kGramEgp = (goldPriceUsd / 31.1035) * usdegpRate;
    const gold21kGramEgp = gold24kGramEgp * (21 / 24);

    return {
      egx30: {
        price: egx30.price,
        change: egx30.change,
        changePercent: Number(egx30.changePercent.toFixed(2))
      },
      usdegp: {
        price: usdegpRate,
        change: usdegp.change,
        changePercent: Number(usdegp.changePercent.toFixed(2))
      },
      gold21k: {
        price: Number(gold21kGramEgp.toFixed(2)),
        changePercent: Number(goldFutures.changePercent.toFixed(2))
      }
    };
  } catch (err) {
    console.error("Error fetching benchmarks:", err.message);
    return {
      egx30: { price: 26500, change: 120, changePercent: 0.45 },
      usdegp: { price: 47.50, change: 0.05, changePercent: 0.1 },
      gold21k: { price: 3150, changePercent: 0.2 }
    };
  }
}
