// Analysis Service - Calculates technical indicators and scores for stocks

// Simple Moving Average
export function calculateSMA(data, period) {
  if (!data || data.length < period) return null;
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val.close, 0);
    sma.push({
      date: data[i].date,
      value: Number((sum / period).toFixed(2))
    });
  }
  return sma;
}

// Relative Strength Index (RSI 14)
export function calculateRSI(data, period = 14) {
  if (!data || data.length <= period) return null;

  const rsi = [];
  let gains = 0;
  let losses = 0;

  // First RSI calculation
  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push({
    date: data[period].date,
    value: Number((100 - 100 / (1 + rs)).toFixed(2))
  });

  // Wilder's smoothing for subsequent periods
  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({
      date: data[i].date,
      value: Number((100 - 100 / (1 + rs)).toFixed(2))
    });
  }

  return rsi;
}

// Exponential Moving Average (EMA) - helper for MACD
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  
  // Start with SMA as first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEma = sum / period;
  ema.push(prevEma);

  for (let i = period; i < prices.length; i++) {
    const val = prices[i] * k + prevEma * (1 - k);
    ema.push(val);
    prevEma = val;
  }
  return ema;
}

// MACD (12, 26, 9)
export function calculateMACD(data) {
  if (!data || data.length < 26) return null;

  const closes = data.map(d => d.close);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);

  // Align EMAs (since ema12 starts at index 11, ema26 starts at index 25)
  // Shift ema12 to align with ema26
  const macdValues = [];
  const startIdx = 25; // 26th day
  for (let i = startIdx; i < closes.length; i++) {
    const val12 = ema12[i - 11]; // ema12 starts at 11
    const val26 = ema26[i - 25]; // ema26 starts at 25
    macdValues.push(val12 - val26);
  }

  if (macdValues.length < 9) return null;
  const signalValues = calculateEMA(macdValues, 9);

  const macdResult = [];
  const dates = data.slice(startIdx);

  // Align Signal Line
  for (let i = 8; i < macdValues.length; i++) {
    const macdLine = macdValues[i];
    const signalLine = signalValues[i - 8];
    const histogram = macdLine - signalLine;
    macdResult.push({
      date: dates[i].date,
      macd: Number(macdLine.toFixed(4)),
      signal: Number(signalLine.toFixed(4)),
      histogram: Number(histogram.toFixed(4))
    });
  }

  return macdResult;
}

// 52-Week High and Drawdown
export function calculateDrawdown(data) {
  if (!data || data.length === 0) return { maxHigh: 0, drawdownPercent: 0 };
  
  // Find highest close in history
  let maxHigh = 0;
  for (const day of data) {
    if (day.close > maxHigh) maxHigh = day.close;
  }
  
  const currentPrice = data[data.length - 1].close;
  const drawdownPercent = maxHigh > 0 
    ? ((maxHigh - currentPrice) / maxHigh) * 100 
    : 0;

  return {
    maxHigh: Number(maxHigh.toFixed(2)),
    drawdownPercent: Number(drawdownPercent.toFixed(2))
  };
}

// Composite Valuation & Momentum Scorecard (0-100)
// High score = more attractive for investment (low-risk entry, uptrend, high value)
export function computeScorecard(quote, history) {
  let score = 0;
  const metrics = {};

  if (!history || history.length === 0) return { score: 50, metrics: {} };

  const currentPrice = quote.price;

  // 1. Long Term Trend (30 pts max)
  const sma50 = calculateSMA(history, 50);
  const sma200 = calculateSMA(history, 200);
  
  const latestSma50 = sma50 ? sma50[sma50.length - 1].value : null;
  const latestSma200 = sma200 ? sma200[sma200.length - 1].value : null;

  metrics.sma50 = latestSma50;
  metrics.sma200 = latestSma200;

  if (latestSma50 && latestSma200) {
    if (currentPrice > latestSma50 && latestSma50 > latestSma200) {
      score += 30; // Strong bullish trend
      metrics.trend = "Strong Bullish";
    } else if (currentPrice > latestSma200) {
      score += 20; // Mild uptrend / support
      metrics.trend = "Bullish Support";
    } else if (currentPrice < latestSma200 && currentPrice > latestSma50) {
      score += 10; // Sideways/Consolidating
      metrics.trend = "Consolidating";
    } else {
      score += 0; // Bearish
      metrics.trend = "Bearish Trend";
    }
  } else {
    score += 15; // default neutral
    metrics.trend = "No SMA Data";
  }

  // 2. Relative Strength Index RSI (25 pts max)
  const rsi = calculateRSI(history, 14);
  const latestRsi = rsi ? rsi[rsi.length - 1].value : null;
  metrics.rsi = latestRsi;

  if (latestRsi) {
    if (latestRsi < 30) {
      score += 25; // Highly oversold - buying zone
      metrics.rsiStatus = "Oversold";
    } else if (latestRsi >= 30 && latestRsi < 45) {
      score += 20; // Fair value - turning positive
      metrics.rsiStatus = "Accumulation";
    } else if (latestRsi >= 45 && latestRsi < 60) {
      score += 15; // Neutral
      metrics.rsiStatus = "Neutral";
    } else if (latestRsi >= 60 && latestRsi <= 70) {
      score += 8; // Slightly overbought
      metrics.rsiStatus = "Neutral-High";
    } else {
      score += 0; // Overbought (>70) - potential risk
      metrics.rsiStatus = "Overbought";
    }
  } else {
    score += 12;
    metrics.rsiStatus = "No RSI Data";
  }

  // 3. Drawdown from 52-Week Peak (25 pts max)
  const drawdown = calculateDrawdown(history);
  metrics.drawdown = drawdown.drawdownPercent;
  metrics.maxHigh = drawdown.maxHigh;

  if (drawdown.drawdownPercent >= 20 && drawdown.drawdownPercent < 35) {
    score += 25; // Solid discount (sweet spot)
  } else if (drawdown.drawdownPercent >= 10 && drawdown.drawdownPercent < 20) {
    score += 20; // Good discount
  } else if (drawdown.drawdownPercent >= 35 && drawdown.drawdownPercent < 50) {
    score += 12; // Deeper discount (higher risk, check fundamentals)
  } else if (drawdown.drawdownPercent >= 50) {
    score += 5; // Danger zone (falling knife)
  } else {
    score += 10; // Near all-time high (expensive, momentum play)
  }

  // 4. Dividend Yield & Valuation (20 pts max)
  const divYield = quote.dividendYield || 0;
  metrics.dividendYield = divYield;

  if (divYield > 0.12) {
    score += 20; // Excellent dividend (common on EGX)
  } else if (divYield > 0.08) {
    score += 15; // Good dividend
  } else if (divYield > 0.04) {
    score += 10; // Modest dividend
  } else if (divYield > 0) {
    score += 5;
  } else {
    score += 0; // No dividend
  }

  metrics.compositeScore = score;
  return {
    score,
    metrics
  };
}
