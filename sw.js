// --- CHATLITE SERVICE WORKER (OFFLINE CACHE & PUSH NOTIFICATIONS) ---
const CACHE_NAME = 'chatlite-cache-v4';

// List core local static assets needed to run the app offline (excluded external CDNs to prevent CORS/cache errors)
const ASSETS_TO_CACHE = [
    './',
    './chatlist.html',
    './chatroom.html',
    './groupchat.html',
    './supabase.js',
    './icon.png',
    './badge.png',
    './manifest.json'
];

// Install Event: Cache all critical static assets robustly
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching app shell assets...');
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(asset => 
                    cache.add(asset).catch(err => console.warn(`[Service Worker] Failed to cache: ${asset}`, err))
                )
            );
        })
    );
    self.skipWaiting();
});

// Activate Event: Clear out old cache versions when code updates
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[Service Worker] Removing old cache version:', key);
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
    // Skip Supabase API calls and external traffic/CDNs from being intercepted/cached incorrectly
    if (event.request.url.includes('supabase.co') || !event.request.url.startsWith(self.location.origin)) {
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

// --- PUSH NOTIFICATION EVENT HANDLER ---
self.addEventListener('push', (event) => {
    let data = { 
        title: 'ChatLite', 
        body: 'You have received a new message.', 
        url: './chatlist.html' 
    };
    
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: './icon.png', 
        badge: './badge.png',
        data: { url: data.url || './chatlist.html' },
        vibrate: [200, 100, 200],
        // UPDATED: Using a highly unique dynamic tag to ensure rapid notifications stack correctly
        tag: 'chatlite-msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'ChatLite', options)
    );
});

// --- CLIENT BACKGROUND MESSAGE LISTENER (SUPABASE REAL-TIME TRIGGER BRIDGE) ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, url } = event.data;
        const options = {
            body: body || 'New message received',
            icon: './icon.png',
            badge: './badge.png',
            data: { url: url || './chatlist.html' },
            vibrate: [200, 100, 200],
            // UPDATED: Using a highly unique dynamic tag to ensure rapid notifications stack correctly
            tag: 'chatlite-msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            renotify: true
        };

        event.waitUntil(
            self.registration.showNotification(title || 'ChatLite', options)
        );
    }
});

// --- NOTIFICATION CLICK EVENT (DEEP LINKING TO CHAT ROOM) ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : './chatlist.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if an existing open tab/window of the app is available and focus it
            for (let client of windowClients) {
                if (client.url.includes('chat') && 'focus' in client) {
                    client.focus();
                    return client.navigate(targetUrl);
                }
            }
            // If no open window exists, open a brand new window pointing straight to the target chat link
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
