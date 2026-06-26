import React, { useState, useEffect } from 'react';

export default function Dashboard({ backendUrl, portfolio }) {
  const [benchmarks, setBenchmarks] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marketTrends, setMarketTrends] = useState([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState(null); // 'egx30' | 'usdegp' | 'gold21k' | null

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch benchmarks
      const resB = await fetch(`${backendUrl}/api/benchmarks`);
      const dataB = await resB.json();
      setBenchmarks(dataB);

      // Fetch historical charts
      const resH = await fetch(`${backendUrl}/api/benchmarks/history`);
      const dataH = await resH.json();
      setHistory(dataH);

      // Fetch stock quotes for gainers/losers
      const resS = await fetch(`${backendUrl}/api/stocks`);
      const dataS = await resS.json();
      
      const sorted = [...dataS]
        .filter(s => s.price > 0)
        .sort((a, b) => b.changePercent - a.changePercent);
      
      setMarketTrends(sorted);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const topGainers = marketTrends.slice(0, 3);
  const topLosers = [...marketTrends].reverse().slice(0, 3);

  // SVG Chart Render for Benchmarks (Indexed at 100)
  const renderBenchmarkChart = () => {
    if (history.length === 0) return null;

    const width = 600;
    const height = 280;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    // Find min and max performance index values
    const allValues = history.flatMap(h => [
      h.egx30Performance,
      h.usdegpPerformance,
      h.goldPerformance
    ]);

    const minVal = Math.min(...allValues) * 0.98;
    const maxVal = Math.max(...allValues) * 1.02;
    const valRange = maxVal - minVal;

    const count = history.length;
    const getX = (index) => paddingLeft + (index / (count - 1)) * (width - paddingLeft - paddingRight);
    const getY = (val) => height - paddingBottom - ((val - minVal) / valRange) * (height - paddingTop - paddingBottom);

    // Build line paths
    let egxPath = '';
    let usdPath = '';
    let goldPath = '';

    history.forEach((h, i) => {
      const x = getX(i);
      egxPath += `${i === 0 ? 'M' : 'L'} ${x} ${getY(h.egx30Performance)}`;
      usdPath += `${i === 0 ? 'M' : 'L'} ${x} ${getY(h.usdegpPerformance)}`;
      goldPath += `${i === 0 ? 'M' : 'L'} ${x} ${getY(h.goldPerformance)}`;
    });

    // Grid construction
    const gridCount = 4;
    const yGrid = [];
    for (let i = 0; i <= gridCount; i++) {
      const val = minVal + (i / gridCount) * valRange;
      const y = getY(val);
      yGrid.push(
        <g key={i}>
          <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <text x={paddingLeft - 8} y={y + 4} fill="var(--color-text-secondary)" fontSize="9" textAnchor="end">
            {val.toFixed(0)}%
          </text>
        </g>
      );
    }

    // X axis labels
    const xGrid = [];
    const step = Math.floor(count / 3);
    [0, step, step * 2, count - 1].forEach(idx => {
      if (idx < count) {
        const x = getX(idx);
        xGrid.push(
          <text key={idx} x={x} y={height - 10} fill="var(--color-text-secondary)" fontSize="9" textAnchor="middle">
            {history[idx].date.substring(5)}
          </text>
        );
      }
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {yGrid}
        {xGrid}
        
        {/* Horizontal base */}
        <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" />
        {/* Vertical base */}
        <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255,255,255,0.15)" />

        {/* Paths */}
        <path d={usdPath} fill="none" stroke="var(--color-green)" strokeWidth="2" opacity="0.9" />
        <path d={goldPath} fill="none" stroke="var(--color-gold)" strokeWidth="2" opacity="0.9" />
        <path d={egxPath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" />
      </svg>
    );
  };

  // SVG Chart Render for Modal Benchmark (Actual prices)
  const renderRawBenchmarkChart = (type) => {
    if (history.length === 0) return null;

    const width = 550;
    const height = 230;
    const paddingLeft = 50;
    const paddingRight = 15;
    const paddingTop = 20;
    const paddingBottom = 30;

    const values = history.map(h => {
      if (type === 'egx30') return h.egx30;
      if (type === 'usdegp') return h.usdegp;
      return h.gold21k;
    });

    const minVal = Math.min(...values) * 0.99;
    const maxVal = Math.max(...values) * 1.01;
    const valRange = maxVal - minVal;

    const count = history.length;
    const getX = (index) => paddingLeft + (index / (count - 1)) * (width - paddingLeft - paddingRight);
    const getY = (val) => height - paddingBottom - ((val - minVal) / valRange) * (height - paddingTop - paddingBottom);

    let path = '';
    history.forEach((h, i) => {
      const val = type === 'egx30' ? h.egx30 : type === 'usdegp' ? h.usdegp : h.gold21k;
      path += `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`;
    });

    const strokeColor = type === 'egx30' ? 'var(--color-accent)' : type === 'usdegp' ? 'var(--color-green)' : 'var(--color-gold)';
    const fillGrad = `url(#grad-${type})`;

    // Grid lines
    const gridCount = 4;
    const yGrid = [];
    for (let i = 0; i <= gridCount; i++) {
      const val = minVal + (i / gridCount) * valRange;
      const y = getY(val);
      yGrid.push(
        <g key={i}>
          <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <text x={paddingLeft - 8} y={y + 3} fill="var(--color-text-secondary)" fontSize="9" textAnchor="end">
            {type === 'usdegp' ? val.toFixed(2) : Math.round(val).toLocaleString()}
          </text>
        </g>
      );
    }

    const xGrid = [];
    const step = Math.floor(count / 3);
    [0, step, step * 2, count - 1].forEach(idx => {
      if (idx < count) {
        const x = getX(idx);
        xGrid.push(
          <text key={idx} x={x} y={height - 8} fill="var(--color-text-secondary)" fontSize="9" textAnchor="middle">
            {history[idx].date.substring(5)}
          </text>
        );
      }
    });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id={`grad-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0"/>
          </linearGradient>
        </defs>
        {yGrid}
        {xGrid}
        
        <path d={`${path} L ${getX(count - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`} fill={fillGrad} />
        <path d={path} fill="none" stroke={strokeColor} strokeWidth="2.5" />
      </svg>
    );
  };

  // Calculate portfolio status summary
  const totalCost = portfolio.reduce((sum, h) => sum + h.totalCost, 0);
  const currentValue = portfolio.reduce((sum, h) => sum + h.currentValue, 0);
  const totalGain = currentValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return (
    <div>
      {/* 3 Benchmark Cards */}
      {loading || !benchmarks ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-secondary)' }}>
          Loading EGX & Currency benchmarks...
        </div>
      ) : (
        <div className="grid-3">
          <div
            className="glass-card benchmark-card egx"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedBenchmark('egx30')}
          >
            <div className="benchmark-info">
              <h4>EGX 30 Index</h4>
              <div className="benchmark-price">{benchmarks.egx30.price.toLocaleString()} EGP</div>
              <span className={`benchmark-change ${benchmarks.egx30.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                {benchmarks.egx30.changePercent >= 0 ? '▲' : '▼'} {benchmarks.egx30.changePercent}%
              </span>
            </div>
            <span style={{ fontSize: '2.2rem' }}>📈</span>
          </div>

          <div
            className="glass-card benchmark-card usd"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedBenchmark('usdegp')}
          >
            <div className="benchmark-info">
              <h4>USD / EGP Rate</h4>
              <div className="benchmark-price">{benchmarks.usdegp.price.toFixed(2)} EGP</div>
              <span className={`benchmark-change ${benchmarks.usdegp.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                {benchmarks.usdegp.changePercent >= 0 ? '▲' : '▼'} {benchmarks.usdegp.changePercent}%
              </span>
            </div>
            <span style={{ fontSize: '2.2rem' }}>💵</span>
          </div>

          <div
            className="glass-card benchmark-card gold"
            style={{ cursor: 'pointer' }}
            onClick={() => setSelectedBenchmark('gold21k')}
          >
            <div className="benchmark-info">
              <h4>Gold 21K Gram</h4>
              <div className="benchmark-price">{benchmarks.gold21k.price.toLocaleString()} EGP</div>
              <span className={`benchmark-change ${benchmarks.gold21k.changePercent >= 0 ? 'price-up' : 'price-down'}`}>
                {benchmarks.gold21k.changePercent >= 0 ? '▲' : '▼'} {benchmarks.gold21k.changePercent}%
              </span>
            </div>
            <span style={{ fontSize: '2.2rem' }}>🪙</span>
          </div>
        </div>
      )}

      {/* Main Grid: Comparative Chart & Market Action */}
      <div className="grid-2-1">
        {/* Comparative returns chart */}
        <div className="glass-card">
          <div className="glass-card-title">
            <span>📊 Asset Performance Comparison (Indexed to 100)</span>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--color-accent)' }}>● EGX30</span>
              <span style={{ color: 'var(--color-green)' }}>● USD cash</span>
              <span style={{ color: 'var(--color-gold)' }}>● Gold 21K</span>
            </div>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-secondary)' }}>
              Loading performance trends...
            </div>
          ) : (
            <div className="svg-chart-container" style={{ height: '280px' }}>
              {renderBenchmarkChart()}
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>
            Historical 6-month growth index. A return above 100% means the asset outpaced its initial value.
          </p>
        </div>

        {/* Side Panel: User Portfolio Status & Market Movers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* User Portfolio summary */}
          <div className="glass-card" style={{ background: 'rgba(0, 168, 204, 0.03)', border: '1px solid var(--border-glow)' }}>
            <div className="glass-card-title" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
              <span>💼 Your Portfolio Overview</span>
            </div>
            {portfolio.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                No active holdings. Go to the **Portfolio** tab to log your stock purchases and track your comparative performance.
              </p>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Valuation:</span>
                  <strong style={{ color: '#fff' }}>{currentValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Returns:</span>
                  <strong style={{ color: totalGain >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                    {totalGain >= 0 ? '+' : ''}{totalGain.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP ({totalGainPercent.toFixed(1)}%)
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Daily Movers */}
          <div className="glass-card">
            <div className="glass-card-title" style={{ fontSize: '1.0rem', marginBottom: '0.75rem' }}>
              <span>🚀 EGX30 Today's Movers</span>
            </div>
            {loading ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Loading Movers...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-green)', fontWeight: '700', marginBottom: '0.25rem' }}>▲ Top Gainers</div>
                  {topGainers.map(s => (
                    <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '600' }}>{s.ticker}</span>
                      <span className="price-up">+{s.changePercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-red)', fontWeight: '700', marginBottom: '0.25rem' }}>▼ Top Losers</div>
                  {topLosers.map(s => (
                    <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '600' }}>{s.ticker}</span>
                      <span className="price-down">{s.changePercent.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Benchmark Popup Modal */}
      {selectedBenchmark && benchmarks && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setSelectedBenchmark(null)}>
          
          <div className="glass-card" style={{
            width: '100%', maxWidth: '650px', position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            <button style={{
              position: 'absolute', top: '1rem', right: '1.25rem',
              background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem',
              cursor: 'pointer'
            }} onClick={() => setSelectedBenchmark(null)}>×</button>

            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.25rem' }}>
              {selectedBenchmark === 'egx30' ? '📈 EGX 30 Index Price History' :
               selectedBenchmark === 'usdegp' ? '💵 USD / EGP Exchange Rate History' :
               '🪙 Gold 21K Gram Price History'}
            </h3>
            
            <div style={{ display: 'flex', gap: '1.5rem', margin: '1rem 0' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Current Price</span>
                <h4 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                  {selectedBenchmark === 'egx30' ? `${benchmarks.egx30.price.toLocaleString()} EGP` :
                   selectedBenchmark === 'usdegp' ? `${benchmarks.usdegp.price.toFixed(2)} EGP` :
                   `${benchmarks.gold21k.price.toLocaleString()} EGP`}
                </h4>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Daily Change</span>
                <h4 className={
                  (selectedBenchmark === 'egx30' ? benchmarks.egx30.changePercent :
                   selectedBenchmark === 'usdegp' ? benchmarks.usdegp.changePercent :
                   benchmarks.gold21k.changePercent) >= 0 ? 'price-up' : 'price-down'
                } style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                  {(selectedBenchmark === 'egx30' ? benchmarks.egx30.changePercent :
                    selectedBenchmark === 'usdegp' ? benchmarks.usdegp.changePercent :
                    benchmarks.gold21k.changePercent) >= 0 ? '▲' : '▼'}{' '}
                  {selectedBenchmark === 'egx30' ? Math.abs(benchmarks.egx30.changePercent) :
                   selectedBenchmark === 'usdegp' ? Math.abs(benchmarks.usdegp.changePercent) :
                   Math.abs(benchmarks.gold21k.changePercent)}%
                </h4>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                📊 6-Month Actual Price Trend (EGP)
              </div>
              <div className="svg-chart-container" style={{ height: '230px' }}>
                {renderRawBenchmarkChart(selectedBenchmark)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
