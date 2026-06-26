import React, { useState, useEffect } from 'react';

export default function ForecastTracker({ backendUrl, forecasts, setForecasts }) {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Inputs
  const [ticker, setTicker] = useState('COMI.CA');
  const [targetPrice, setTargetPrice] = useState('');
  const [periodMonths, setPeriodMonths] = useState('3');
  const [reason, setReason] = useState('');
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/stocks`);
      const data = await res.json();
      setStocks(data);
    } catch (err) {
      console.error("Error fetching stocks for forecasts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync quotes with logged forecasts to keep actual prices up to date
  const updateForecastsWithActuals = () => {
    const updated = forecasts.map(fc => {
      const quote = stocks.find(s => s.ticker === fc.ticker);
      const currentPrice = quote ? quote.price : fc.startPrice;
      
      const now = new Date();
      const targetDate = new Date(fc.targetDate);
      const isTargetPassed = now > targetDate;

      // Status logic
      let status = "Active";
      if (currentPrice >= fc.targetPrice) {
        status = "Hit";
      } else if (isTargetPassed) {
        status = "Missed";
      }

      const returnPct = ((currentPrice - fc.startPrice) / fc.startPrice) * 100;
      
      return {
        ...fc,
        currentPrice,
        status,
        returnPct
      };
    });

    // Check if anything actually changed before setting to avoid loop
    if (JSON.stringify(updated) !== JSON.stringify(forecasts)) {
      setForecasts(updated);
      localStorage.setItem('egx_forecasts', JSON.stringify(updated));
    }
  };

  useEffect(() => {
    if (stocks.length > 0 && forecasts.length > 0) {
      updateForecastsWithActuals();
    }
  }, [stocks]);

  const handleAddForecast = (e) => {
    e.preventDefault();
    if (!targetPrice || !reason) {
      alert("Please fill in target price and your core thesis.");
      return;
    }

    const quote = stocks.find(s => s.ticker === ticker);
    const startPrice = quote ? quote.price : 50;

    const startDate = new Date();
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + parseInt(periodMonths));

    const newFc = {
      id: Date.now().toString(),
      ticker,
      startPrice,
      targetPrice: Number(targetPrice),
      startDate: startDate.toISOString().split('T')[0],
      targetDate: targetDate.toISOString().split('T')[0],
      periodMonths: parseInt(periodMonths),
      reason,
      currentPrice: startPrice,
      status: "Active",
      returnPct: 0
    };

    const updated = [...forecasts, newFc];
    setForecasts(updated);
    localStorage.setItem('egx_forecasts', JSON.stringify(updated));

    // Reset inputs
    setTargetPrice('');
    setReason('');
  };

  const handleDeleteForecast = (id) => {
    const updated = forecasts.filter(fc => fc.id !== id);
    setForecasts(updated);
    localStorage.setItem('egx_forecasts', JSON.stringify(updated));
    if (selectedForecast?.id === id) {
      setSelectedForecast(null);
    }
  };

  // Load selected stock's history for rendering actual chart path
  const handleSelectForecast = async (fc) => {
    setSelectedForecast(fc);
    setLoadingChart(true);
    try {
      const res = await fetch(`${backendUrl}/api/stocks/${fc.ticker}`);
      const data = await res.json();
      
      // Filter history starting from forecast start date
      const startDateTime = new Date(fc.startDate).getTime();
      const filtered = data.history.filter(h => new Date(h.date).getTime() >= startDateTime);
      
      setSelectedHistory(filtered);
    } catch (err) {
      console.error("Error loading forecast chart history:", err);
    } finally {
      setLoadingChart(false);
    }
  };

  // Stats calculation
  const completed = forecasts.filter(fc => fc.status !== 'Active');
  const hitCount = completed.filter(fc => fc.status === 'Hit').length;
  const hitRate = completed.length > 0 ? (hitCount / completed.length) * 100 : 0;
  
  const avgReturn = forecasts.length > 0 
    ? (forecasts.reduce((sum, fc) => sum + fc.returnPct, 0) / forecasts.length) 
    : 0;

  // Render SVG Forecast vs Actual Chart
  const renderSVGForecastChart = () => {
    if (!selectedForecast) return null;

    const width = 600;
    const height = 280;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 25;
    const paddingBottom = 30;

    // Price bounds
    const actualPrices = selectedHistory.map(h => h.close);
    const allPrices = [
      selectedForecast.startPrice,
      selectedForecast.targetPrice,
      ...actualPrices
    ];

    const minPrice = Math.min(...allPrices) * 0.98;
    const maxPrice = Math.max(...allPrices) * 1.02;
    const priceRange = maxPrice - minPrice;

    // Time bounds: from startDate to targetDate (x-axis spans the full forecast period)
    const tStart = new Date(selectedForecast.startDate).getTime();
    const tEnd = new Date(selectedForecast.targetDate).getTime();
    const tRange = tEnd - tStart;

    const getX = (time) => paddingLeft + ((time - tStart) / tRange) * (width - paddingLeft - paddingRight);
    const getY = (price) => height - paddingBottom - ((price - minPrice) / priceRange) * (height - paddingTop - paddingBottom);

    // Dotted Forecast Line
    const xStart = getX(tStart);
    const yStart = getY(selectedForecast.startPrice);
    const xEnd = getX(tEnd);
    const yEnd = getY(selectedForecast.targetPrice);

    // Actual Solid Path
    let actualPath = '';
    selectedHistory.forEach((h, i) => {
      const t = new Date(h.date).getTime();
      const x = getX(t);
      const y = getY(h.close);
      
      // Stop drawing actual line if it exceeds the chart viewport bounds (i.e. if actual goes beyond target date)
      if (t <= tEnd) {
        actualPath += `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }
    });

    // Grid construction
    const gridCount = 4;
    const yGrid = [];
    for (let i = 0; i <= gridCount; i++) {
      const price = minPrice + (i / gridCount) * priceRange;
      const y = getY(price);
      yGrid.push(
        <g key={i}>
          <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <text x={paddingLeft - 8} y={y + 4} fill="var(--color-text-secondary)" fontSize="9" textAnchor="end">
            {Math.round(price)}
          </text>
        </g>
      );
    }

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {yGrid}
        
        {/* Axes */}
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" />
        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" />

        {/* Forecast Path (Dotted Gold) */}
        <line x1={xStart} y1={yStart} x2={xEnd} y2={yEnd} stroke="var(--color-gold)" strokeWidth="2" strokeDasharray="5,5" />
        {/* Start Point */}
        <circle cx={xStart} cy={yStart} r="4" fill="var(--color-gold)" />
        {/* Target Point */}
        <circle cx={xEnd} cy={yEnd} r="4" fill="var(--color-gold)" />
        
        <text x={xEnd + 8} y={yEnd + 4} fill="var(--color-gold)" fontSize="10" fontWeight="700">
          Target: {selectedForecast.targetPrice} EGP
        </text>

        {/* Actual Path (Solid Cyan) */}
        {actualPath && (
          <path d={actualPath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
        )}
        
        {/* Labels */}
        <text x={xStart} y={height - 10} fill="var(--color-text-secondary)" fontSize="9" textAnchor="middle">
          {selectedForecast.startDate}
        </text>
        <text x={xEnd} y={height - 10} fill="var(--color-text-secondary)" fontSize="9" textAnchor="middle">
          {selectedForecast.targetDate}
        </text>
      </svg>
    );
  };

  return (
    <div className="grid-2-1">
      {/* Forecast Ledger & Form */}
      <div>
        {/* Aggregate Stats Cards */}
        <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total Forecasts</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem' }}>{forecasts.length} Logs</h3>
          </div>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>AI Advisor Hit Rate</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem', color: 'var(--color-gold)' }}>
              {completed.length > 0 ? `${hitRate.toFixed(0)}%` : '—'}
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>({hitCount} out of {completed.length} resolved)</span>
          </div>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Avg ROI since Forecast</span>
            <h3 style={{
              fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem',
              color: avgReturn >= 0 ? 'var(--color-green)' : 'var(--color-red)'
            }}>
              {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(2)}%
            </h3>
          </div>
        </div>

        {/* Forecasts List */}
        <div className="glass-card" style={{ padding: 0 }}>
          <div className="glass-card-title" style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem' }}>
            <span>📈 Forecast Validation Ledger</span>
          </div>

          {forecasts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-secondary)' }}>
              No predictions logged. Create a forecast on the right to start validating accuracy!
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Start Price</th>
                    <th>Target Price</th>
                    <th>Actual Price</th>
                    <th>ROI</th>
                    <th>Target Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map(fc => (
                    <tr
                      key={fc.id}
                      style={{ cursor: 'pointer', background: selectedForecast?.id === fc.id ? 'rgba(0,168,204,0.04)' : 'transparent' }}
                      onClick={() => handleSelectForecast(fc)}
                    >
                      <td style={{ fontWeight: '700', color: 'var(--color-accent)' }}>{fc.ticker}</td>
                      <td>{fc.startPrice.toFixed(2)} EGP</td>
                      <td style={{ fontWeight: '600', color: 'var(--color-gold)' }}>{fc.targetPrice.toFixed(2)} EGP</td>
                      <td>{fc.currentPrice.toFixed(2)} EGP</td>
                      <td style={{ fontWeight: '700' }} className={fc.returnPct >= 0 ? 'price-up' : 'price-down'}>
                        {fc.returnPct >= 0 ? '+' : ''}{fc.returnPct.toFixed(1)}%
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{fc.targetDate}</td>
                      <td>
                        <span className={`badge ${fc.status === 'Hit' ? 'buy' : fc.status === 'Missed' ? 'sell' : 'hold'}`}>
                          {fc.status}
                        </span>
                      </td>
                      <td>
                        <button
                          style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: '1rem', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteForecast(fc.id);
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Creator & Graphical Comparison */}
      <div>
        {/* Creator Form */}
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <div className="glass-card-title">
            <span>➕ Log New Forecast</span>
          </div>

          <form onSubmit={handleAddForecast}>
            <div className="form-group">
              <label htmlFor="fc-ticker">Stock Ticker</label>
              <select id="fc-ticker" className="form-select" value={ticker} onChange={(e) => setTicker(e.target.value)}>
                {stocks.length > 0 ? (
                  stocks.map(s => <option key={s.ticker} value={s.ticker}>{s.ticker} ({s.name})</option>)
                ) : (
                  <option value="COMI.CA">COMI.CA</option>
                )}
              </select>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0' }}>
              <div className="form-group">
                <label htmlFor="fc-target">Target Price (EGP)</label>
                <input
                  type="number"
                  step="0.01"
                  id="fc-target"
                  className="form-input"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  placeholder="Target Price"
                  min="0.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="fc-period">Forecast Period</label>
                <select id="fc-period" className="form-select" value={periodMonths} onChange={(e) => setPeriodMonths(e.target.value)}>
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fc-reason">Investment Thesis & Reason</label>
              <textarea
                id="fc-reason"
                className="form-input"
                style={{ height: '70px', resize: 'none' }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you predict this stock will hit the target? Describe the fundamentals (exporter status, margins, etc.) and technical indicators..."
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Register Forecast
            </button>
          </form>
        </div>

        {/* Selected Forecast Graph Overlay */}
        {selectedForecast && (
          <div className="glass-card">
            <div className="glass-card-title">
              <span>📈 Forecast vs Actual Price Path</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>{selectedForecast.ticker}</span>
            </div>
            
            {loadingChart ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                Loading path comparison...
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  <span>Price (EGP)</span>
                  <span style={{ display: 'flex', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--color-gold)' }}>-- Dotted Target</span>
                    <span style={{ color: 'var(--color-accent)' }}>● Actual Path</span>
                  </span>
                </div>
                
                <div className="svg-chart-container" style={{ height: '220px' }}>
                  {renderSVGForecastChart()}
                </div>

                <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: '700', color: '#fff', marginBottom: '0.2rem' }}>Thesis & Context:</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                    "{selectedForecast.reason}"
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
