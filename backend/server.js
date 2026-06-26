import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { getQuote, getHistory, getBenchmarks, EGX_30_STOCKS } from './services/dataService.js';
import { calculateSMA, calculateRSI, calculateMACD, calculateDrawdown, computeScorecard } from './services/analysisService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serving frontend assets in production (will be built to frontend/dist)
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 1. GET /api/stocks - Get all EGX 30 constituents with current quote
app.get('/api/stocks', async (req, res) => {
  try {
    const stockQuotes = await Promise.all(
      EGX_30_STOCKS.map(async (stock) => {
        try {
          const quote = await getQuote(stock.ticker);
          return {
            ...stock,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            volume: quote.volume,
            dividendYield: quote.dividendYield,
            marketCap: quote.marketCap
          };
        } catch (err) {
          // If single stock fetch fails, return placeholder with metadata
          return {
            ...stock,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            dividendYield: 0,
            error: true
          };
        }
      })
    );
    res.json(stockQuotes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stock list: " + err.message });
  }
});

// 2. GET /api/stocks/:ticker - Get detailed quote, history, and indicators
app.get('/api/stocks/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const upperTicker = ticker.toUpperCase();

  try {
    const quote = await getQuote(upperTicker);
    const history = await getHistory(upperTicker, 1); // 1 year history

    // Calculate indicators
    const sma50 = calculateSMA(history, 50) || [];
    const sma200 = calculateSMA(history, 200) || [];
    const rsi = calculateRSI(history, 14) || [];
    const macd = calculateMACD(history) || [];
    const drawdown = calculateDrawdown(history);
    const scorecard = computeScorecard(quote, history);

    res.json({
      quote,
      history: history.slice(-90), // Send last 90 days for client performance chart
      indicators: {
        sma50: sma50.slice(-90),
        sma200: sma200.slice(-90),
        rsi: rsi.slice(-90),
        macd: macd.slice(-90)
      },
      drawdown,
      scorecard
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to analyze stock ${upperTicker}: ` + err.message });
  }
});

// 3. GET /api/benchmarks - Get current USD, Gold, EGX30 prices
app.get('/api/benchmarks', async (req, res) => {
  try {
    const data = await getBenchmarks();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch benchmarks: " + err.message });
  }
});

// 4. GET /api/benchmarks/history - Aligned history of EGX30, USD, Gold for chart
app.get('/api/benchmarks/history', async (req, res) => {
  try {
    let egxHistory = await getHistory('^CASE30', 1);
    const usdHistory = await getHistory('USDEGP=X', 1);
    const goldHistory = await getHistory('GC=F', 1);

    // Fallback if index history is missing (common on Yahoo Finance for ^CASE30)
    if (!egxHistory || egxHistory.length <= 1) {
      console.log("[Server] EGX 30 Index history is missing, using scaled COMI.CA as proxy...");
      try {
        const indexQuote = await getQuote('^CASE30');
        const comiQuote = await getQuote('COMI.CA');
        const comiHistory = await getHistory('COMI.CA', 1);
        
        const indexPrice = indexQuote.price || 51443;
        const comiPrice = comiQuote.price || 81.2;
        const scaleFactor = indexPrice / comiPrice;

        egxHistory = comiHistory.map(row => ({
          date: row.date,
          close: row.close * scaleFactor
        }));
      } catch (fallbackErr) {
        console.error("Index history fallback failed:", fallbackErr.message);
      }
    }

    // Map histories by date for alignment
    const usdMap = new Map(usdHistory.map(h => [h.date, h.close]));
    const goldMap = new Map(goldHistory.map(h => [h.date, h.close]));

    const aligned = [];
    
    // Normalize performance relative to the first item (base 100)
    let firstEgx = null;
    let firstUsd = null;
    let firstGoldEgp = null;

    for (const egxRow of egxHistory) {
      const date = egxRow.date;
      const usdRate = usdMap.get(date) || (aligned.length > 0 ? aligned[aligned.length - 1].usdegp : 47.5);
      const goldUsd = goldMap.get(date) || (aligned.length > 0 ? (aligned[aligned.length - 1].gold21k / (aligned[aligned.length - 1].usdegp * (21/24))) * 31.1035 : 2300);

      // Gold EGP Gram 21K calculation
      const gold24kGramEgp = (goldUsd / 31.1035) * usdRate;
      const gold21kGramEgp = gold24kGramEgp * (21 / 24);

      if (!firstEgx) {
        firstEgx = egxRow.close;
        firstUsd = usdRate;
        firstGoldEgp = gold21kGramEgp;
      }

      aligned.push({
        date,
        egx30: Number(egxRow.close.toFixed(2)),
        usdegp: Number(usdRate.toFixed(2)),
        gold21k: Number(gold21kGramEgp.toFixed(2)),
        // Indexed performance starting at 100
        egx30Performance: Number(((egxRow.close / firstEgx) * 100).toFixed(2)),
        usdegpPerformance: Number(((usdRate / firstUsd) * 100).toFixed(2)),
        goldPerformance: Number(((gold21kGramEgp / firstGoldEgp) * 100).toFixed(2))
      });
    }

    res.json(aligned.slice(-120)); // Return last 120 trading days (~6 months)
  } catch (err) {
    res.status(500).json({ error: "Failed to align benchmarks history: " + err.message });
  }
});

// 5. POST /api/advisor/analyze - Generates an investment memo
app.post('/api/advisor/analyze', async (req, res) => {
  const { portfolio, dcaList, dcaAmount, forecasts, prompt } = req.body;
  const geminiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

  try {
    // Gather statistics on portfolio and watchlists to supply in the AI prompt context
    let portfolioSummary = "No portfolio logged.";
    if (portfolio && portfolio.length > 0) {
      portfolioSummary = portfolio.map(item => 
        `- ${item.ticker}: ${item.shares} shares @ Avg Cost ${item.avgPrice} EGP`
      ).join('\n');
    }

    let dcaSummary = "No DCA targets chosen.";
    if (dcaList && dcaList.length > 0) {
      dcaSummary = `Targeting allocation of ${dcaAmount || 0} EGP among: ${dcaList.join(', ')}`;
    }

    let forecastsSummary = "No forecasts logged yet.";
    if (forecasts && forecasts.length > 0) {
      forecastsSummary = forecasts.map(fc => 
        `- ${fc.ticker}: Forecast Target ${fc.targetPrice} EGP (Created at ${fc.startPrice} EGP on ${fc.startDate}, due by ${fc.targetDate}) | Current Price: ${fc.currentPrice} EGP | Status: ${fc.status} (Return: ${fc.returnPct.toFixed(1)}%) | Thesis: "${fc.reason}"`
      ).join('\n');
    }

    // Fetch latest quotes for tickers in user lists to add to AI context
    const allTickers = Array.from(new Set([
      ...(portfolio || []).map(p => p.ticker),
      ...(dcaList || []),
      ...(forecasts || []).map(f => f.ticker)
    ]));

    let stockStatus = "";
    if (allTickers.length > 0) {
      const quotes = await Promise.all(
        allTickers.map(async (ticker) => {
          try {
            const q = await getQuote(ticker);
            const h = await getHistory(ticker, 1);
            const score = computeScorecard(q, h);
            return `${ticker}: Price ${q.price} EGP (${q.changePercent > 0 ? '+' : ''}${q.changePercent.toFixed(2)}%), Div Yield: ${(q.dividendYield * 100).toFixed(1)}%, Tech Score: ${score.score}/100.
  - Fundamentals: Pricing Power: ${q.pricingPower}, Growth: ${q.revenueGrowth}, Debt Level: ${q.debtLevel}, Exporter Status: ${q.isExporter ? "Yes (USD earner - protected against EGP devaluations)" : "No (Domestic EGP player)"}, Earnings Stability: ${q.earningsStability}.
  - Technical Setup: ${score.metrics.trend}, RSI is ${score.metrics.rsiStatus} @ ${score.metrics.rsi || 'N/A'}, Drawdown from Peak: -${score.metrics.drawdown}%`;
          } catch {
            return `${ticker}: (Data unavailable)`;
          }
        })
      );
      stockStatus = quotes.join('\n');
    }

    const benchmarks = await getBenchmarks();
    const systemInstruction = `You are "Farouk", an elite agentic investment advisor specializing in the Egyptian Stock Exchange (EGX). 
You help long-term investors who trade at most once or twice a month. 
Your goal is to provide realistic, conservative, and currency-aware advice, keeping in mind Egypt's high inflation and currency rate fluctuations (USD/EGP, local Gold prices).

Here is the current market context:
- EGX 30 Index: ${benchmarks.egx30.price} EGP (${benchmarks.egx30.changePercent > 0 ? '+' : ''}${benchmarks.egx30.changePercent}%)
- USD/EGP Official Exchange Rate: ${benchmarks.usdegp.price} EGP
- Gold 21K Price per Gram: ${benchmarks.gold21k.price} EGP

Here is the user's situation:
[User Portfolio]
${portfolioSummary}

[DCA Plan]
${dcaSummary}

[User Predictions & Price Forecasts]
${forecastsSummary}

[Relevant Stock Metrics (Fundamentals & Technicals)]
${stockStatus}

Always write in a professional, advisory, and helpful financial expert tone. Reference specific stock metrics (like exporter status, debt level, pricing power, RSI, or SMA trend). 
Offer clear forecasting advice:
1. Advise on target price ranges and forecast horizons (1, 3, or 6 months).
2. Explicitly review the user's registered forecasts. If a forecast has been "Hit", celebrate it. If it was a "Missed" target or is struggling, evaluate what macroeconomic factors in Egypt (e.g. inflation, central bank interest rates, currency devaluation) might have caused it.
3. Keep forecasts grounded in the company's exporter status and pricing power. Exporters (like ABUK, SWDY, ORWE) perform differently during EGP devaluations compared to domestic players.
Offer clear monthly action takeaways.`;

    const userPrompt = prompt || "Analyze my situation, evaluate my predictions, and suggest an actionable monthly plan.";

    if (geminiKey) {
      console.log("[Gemini] Calling Gemini API with advanced forecast context...");
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser request: ${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
      }

      const resData = await response.json();
      const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) {
        throw new Error("No content generated in Gemini response.");
      }

      return res.json({ analysis: generatedText });
    } else {
      console.log("[Advisor] Running rule-based fallback...");
      const memo = generateRuleBasedMemo(portfolio, dcaList, dcaAmount, forecasts, stockStatus, benchmarks);
      res.json({ analysis: memo, fallback: true });
    }
  } catch (err) {
    res.status(500).json({ error: "AI Analysis failed: " + err.message });
  }
});

// High-quality rule-based report builder
function generateRuleBasedMemo(portfolio, dcaList, dcaAmount, forecasts, stockStatus, benchmarks) {
  let text = `### 📋 EGX Monthly Investment Memorandum (Rule-Based Fallback)
*Generated by Farouk Advisor on ${new Date().toLocaleDateString('en-EG')}*

> 💡 **Notice:** You are currently in Local Simulation Mode. Connect a Gemini API Key in the Settings page to unlock natural language conversational AI advice.

#### 1. Macro Market Review
- **EGX 30 Index:** Currently trading at **${benchmarks.egx30.price.toLocaleString()} EGP** (${benchmarks.egx30.changePercent > 0 ? '▲' : '▼'} ${benchmarks.egx30.changePercent}% today). The market represents a liquid asset class, but remains subject to high EGP inflation.
- **Inflation Hedges:** USD/EGP is stable at **${benchmarks.usdegp.price} EGP** and local 21K Gold is at **${benchmarks.gold21k.price} EGP/Gram**. Your portfolio must yield returns above these hedges to grow real wealth.

#### 2. Portfolio Review & Health Checks
`;

  if (!portfolio || portfolio.length === 0) {
    text += `- No active holdings logged. Build a portfolio in the **Portfolio** tab to track gains, average costs, and comparative benchmarks.\n`;
  } else {
    text += `- You have **${portfolio.length}** active holdings. Checking alert status:\n`;
    if (stockStatus) {
      const lines = stockStatus.split('\n');
      lines.forEach(line => {
        if (line.includes("RSI is Overbought")) {
          text += `  - ⚠️ **${line.split(':')[0]}** is in the *Overbought* zone. Caution on buying more shares at current levels; hold or trim.\n`;
        } else if (line.includes("RSI is Oversold")) {
          text += `  - ✅ **${line.split(':')[0]}** is currently *Oversold*. This represents a historically strong long-term accumulation zone.\n`;
        } else if (line.includes("Bearish Trend")) {
          text += `  - 📉 **${line.split(':')[0]}** is trading in a *Bearish Trend* (under its 200 SMA). For a low-frequency monthly trader, avoid scaling heavily into falling trends until support consolidates.\n`;
        }
      });
    }
  }

  text += `\n#### 3. Price Forecasts & Thesis Verification\n`;
  if (forecasts && forecasts.length > 0) {
    forecasts.forEach(fc => {
      text += `- **${fc.ticker}**: Target **${fc.targetPrice} EGP** (Start: ${fc.startPrice} EGP) | Current: **${fc.currentPrice} EGP** (${fc.returnPct >= 0 ? '+' : ''}${fc.returnPct.toFixed(1)}%). Status: **${fc.status}** (Due: ${fc.targetDate}).
  - Thesis: *"${fc.reason}"*\n`;
    });
  } else {
    text += `- No active predictions logged. Log your stock price predictions in the **Forecasts** tab to track target accuracy over time.\n`;
  }

  text += `\n#### 4. Monthly Action Plan (DCA Allocations)
`;
  if (dcaList && dcaList.length > 0 && dcaAmount > 0) {
    text += `You plan to invest **${dcaAmount.toLocaleString()} EGP** this month. Based on your target stock ratings:\n- Check out the **DCA Optimizer** tab to view your exact buying quantities.\n- Focus on accumulating high-conviction dividend paying tickers (e.g. sectors like Materials/Fertilizers or Telecom) which offer protection during inflationary phases.`;
  } else {
    text += `- Set up your Monthly DCA target list and monthly savings budget in the **DCA Optimizer** tab to get automated cash allocation advice.`;
  }

  text += `\n\n*Advice disclaimer: This is an automated assessment based on technical metrics and does not constitute formal legal or financial advice. Maintain a diversified portfolio of stocks, gold, and liquid savings.*`;
  return text;
}

// Default catch-all to serve frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Conditionally listen if not run on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[EGX-Server] Server is running on port ${PORT}`);
  });
}

export default app;
