import React, { useState, useEffect } from 'react';

export default function Portfolio({ backendUrl, portfolio, setPortfolio }) {
  const [transactions, setTransactions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  
  // Searchable stock dropdown
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Transaction Form Inputs
  const [ticker, setTicker] = useState('COMI.CA');
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Load transactions from localStorage
    const savedTx = localStorage.getItem('egx_portfolio_transactions');
    if (savedTx) {
      setTransactions(JSON.parse(savedTx));
    }
    fetchLatestQuotes();
    fetchBenchmarks();
  }, []);

  const fetchLatestQuotes = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/stocks`);
      const data = await res.json();
      setStocks(data);
      
      // Default search query to CIB
      const defaultStock = data.find(s => s.ticker === 'COMI.CA');
      if (defaultStock) {
        setSearchQuery(`${defaultStock.ticker} - ${defaultStock.name}`);
      }
    } catch (err) {
      console.error("Error fetching quotes for portfolio:", err);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/benchmarks`);
      const data = await res.json();
      setBenchmarks(data);
    } catch (err) {
      console.error("Error fetching benchmarks for portfolio:", err);
    }
  };

  // Re-calculate holdings whenever transactions or quotes change
  useEffect(() => {
    calculateHoldings();
  }, [transactions, stocks]);

  const calculateHoldings = () => {
    const holdingsMap = {};
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedTx.forEach(tx => {
      const { ticker, type, shares, price } = tx;
      if (!holdingsMap[ticker]) {
        holdingsMap[ticker] = { ticker, shares: 0, totalCost: 0, avgPrice: 0 };
      }

      const holding = holdingsMap[ticker];

      if (type === 'BUY') {
        const newShares = holding.shares + shares;
        const newCost = holding.totalCost + (shares * price);
        holding.shares = newShares;
        holding.totalCost = newCost;
        holding.avgPrice = newShares > 0 ? (newCost / newShares) : 0;
      } else if (type === 'SELL') {
        const newShares = Math.max(0, holding.shares - shares);
        holding.shares = newShares;
        holding.totalCost = newShares * holding.avgPrice;
      }
    });

    const activeHoldings = Object.values(holdingsMap)
      .filter(h => h.shares > 0)
      .map(h => {
        const quote = stocks.find(s => s.ticker === h.ticker);
        const currentPrice = quote ? quote.price : h.avgPrice;
        const name = quote ? quote.name : h.ticker;
        const sector = quote ? quote.sector : 'Other';
        const currentValue = h.shares * currentPrice;
        const profitLoss = currentValue - h.totalCost;
        const profitLossPercent = h.totalCost > 0 ? (profitLoss / h.totalCost) * 100 : 0;

        return {
          ...h,
          name,
          sector,
          currentPrice,
          currentValue,
          profitLoss,
          profitLossPercent
        };
      });

    setPortfolio(activeHoldings);
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!shares || !price) {
      alert("Please fill in all transaction details.");
      return;
    }

    const newTx = {
      id: Date.now().toString(),
      ticker,
      type,
      shares: Number(shares),
      price: Number(price),
      date
    };

    const updatedTx = [...transactions, newTx];
    setTransactions(updatedTx);
    localStorage.setItem('egx_portfolio_transactions', JSON.stringify(updatedTx));

    // Reset inputs
    setShares('');
    setPrice('');
  };

  const handleDeleteTransaction = (id) => {
    const updatedTx = transactions.filter(tx => tx.id !== id);
    setTransactions(updatedTx);
    localStorage.setItem('egx_portfolio_transactions', JSON.stringify(updatedTx));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your entire transaction history?")) {
      setTransactions([]);
      localStorage.removeItem('egx_portfolio_transactions');
      setPortfolio([]);
    }
  };

  // Find selected stock price for "Use Market Price" helper
  const selectedQuote = stocks.find(s => s.ticker === ticker);

  const handleUseMarketPrice = () => {
    if (selectedQuote) {
      setPrice(selectedQuote.price.toFixed(2));
    } else {
      alert("Please select a valid stock first.");
    }
  };

  // Filter stocks based on search query
  const filteredStocks = searchQuery
    ? stocks.filter(s =>
        s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stocks;

  // Dynamic cost calculation
  const totalCalculatedCost = (shares && price) ? Number(shares) * Number(price) : 0;

  // Convert cost to USD / Gold equivalents
  const getEquivalentText = () => {
    if (!benchmarks || totalCalculatedCost === 0) return '';
    const usdRate = benchmarks.usdegp.price || 47.5;
    const goldPrice = benchmarks.gold21k.price || 3150;

    const usdVal = totalCalculatedCost / usdRate;
    const goldVal = totalCalculatedCost / goldPrice;

    return `~ $${usdVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} USD | ~ ${goldVal.toFixed(2)}g Gold 21K`;
  };

  // Portfolio aggregates
  const totalCost = portfolio.reduce((sum, h) => sum + h.totalCost, 0);
  const currentValue = portfolio.reduce((sum, h) => sum + h.currentValue, 0);
  const totalProfitLoss = currentValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

  return (
    <div className="grid-2-1">
      {/* Holdings List & Aggregates */}
      <div>
        {/* Aggregates Summary */}
        <div className="grid-3" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Portfolio Cost</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem' }}>{totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP</h3>
          </div>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Current Valuation</span>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem' }}>{currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP</h3>
          </div>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Total Gain / Loss</span>
            <h3 style={{
              fontSize: '1.5rem', fontWeight: '800', marginTop: '0.2rem',
              color: totalProfitLoss >= 0 ? 'var(--color-green)' : 'var(--color-red)'
            }}>
              {totalProfitLoss >= 0 ? '+' : ''}
              {totalProfitLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })} EGP 
              <span style={{ fontSize: '0.9rem', fontWeight: '600', marginLeft: '0.4rem' }}>
                ({totalProfitLossPercent.toFixed(2)}%)
              </span>
            </h3>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass-card" style={{ padding: 0, marginBottom: '1.5rem' }}>
          <div className="glass-card-title" style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem' }}>
            <span>💼 Active Holdings ({portfolio.length})</span>
            {portfolio.length > 0 && (
              <button className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderColor: 'rgba(255, 61, 0, 0.3)', color: 'var(--color-red)' }} onClick={handleClearAll}>
                Clear All Logs
              </button>
            )}
          </div>
          
          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-secondary)' }}>
              No active holdings logged. Log a transaction on the right to start tracking.
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Shares</th>
                    <th>Avg Cost</th>
                    <th>Current</th>
                    <th>Total Cost</th>
                    <th>Valuation</th>
                    <th style={{ textAlign: 'right' }}>Gain / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map(h => (
                    <tr key={h.ticker}>
                      <td style={{ fontWeight: '700', color: 'var(--color-accent)' }}>{h.ticker}</td>
                      <td>{h.shares}</td>
                      <td>{h.avgPrice.toFixed(2)} EGP</td>
                      <td>{h.currentPrice.toFixed(2)} EGP</td>
                      <td>{h.totalCost.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP</td>
                      <td style={{ fontWeight: '600' }}>{h.currentValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP</td>
                      <td style={{ textAlign: 'right', fontWeight: '700' }} className={h.profitLoss >= 0 ? 'price-up' : 'price-down'}>
                        {h.profitLoss >= 0 ? '+' : ''}
                        {h.profitLoss.toLocaleString(undefined, { maximumFractionDigits: 1 })} EGP
                        <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>({h.profitLossPercent.toFixed(2)}%)</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Portfolio Visual Allocation Bars */}
        {portfolio.length > 0 && (
          <div className="glass-card">
            <div className="glass-card-title">
              <span>📊 Allocation Weightings</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {portfolio.map(h => {
                const weight = (h.currentValue / currentValue) * 100;
                return (
                  <div key={h.ticker}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.2rem', fontWeight: '600' }}>
                      <span>{h.ticker} - {h.name}</span>
                      <span>{weight.toFixed(1)}%</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ background: 'var(--color-accent)', width: `${weight}%`, height: '100%', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upgraded UX Transaction Logger */}
      <div>
        <div className="glass-card" style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
          <div className="glass-card-title">
            <span>📝 Log Transaction</span>
          </div>

          <form onSubmit={handleAddTransaction}>
            {/* Searchable stock combobox */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label htmlFor="tx-stock-search">Stock Search</label>
              <input
                type="text"
                id="tx-stock-search"
                className="form-input"
                placeholder="Type to search (e.g. CIB, TMGH)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              
              {showDropdown && filteredStocks.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--bg-secondary)', border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)', marginTop: '0.25rem'
                }}>
                  {filteredStocks.map(s => (
                    <div
                      key={s.ticker}
                      style={{
                        padding: '0.6rem 0.8rem', cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onClick={() => {
                        setTicker(s.ticker);
                        setSearchQuery(`${s.ticker} - ${s.name}`);
                        setShowDropdown(false);
                      }}
                      className="suggestion-item-hover"
                    >
                      <div>
                        <strong style={{ color: 'var(--color-accent)' }}>{s.ticker}</strong>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginLeft: '0.5rem' }}>{s.name}</span>
                      </div>
                      <span className="badge hold" style={{ fontSize: '0.65rem' }}>{s.sector}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transaction Type toggles */}
            <div className="form-group">
              <label>Transaction Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setType('BUY')}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    background: type === 'BUY' ? 'rgba(0, 230, 118, 0.15)' : 'transparent',
                    borderColor: type === 'BUY' ? 'var(--color-green)' : 'rgba(255,255,255,0.1)',
                    color: type === 'BUY' ? 'var(--color-green)' : 'var(--color-text-secondary)',
                    padding: '0.5rem'
                  }}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setType('SELL')}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    background: type === 'SELL' ? 'rgba(255, 61, 0, 0.15)' : 'transparent',
                    borderColor: type === 'SELL' ? 'var(--color-red)' : 'rgba(255,255,255,0.1)',
                    color: type === 'SELL' ? 'var(--color-red)' : 'var(--color-text-secondary)',
                    padding: '0.5rem'
                  }}
                >
                  Sell
                </button>
              </div>
            </div>

            {/* Shares and Price Fields */}
            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0' }}>
              <div className="form-group">
                <label htmlFor="tx-shares">Shares</label>
                <input
                  type="number"
                  id="tx-shares"
                  className="form-input"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  placeholder="e.g. 100"
                  min="1"
                />
              </div>

              <div className="form-group" style={{ position: 'relative' }}>
                <label htmlFor="tx-price">
                  Price (EGP)
                  {selectedQuote && (
                    <span
                      onClick={handleUseMarketPrice}
                      style={{
                        float: 'right', fontSize: '0.75rem', color: 'var(--color-accent)',
                        cursor: 'pointer', textDecoration: 'underline', fontWeight: '700'
                      }}
                    >
                      ⚡ Live Price
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="tx-price"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="EGP / Share"
                  min="0.1"
                />
              </div>
            </div>

            {/* Purchase date */}
            <div className="form-group">
              <label htmlFor="tx-date">Date</label>
              <input
                type="date"
                id="tx-date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Dynamic Value calculations */}
            {totalCalculatedCost > 0 && (
              <div style={{
                background: 'rgba(0, 168, 204, 0.05)', border: '1px solid var(--border-glow)',
                padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontWeight: '700', marginBottom: '0.2rem' }}>
                  <span>Total Cost:</span>
                  <span>{totalCalculatedCost.toLocaleString()} EGP</span>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                  {getEquivalentText()}
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Add to Holdings
            </button>
          </form>
        </div>

        {/* Transaction History Logs */}
        <div className="glass-card" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div className="glass-card-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            <span>📜 Transaction Logs ({transactions.length})</span>
          </div>

          {transactions.length === 0 ? (
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
              No history logged.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...transactions].reverse().map(tx => (
                <div key={tx.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)',
                  padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem'
                }}>
                  <div>
                    <span style={{
                      fontWeight: '800',
                      color: tx.type === 'BUY' ? 'var(--color-green)' : 'var(--color-red)',
                      marginRight: '0.4rem'
                    }}>{tx.type}</span>
                    <strong style={{ color: '#fff' }}>{tx.ticker}</strong>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>
                      {tx.shares} shares @ {tx.price} EGP | {tx.date}
                    </div>
                  </div>
                  <button
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', fontSize: '1rem', cursor: 'pointer' }}
                    onClick={() => handleDeleteTransaction(tx.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
