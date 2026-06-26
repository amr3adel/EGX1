import React, { useState } from 'react';

export default function Settings({ apiKey, setApiKey }) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('egx_gemini_key', keyInput);
    setApiKey(keyInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    localStorage.removeItem('egx_gemini_key');
    setKeyInput('');
    setApiKey('');
    alert('API Key cleared successfully.');
  };

  return (
    <div className="settings-container glass-card">
      <div className="glass-card-title">
        <span>⚙️ Advisor Settings</span>
        {apiKey ? (
          <span className="logo-tag" style={{ background: 'rgba(0, 230, 118, 0.1)', color: 'var(--color-green)', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
            AI Mode Active
          </span>
        ) : (
          <span className="logo-tag" style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--color-gold)', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
            Rule-Based Mode
          </span>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label htmlFor="api-key">Google Gemini API Key</label>
          <input
            type="password"
            id="api-key"
            className="form-input"
            placeholder="AI Studio API Key (AIzaSy...)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            The API Key is stored securely in your browser's local storage and is only sent directly to Google APIs.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn-primary">
            Save Configuration
          </button>
          {apiKey && (
            <button type="button" className="btn-secondary" onClick={handleClear}>
              Clear Key
            </button>
          )}
        </div>
      </form>

      {saved && (
        <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'rgba(0, 230, 118, 0.15)', border: '1px solid var(--color-green)', borderRadius: '8px', color: 'var(--color-green)', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>
          ✓ Configuration saved successfully!
        </div>
      )}

      <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem' }}>
        <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>How to get a Free Gemini API Key?</h4>
        <ol style={{ paddingLeft: '1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <li>Go to <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>Google AI Studio</a>.</li>
          <li>Log in with your Google account.</li>
          <li>Click on the **"Get API key"** button at the top left.</li>
          <li>Click **"Create API key"** and select/create a project.</li>
          <li>Copy your key and paste it in the field above!</li>
        </ol>
      </div>
    </div>
  );
}
