import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import DCAOptimizer from './components/DCAOptimizer';
import Screener from './components/Screener';
import ForecastTracker from './components/ForecastTracker';
import AIChat from './components/AIChat';
import Settings from './components/Settings';

const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : window.location.origin;

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiKey, setApiKey] = useState('');
  const [portfolio, setPortfolio] = useState([]);
  const [dcaList, setDcaList] = useState([]);
  const [dcaAmount, setDcaAmount] = useState(5000);
  const [forecasts, setForecasts] = useState([]);

  useEffect(() => {
    // Load config from localStorage
    const savedKey = localStorage.getItem('egx_gemini_key');
    if (savedKey) setApiKey(savedKey);

    const savedDcaList = localStorage.getItem('egx_dca_list');
    if (savedDcaList) setDcaList(JSON.parse(savedDcaList));

    const savedDcaAmount = localStorage.getItem('egx_dca_amount');
    if (savedDcaAmount) setDcaAmount(Number(savedDcaAmount));

    const savedForecasts = localStorage.getItem('egx_forecasts');
    if (savedForecasts) setForecasts(JSON.parse(savedForecasts));
  }, []);

  // Sync DCA list & budget to localStorage on updates
  useEffect(() => {
    if (dcaList.length > 0) {
      localStorage.setItem('egx_dca_list', JSON.stringify(dcaList));
    }
  }, [dcaList]);

  useEffect(() => {
    localStorage.setItem('egx_dca_amount', dcaAmount.toString());
  }, [dcaAmount]);

  return (
    <div className="app-container">
      {/* Premium Header */}
      <header className="app-header">
        <div className="logo-section">
          <span className="logo-icon">▲</span>
          <span className="logo-text">Farouk Advisor</span>
          <span className="logo-tag">EGX Intelligent AI</span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            Portfolio
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'optimizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('optimizer')}
          >
            DCA Optimizer
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'screener' ? 'active' : ''}`}
            onClick={() => setActiveTab('screener')}
          >
            Screener
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'forecasts' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecasts')}
          >
            Forecasts
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Advisor Chat
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard backendUrl={BACKEND_URL} portfolio={portfolio} />
        )}
        {activeTab === 'portfolio' && (
          <Portfolio backendUrl={BACKEND_URL} portfolio={portfolio} setPortfolio={setPortfolio} />
        )}
        {activeTab === 'optimizer' && (
          <DCAOptimizer
            backendUrl={BACKEND_URL}
            dcaList={dcaList}
            setDcaList={setDcaList}
            dcaAmount={dcaAmount}
            setDcaAmount={setDcaAmount}
          />
        )}
        {activeTab === 'screener' && (
          <Screener backendUrl={BACKEND_URL} />
        )}
        {activeTab === 'forecasts' && (
          <ForecastTracker backendUrl={BACKEND_URL} forecasts={forecasts} setForecasts={setForecasts} />
        )}
        {activeTab === 'chat' && (
          <AIChat
            backendUrl={BACKEND_URL}
            apiKey={apiKey}
            portfolio={portfolio}
            dcaList={dcaList}
            dcaAmount={dcaAmount}
            forecasts={forecasts}
          />
        )}
        {activeTab === 'settings' && (
          <Settings apiKey={apiKey} setApiKey={setApiKey} />
        )}
      </main>
    </div>
  );
}
