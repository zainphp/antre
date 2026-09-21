const CACHE_NAME = 'antre-static-v2';

const PUBLIC_STATIC_PATHS = new Set([
    '/apple-touch-icon.png',
    '/favicon.ico',
    '/favicon.svg',
    '/manifest.webmanifest',
]);

function isPublicStaticAsset(url) {
    return (
        url.pathname.startsWith('/build/') ||
        PUBLIC_STATIC_PATHS.has(url.pathname)
    );
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches
                .keys()
                .then((keys) =>
                    Promise.all(
                        keys
                            .filter(
                                (key) =>
                                    key.startsWith('antre-static-') &&
                                    key !== CACHE_NAME,
                            )
                            .map((key) => caches.delete(key)),
                    ),
                ),
            self.clients.claim(),
        ]),
    );
});
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (
        request.method !== 'GET' ||
        url.origin !== self.location.origin ||
        !isPublicStaticAsset(url)
    ) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            try {
                const response = await fetch(request);
                const cacheControl =
                    response.headers.get('Cache-Control') ?? '';
                if (response.ok && !/\bno-store\b/i.test(cacheControl)) {
                    await cache.put(request, response.clone());
                }

                return response;
            } catch {
                return (await cache.match(request)) ?? Response.error();
            }
        }),
    );
});
