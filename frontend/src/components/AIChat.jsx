import React, { useState, useEffect, useRef } from 'react';

export default function AIChat({ backendUrl, apiKey, portfolio, dcaList, dcaAmount, forecasts }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Salaam! I am Farouk, your intelligent advisor for the Egyptian Stock Exchange (EGX). I can review your portfolio, check your monthly DCA allocation budget, and run technical/fundamental screenings to compile buy/sell predictions. Ask me anything about the market!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    const userText = textToSend || input;
    if (!userText.trim()) return;

    // Add user message
    const updatedMessages = [...messages, { role: 'user', text: userText }];
    setMessages(updatedMessages);
    if (!textToSend) setInput('');

    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/advisor/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': apiKey // send the user's client key
        },
        body: JSON.stringify({
          portfolio,
          dcaList,
          dcaAmount,
          forecasts,
          prompt: userText
        })
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setMessages([...updatedMessages, { role: 'assistant', text: data.analysis }]);
      } else {
        throw new Error(data.error || "Failed to fetch response.");
      }
    } catch (err) {
      setMessages([...updatedMessages, {
        role: 'system',
        text: `Error connecting to advisor agent: ${err.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Quick chips handler
  const handleChipClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  // Helper to parse simple markdown
  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content = line;
      let element = 'p';
      let style = {};

      // Headings
      if (line.startsWith('### ')) {
        element = 'h3';
        content = line.substring(4);
        style = { fontSize: '1.15rem', fontWeight: '700', margin: '0.8rem 0 0.4rem 0', color: '#fff' };
      } else if (line.startsWith('#### ')) {
        element = 'h4';
        content = line.substring(5);
        style = { fontSize: '1.0rem', fontWeight: '700', margin: '0.6rem 0 0.3rem 0', color: 'var(--color-accent)' };
      }
      // List items
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        element = 'li';
        content = line.trim().substring(2);
        style = { marginLeft: '1.25rem', listStyleType: 'disc', marginBottom: '0.2rem' };
      }
      // Blockquotes
      else if (line.startsWith('> ')) {
        element = 'blockquote';
        content = line.substring(2);
        style = { borderLeft: '3px solid var(--color-accent)', paddingLeft: '0.75rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: '0.5rem 0' };
      }

      // Inline strong parsing (**text**)
      const parts = content.split('**');
      const formattedContent = parts.map((part, i) => {
        if (i % 2 === 1) return <strong key={i} style={{ color: '#fff' }}>{part}</strong>;
        return part;
      });

      return React.createElement(
        element,
        { key: idx, style },
        formattedContent.length > 0 ? formattedContent : content
      );
    });
  };

  const suggestionChips = [
    "📝 Generate my monthly action memo",
    "⚖️ Compare EGX return vs USD and Gold",
    "🔍 Which of my watchlist stocks are oversold?",
    "🏦 Is CIB (COMI) a buy this month?"
  ];

  return (
    <div className="glass-card chat-window">
      <div className="glass-card-title">
        <span>💬 Chat with Farouk - EGX Advisor</span>
        {!apiKey && (
          <span className="logo-tag" style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--color-gold)', border: '1px solid rgba(255, 215, 0, 0.2)', fontSize: '0.75rem' }}>
            ⚠️ Local Simulation Mode
          </span>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <div className="markdown-render">{renderMarkdown(msg.text)}</div>
            ) : (
              msg.text
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
            Farouk is running math calculations and compiling your memo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="chat-suggestions" style={{ padding: '0.5rem 1rem 0 1rem' }}>
        {suggestionChips.map((chip, idx) => (
          <button
            key={idx}
            className="suggestion-chip"
            onClick={() => handleChipClick(chip)}
            disabled={loading}
          >
            {chip}
          </button>
        ))}
      </div>

      <form
        className="chat-input-area"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={{ padding: '0.75rem 1rem 1rem 1rem' }}
      >
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Farouk: 'Review my portfolio risk' or 'Explain COMI SMA status'..."
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
