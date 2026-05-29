import React from 'react';
import ReactDOM from 'react-dom/client';
import BTTestPage from './pages/BTTestPage';

// Base styles + pulse animation (no external CSS dependency)
const styleEl = document.createElement('style');
styleEl.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; width: 100%; overflow: hidden; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0b0a14;
    -webkit-font-smoothing: antialiased;
  }
  input, textarea, button { font-family: inherit; font-size: inherit; outline: none; }
  button { cursor: pointer; border: none; background: none; color: inherit; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 99px; }
  input:focus { border-color: rgba(129,140,248,0.6) !important; }
  @keyframes pulse-bt {
    0%   { transform: scale(1);   opacity: 0.7; }
    70%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }
`;
document.head.appendChild(styleEl);

ReactDOM.createRoot(document.getElementById('root')).render(
  <BTTestPage />
);
