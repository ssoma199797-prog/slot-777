import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Register the service worker for offline/PWA support (production builds only).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // An installed PWA can sit on an old build for a long time — it is
        // reopened rather than reloaded, so nothing ever asks for new code.
        // Check on every launch and whenever it comes back to the foreground.
        registration.update().catch(() => undefined);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
        });
      })
      .catch(() => {
        // Service worker is a progressive enhancement; ignore failures.
      });

    // When a new worker takes over, the page is running code that has been
    // replaced. Reload once so every device is on the same build.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  });
}
