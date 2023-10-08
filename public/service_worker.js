"use strict";

console.log(123132345)
const CACHE_NAME = "Lepefer-site-v1";

self.addEventListener("install", async installEvent => {

    const 
    get_files = await fetch('/files_to_cache', {
        method: 'GET'
    }),
    response = await get_files.json();

    console.log(response);

    installEvent.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        cache.addAll(response.files);
    })());

})

self.addEventListener("activate", event => {
    console.log( "WORKER: activation event in progress." );
    clients.claim();
    console.log( "WORKER: all clients are now controlled by me! Mwahahaha!" );
});

// We have a cache-first strategy, 
// where we look for resources in the cache first
// and only on the network if this fails.
self.addEventListener('fetch', event => {


    console.log(event);

    event.respondWith(async () => {

        const cache = await caches.open(CACHE_NAME);

        // Try the cache first.
        const cachedResponse = await cache.match(event.request);

        if (cachedResponse !== undefined) {
            // Cache hit, let's send the cached resource.
            console.log(cachedResponse);
            return cachedResponse;
        } else {
            // Nothing in cache, let's go to the network.

            // ...... truncated ....
        }
    })
})