import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div id="mount-root">
      <App />
    </div>
  </StrictMode>,
);

// Fallback in case of JS failure
window.addEventListener('error', (e) => {
  console.error('Runtime error:', e);
  const root = document.getElementById('root');
  if (root && root.innerHTML === '') {
    root.innerHTML = '<div style="padding: 20px; color: red;">A runtime error occurred. Please check the console.</div>';
  }
});
