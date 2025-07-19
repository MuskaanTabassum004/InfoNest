import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any existing auth state on app start
try {
  // Clear auth-related localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('infonest_') || key.includes('auth') || key.includes('firebase')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear auth-related sessionStorage
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('infonest_') || key.includes('auth') || key.includes('firebase')) {
      sessionStorage.removeItem(key);
    }
  });
} catch (error) {
  console.warn('Failed to clear initial auth state:', error);
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
