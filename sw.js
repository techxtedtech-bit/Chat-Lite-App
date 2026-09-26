// --- CHATLITE SERVICE WORKER (OFFLINE NAVIGATION CACHE) ---
const CACHE_NAME = 'chatlite-cache-v1';

// List all core assets needed to run the app offline
const ASSETS_TO_CACHE = [
    './',
    './chatlist.html',
    './chatroom.html',
    './groupchat.html',
    './supabase.js',
    './app.js',
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install Event: Cache all critical static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clear out old cache versions when you update code
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Serve from cache first, fall back to network if online
self.addEventListener('fetch', (event) => {
    // Skip Supabase API calls from being cached by the service worker (let Supabase handle its own data/network layer)
    if (event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // If offline and trying to navigate HTML pages, fall back gracefully to the main shell
                if (event.request.mode === 'navigate') {
                    return caches.match('./chatlist.html');
                }
            });
        })
    );
});
