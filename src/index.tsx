import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import '../styles.css'; // Direct import of CSS file

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);