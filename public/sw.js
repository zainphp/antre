const CACHE_NAME = 'antre-static-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (
        request.method !== 'GET' ||
        url.origin !== self.location.origin ||
        request.destination === 'document'
    ) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response.clone());
                }

                return response;
            } catch {
                return cache.match(request);
            }
        }),
    );
});
