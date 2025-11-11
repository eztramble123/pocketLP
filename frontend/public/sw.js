// PocketLP Service Worker
const CACHE_NAME = 'pocketlp-v1';
const STATIC_CACHE_NAME = 'pocketlp-static-v1';
const DYNAMIC_CACHE_NAME = 'pocketlp-dynamic-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Add other static assets as needed
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/defi\//,
  /\/api\/tap\//,
];

// Network-first strategies for these patterns
const NETWORK_FIRST_PATTERNS = [
  /\/api\/defi\/chat/,
  /\/api\/tap\/purchase/,
  /\/api\/defi\/balance/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (unless specifically handled)
  if (url.origin !== self.location.origin && !url.host.includes('api')) {
    return;
  }
  
  // Handle API requests
  if (isApiRequest(url.pathname)) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Check if request is to API
function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

// Handle API requests with appropriate caching strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  // Use network-first for real-time data
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return networkFirst(request, DYNAMIC_CACHE_NAME);
  }
  
  // Use cache-first for less critical data
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    return cacheFirst(request, DYNAMIC_CACHE_NAME, { maxAge: 5 * 60 * 1000 }); // 5 minutes
  }
  
  // Default to network only for uncached API requests
  return fetch(request);
}

// Handle static requests (pages, assets)
async function handleStaticRequest(request) {
  // For navigation requests, use cache-first with network fallback
  if (request.mode === 'navigate') {
    return cacheFirst(request, STATIC_CACHE_NAME, { 
      fallback: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  
  // For other static assets, use cache-first
  return cacheFirst(request, STATIC_CACHE_NAME);
}

// Cache-first strategy with options
async function cacheFirst(request, cacheName, options = {}) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache is expired (if maxAge is specified)
      if (options.maxAge) {
        const cacheDate = new Date(cachedResponse.headers.get('sw-cache-date'));
        if (Date.now() - cacheDate.getTime() > options.maxAge) {
          // Cache expired, try network
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              responseClone.headers.set('sw-cache-date', new Date().toISOString());
              cache.put(request, responseClone);
              return networkResponse;
            }
          } catch (error) {
            console.log('[SW] Network failed, using stale cache:', error);
          }
        }
      }
      
      return cachedResponse;
    }
    
    // Not in cache, try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cache-date', new Date().toISOString());
      cache.put(request, responseClone);
    }
    return networkResponse;
    
  } catch (error) {
    console.log('[SW] Cache-first failed:', error);
    
    // Fallback for navigation requests
    if (options.fallback && request.mode === 'navigate') {
      const cache = await caches.open(cacheName);
      return cache.match(options.fallback);
    }
    
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cache-date', new Date().toISOString());
      cache.put(request, responseClone);
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-purchases') {
    event.waitUntil(syncOfflinePurchases());
  }
});

// Sync offline purchases when connection is restored
async function syncOfflinePurchases() {
  try {
    // Get offline purchases from IndexedDB (implementation would depend on your offline storage)
    // This is a placeholder for the actual implementation
    console.log('[SW] Syncing offline purchases...');
    
    // In a real implementation, you would:
    // 1. Retrieve stored offline purchases
    // 2. Send them to the server
    // 3. Remove them from local storage on success
    // 4. Notify the client of sync status
    
  } catch (error) {
    console.error('[SW] Failed to sync offline purchases:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data: data.data,
    tag: data.tag || 'pocketlp-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';
  
  if (action === 'view-dashboard') {
    url = '/?tab=dashboard';
  } else if (action === 'view-portfolio') {
    url = '/?tab=dashboard';
  } else if (data && data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        
        // Open new window if no existing window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_PURCHASE':
      // Cache purchase data for offline sync
      cachePurchaseForSync(data);
      break;
      
    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Cache purchase for offline sync
async function cachePurchaseForSync(purchaseData) {
  // In a real implementation, you would store this in IndexedDB
  // for later synchronization when the network is available
  console.log('[SW] Caching purchase for sync:', purchaseData);
}

// Get cache information
async function getCacheInfo() {
  const cacheNames = await caches.keys();
  const info = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    info[cacheName] = keys.length;
  }
  
  return {
    caches: info,
    version: CACHE_NAME
  };
}