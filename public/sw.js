// Empty service worker to satisfy browser requests
// This prevents the "No route matches URL '/sw.js'" error
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.clients.claim();
});

