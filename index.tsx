import React from 'react';
console.log('%c CALLHUB APP V:2.0.0 (Hardened) ', 'background: #222; color: #bada55; font-size: 20px;');
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for background call handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('ServiceWorker registration failed:', err);
    });
  });
}