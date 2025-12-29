// PWA utility functions
export function registerServiceWorker() {
  // Service worker is registered automatically by vite-plugin-pwa
  // This function can be used for manual registration if needed
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Vite PWA plugin handles registration automatically
      console.log('PWA service worker will be registered by vite-plugin-pwa');
    });
  }
}

