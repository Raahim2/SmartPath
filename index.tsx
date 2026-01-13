import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // StrictMode is temporarily removed to prevent double-initialization of Leaflet map in development
  // In production, proper cleanup handles this, but for this demo, it simplifies the Map component logic.
  <App />
);