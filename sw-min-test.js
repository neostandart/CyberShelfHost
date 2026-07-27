// TEMPORARY SPIKE DIAGNOSTIC — minimal SW to isolate Firefox controller issue. DELETE WITH SPIKE.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.pathname.endsWith('/sw-min-ping')) {
        event.respondWith(new Response('pong', { status: 200, headers: { 'X-Min-SW': '1' } }));
    }
});
