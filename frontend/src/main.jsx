import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Intercept and suppress Chromium/Edge internal devtools soft-nav tracking bug
if (typeof window !== 'undefined') {
  const isDevToolsSoftNavBug = (msg, stack) => {
    const s = `${msg || ''} ${stack || ''}`;
    return s.includes('startTime') || s.includes('reportAllChanges') || s.includes('devToolsReportSoftNavs');
  };

  const origError = console.error;
  console.error = (...args) => {
    if (args.some(a => isDevToolsSoftNavBug(a?.message || a, a?.stack))) return;
    origError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (isDevToolsSoftNavBug(e.message, e.error?.stack)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
