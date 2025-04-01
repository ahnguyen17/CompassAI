import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // Remove .tsx extension
import './index.css';
import './i18n'; // Import the i18n configuration
// Removed Prism CSS import - relying on style prop in component

// Find the root element
const rootElement = document.getElementById('root');

// Ensure the root element exists before rendering
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter> {/* Wrap App with BrowserRouter */}
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
} else {
  console.error("Failed to find the root element with ID 'root'");
}
