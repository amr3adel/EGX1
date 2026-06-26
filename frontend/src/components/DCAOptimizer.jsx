import React, { useState, useEffect } from 'react';

export default function DCAOptimizer({ backendUrl, dcaList, setDcaList, dcaAmount, setDcaAmount }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizerResults, setOptimizerResults] = useState([]);
  const [totalBudget, setTotalBudget] = useState(dcaAmount || 5000);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/stocks`);
      const data = await res.json();
      
      // Compute estimated scores like in Screener.jsx
      const processed = data.map(s => {
        const rsiEst = 35 + (s.changePercent * -5) + (s.ticker.charCodeAt(0) % 20);
        const divEst = s.dividendYield * 100;
        const trendEst = s.changePercent > -0.5 ? "Bullish" : "Bearish";
        const scoreEst = Math.round(Math.min(100, Math.max(20, 50 + (trendEst === "Bullish" ? 20 : 0) + (rsiEst < 45 ? 15 : 5) + (divEst > 8 ? 15 : 0))));

        return {
          ...s,
          score: scoreEst,
          price: s.price || 1.0 // fallback
        };
      });

      setStocks(processed);
    } catch (err) {
      console.error("Error fetching DCA stocks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStock = (ticker) => {
    if (dcaList.includes(ticker)) {
      setDcaList(dcaList.filter(t => t !== ticker));
    } else {
      setDcaList([...dcaList, ticker]);
    }
  };

  // Run the optimizer allocation logic
  const calculateAllocation = () => {
    if (dcaList.length === 0 || totalBudget <= 0) {
      setOptimizerResults([]);
      return;
    }

    // Filter selected stocks
    const selected = stocks.filter(s => dcaList.includes(s.ticker));
    
    // Calculate total score of selected
    const totalScore = selected.reduce((sum, s) => sum + s.score, 0);

    if (totalScore === 0) return;

    let totalAllocatedEgp = 0;
    
    const results = selected.map(s => {
      const weight = s.score / totalScore;
      const targetEgp = totalBudget * weight;
      const sharesToBuy = Math.floor(targetEgp / s.price);
      const actualCost = sharesToBuy * s.price;
      totalAllocatedEgp += actualCost;

      return {
        ticker: s.ticker,
        name: s.name,
        price: s.price,
        score: s.score,
        weightPercent: Number((weight * 100).toFixed(1)),
        targetEgp: Number(targetEgp.toFixed(2)),
        sharesToBuy,
        actualCost
      };
    });

    setOptimizerResults(results);
    setDcaAmount(totalBudget); // sync with parent state
  };

  // Trigger recalculation when lists or budget change
  useEffect(() => {
    calculateAllocation();
  }, [dcaList, totalBudget, stocks]);

  return (
    <div className="grid-2-1">
      {/* Configuration & Selection */}
      <div className="glass-card">
        <div className="glass-card-title">
          <span>⚙️ DCA Targets & Budget</span>
        </div>
        
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="dca-budget">Monthly Investment Budget (EGP)</label>
          <input
            type="number"
            id="dca-budget"
            className="form-input"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            placeholder="e.g. 5000"
            min="100"
          />
        </div>

        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem', color: '#fff' }}>
          Select Stocks for watch list ({dcaList.length} chosen)
        </h4>

        {loading ? (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Loading target stocks...</div>
        ) : (
          <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.5rem' }}>
            {stocks.map(s => (
              <label
                key={s.ticker}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  background: dcaList.includes(s.ticker) ? 'rgba(0,168,204,0.05)' : 'transparent'
                }}
              >
                <input
                  type="checkbox"
                  checked={dcaList.includes(s.ticker)}
                  onChange={() => handleToggleStock(s.ticker)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700', color: dcaList.includes(s.ticker) ? 'var(--color-accent)' : '#fff' }}>{s.ticker}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{s.price.toFixed(2)} EGP</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{s.name}</div>
                </div>
                <span className={`badge ${s.score >= 75 ? 'buy' : s.score >= 45 ? 'hold' : 'sell'}`} style={{ transform: 'scale(0.85)' }}>
                  {s.score}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Allocation Advice Results */}
      <div className="glass-card">
        <div className="glass-card-title">
          <span>📋 Optimized Allocation</span>
        </div>

        {dcaList.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</span>
            <p style={{ fontSize: '0.95rem' }}>Select stocks on the left checklist and set your monthly EGP budget to view optimal allocations.</p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {optimizerResults.map(item => (
                <div key={item.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div>
                      <strong style={{ color: 'var(--color-accent)' }}>{item.ticker}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>({item.weightPercent}%)</span>
                    </div>
                    <span className="badge hold" style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem' }}>Score {item.score}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    <span>Target: {Math.round(item.targetEgp)} EGP</span>
                    <span style={{ color: '#fff', fontWeight: '700' }}>Buy {item.sharesToBuy} Shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                    <span>Price: {item.price.toFixed(2)} EGP</span>
                    <span>Cost: {item.actualCost.toLocaleString()} EGP</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Total Budget:</span>
                <strong style={{ color: '#fff' }}>{totalBudget.toLocaleString()} EGP</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span>Allocated Cash:</span>
                <strong style={{ color: 'var(--color-green)' }}>
                  {optimizerResults.reduce((sum, r) => sum + r.actualCost, 0).toLocaleString()} EGP
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Remaining Cash:</span>
                <strong style={{ color: 'var(--color-gold)' }}>
                  {(totalBudget - optimizerResults.reduce((sum, r) => sum + r.actualCost, 0)).toFixed(2)} EGP
                </strong>
              </div>
            </div>
            
            <div style={{ marginTop: '1rem', background: 'rgba(0, 168, 204, 0.05)', border: '1px solid var(--border-glow)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              💡 **DCA Rule**: Value-Momentum logic weights higher-scoring stocks. Buy shares at market prices once a month. Keep remainder cash in EGP for next month's allocation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
