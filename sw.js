/**
 * Self-uninstalling Service Worker
 * This replaces the old caching SW. When browsers fetch this updated SW,
 * it will clear all caches and unregister itself.
 */

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(names.map((name) => caches.delete(name)));
        }).then(() => {
            return self.registration.unregister();
        })
    );
});
