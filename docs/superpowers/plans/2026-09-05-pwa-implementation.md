# PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm tính năng PWA (installability + offline shell + offline order queue) cho POS app.

**Architecture:** Service Worker cache-first cho app shell và CDN, runtime cache cho GET API data, IndexedDB queue cho offline POST orders. Không có build step — React qua CDN + Babel standalone.

**Tech Stack:** Vanilla JS Service Worker, IndexedDB, PWA Manifest, React hooks.

---

## Global Constraints

- Cloudflare Workers serving `public/` folder as static assets
- React 18 UMD từ unpkg.com CDN
- Babel standalone transpiles JSX trong browser
- Không thêm build tool (giữ nguyên CDN approach)
- Service worker chỉ hoạt động qua HTTPS (Workers đã có HTTPS)
- CACHE_NAME version: `pos-v1`

---

## File Structure

```
public/
├── sw.js                    # [CREATE] Service Worker
├── manifest.json            # [CREATE] PWA manifest
├── icons/                  # [CREATE] Icon directory
│   ├── icon-192.png       # [CREATE] 192x192 app icon
│   └── icon-512.png       # [CREATE] 512x512 app icon
├── index.html              # [MODIFY] Thêm meta tags, SW register
└── app.jsx                # [MODIFY] Thêm offline queue, install prompt
```

---

## Task Decomposition

### Task 1: Create PWA Manifest

**Files:**
- Create: `public/manifest.json`

**Interfaces:**
- Consumes: theme color `#3b82f6`, app name "POS Quán"
- Produces: PWA manifest JSON loadable via `/manifest.json`

- [ ] **Step 1: Tạo manifest.json với đầy đủ fields**

```json
{
  "name": "POS Quán",
  "short_name": "POS",
  "description": "Ứng dụng POS - Gọi món, quản lý bàn",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "categories": ["food", "business"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "feat(pwa): add manifest.json for installability"
```

---

### Task 2: Create App Icons

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`

**Interfaces:**
- Consumes: Canvas API, gradient colors (#3b82f6 → #1d4ed8), text "POS"
- Produces: PNG files referenced by manifest.json

**Approach:** Dùng inline script để generate PNG qua Canvas API, save vào file system. Icon đơn giản: hình vuông bo tròn góc, gradient nền xanh, chữ "POS" trắng ở giữa.

- [ ] **Step 1: Tạo script generate icons và chạy**

Tạo file `scripts/generate-icons.js`:

```js
// scripts/generate-icons.js
const fs = require('fs');
const path = require('path');

// Canvas sẽ được polyfill bằng sharp hoặc dùng pure PNG generation
// Ở đây dùng cách đơn giản: tạo PNG header + IDAT chunk thủ công
// Hoặc dùng sharp nếu có trong dependencies

// Fallback: tạo placeholder PNG đơn giản (solid color square)
function createMinimalPNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const width = size;
  const height = size;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);
  
  // IDAT chunk (compressed solid color image)
  // Tạo raw image data (filter byte + RGB for each row)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type none
    for (let x = 0; x < width; x++) {
      // Gradient từ #3b82f6 (top-left) to #1d4ed8 (bottom-right)
      const t = (x + y) / (width + height);
      rawData.push(Math.round(59 + (29 - 59) * t));  // R
      rawData.push(Math.round(130 + (78 - 130) * t)); // G  
      rawData.push(Math.round(246 + (216 - 246) * t)); // B
    }
  }
  
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = makeChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) {
    crc = (table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createMinimalPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createMinimalPNG(512));

console.log('Icons generated: icon-192.png, icon-512.png');
```

Chạy script:
```bash
node scripts/generate-icons.js
```

- [ ] **Step 2: Commit icons**

```bash
git add public/icons/
git commit -m "feat(pwa): add app icons (192x192, 512x512)"
```

---

### Task 3: Create Service Worker

**Files:**
- Create: `public/sw.js`

**Interfaces:**
- Consumes: PRECACHE_URLS array, CACHE_NAME
- Produces: Service worker registration, cache-first fetch handling, message-based queue sync

- [ ] **Step 1: Viết sw.js với đầy đủ logic**

```js
// public/sw.js - PWA Service Worker cho POS
const CACHE_NAME = 'pos-v1';

// Precache list — tất cả resources cần thiết
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/app.jsx',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // CDN resources
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',
  'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
];

// Runtime cache cho GET API responses (đọc offline)
const API_CACHE_NAME = 'pos-api-v1';

// ============ Install ============
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precache all resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============ Activate ============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => {
            console.log('[SW] Delete old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============ Fetch ============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST/PUT/DELETE không cache)
  if (request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Navigation request (/)
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => response || fetch(request))
    );
    return;
  }

  // API GET requests — network-first, cache response
  if (url.pathname.startsWith('/api/')) {
    // /api/changes polling — không cache, luôn network
    if (url.pathname.includes('/changes')) {
      return;
    }

    event.respondWith(
      networkFirstWithCache(request, API_CACHE_NAME)
    );
    return;
  }

  // Static files & CDN — cache-first
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        return fetch(request).then(networkResponse => {
          // Cache successful responses
          if (networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cloned));
          }
          return networkResponse;
        });
      })
  );
});

// ============ Helper: Network First with Cache ============
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed — try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // No cache — return offline error JSON
    return new Response(
      JSON.stringify({ error: 'offline', cached: false }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============ Message Handling (từ app) ============
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Sync offline orders
  if (event.data && event.data.type === 'SYNC_ORDERS') {
    syncOfflineOrders().then(() => {
      event.ports[0].postMessage({ success: true });
    }).catch(err => {
      event.ports[0].postMessage({ success: false, error: err.message });
    });
  }
});

// ============ Offline Order Sync ============
async function syncOfflineOrders() {
  // Mở IndexedDB và sync queue
  // (Logic này implement trong app.jsx, SW chỉ nhận message trigger)
  console.log('[SW] Sync triggered');
}

// ============ Background Sync (nếu hỗ trợ) ============
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders());
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat(pwa): add service worker with cache-first strategy"
```

---

### Task 4: Modify index.html

**Files:**
- Modify: `public/index.html`

**Interfaces:**
- Consumes: `/manifest.json`, `/sw.js`, theme color `#3b82f6`
- Produces: HTML với PWA meta tags và SW registration

- [ ] **Step 1: Thêm meta tags vào `<head>` (sau `<meta name="description">`)**

Thêm:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

- [ ] **Step 2: Thêm SW registration script trước `</body>`**

Thêm:
```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('SW registered:', reg.scope);
          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Có bản mới — có thể show notification
                console.log('New SW available');
              }
            });
          });
        })
        .catch(err => console.error('SW registration failed:', err));
    });
  }
</script>
```

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(pwa): add manifest link, meta tags, SW registration"
```

---

### Task 5: Modify app.jsx — Offline Queue

**Files:**
- Modify: `public/app.jsx`

**Interfaces:**
- Consumes: IndexedDB `pos-offline-db`, service worker message API
- Produces: `useOfflineQueue` hook, `useInstallPrompt` hook, `useOnlineStatus` hook, toast notifications

**Approach:** Thêm 3 React hooks vào cuối file, sau đó tích hợp vào các component chính.

- [ ] **Step 1: Thêm IndexedDB helper functions**

Thêm vào cuối file, sau các helper functions hiện có:

```js
// ============ Offline Queue (IndexedDB) ============
const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_orders';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status', { unique: false });
        store.createIndex('by-created', 'created_at', { unique: false });
      }
    };
  });
}

async function addToOfflineQueue(endpoint, method, body, headers = {}) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      endpoint,
      method: method || 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      created_at: Date.now(),
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      error_message: null,
    };
    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingOfflineOrders() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by-status');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateOfflineOrderStatus(id, status, errorMessage = null) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.status = status;
        record.error_message = errorMessage;
        if (status === 'syncing') record.retry_count = (record.retry_count || 0) + 1;
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function removeOfflineOrder(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function flushOfflineQueue(onProgress) {
  const orders = await getPendingOfflineOrders();
  let synced = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      await updateOfflineOrderStatus(order.id, 'syncing');
      const response = await fetch(order.endpoint, {
        method: order.method,
        headers: order.headers,
        body: JSON.stringify(order.body),
      });
      if (response.ok) {
        await updateOfflineOrderStatus(order.id, 'synced');
        // Xóa sau 5s
        setTimeout(() => removeOfflineOrder(order.id), 5000);
        synced++;
        if (onProgress) onProgress({ type: 'synced', order });
      } else {
        const isAuthError = response.status === 401 || response.status === 403;
        await updateOfflineOrderStatus(order.id, 'failed',
          isAuthError ? 'auth_expired' : `HTTP ${response.status}`);
        failed++;
        if (onProgress) onProgress({ type: 'failed', order });
      }
    } catch (err) {
      const needsRetry = (order.retry_count || 0) < (order.max_retries || 3);
      await updateOfflineOrderStatus(order.id, needsRetry ? 'pending' : 'failed', err.message);
      if (!needsRetry) {
        failed++;
        if (onProgress) onProgress({ type: 'failed', order });
      }
    }
  }
  return { synced, failed };
}
```

- [ ] **Step 2: Thêm React hooks**

```js
// ============ Hooks ============

// useOnlineStatus — theo dõi trạng thái online/offline
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// useOfflineQueue — quản lý offline order queue
function useOfflineQueue(isOnline) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Update pending count
  useEffect(() => {
    const updateCount = async () => {
      try {
        const orders = await getPendingOfflineOrders();
        setPendingCount(orders.length);
      } catch (e) {
        console.error('Failed to get pending orders:', e);
      }
    };
    updateCount();
    const interval = setInterval(updateCount, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      syncNow();
    }
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await flushOfflineQueue(({ type }) => {
        if (type === 'synced') setPendingCount(p => Math.max(0, p - 1));
      });
      setLastSyncResult(result);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
      // Update count
      const orders = await getPendingOfflineOrders();
      setPendingCount(orders.length);
    }
  }, [syncing]);

  const addToQueue = useCallback(async (endpoint, method, body, headers) => {
    const id = await addToOfflineQueue(endpoint, method, body, headers);
    setPendingCount(p => p + 1);
    return id;
  }, []);

  return {
    pendingCount,
    syncing,
    lastSyncResult,
    addToQueue,
    syncNow,
    isOnline,
  };
}

// useInstallPrompt — xử lý PWA install prompt
function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { deferredPrompt, installed, install };
}
```

- [ ] **Step 3: Tích hợp hooks vào App component**

Tìm component chính (CashierApp, PublicApp, KitchenApp) và thêm:

**Thêm vào đầu component (sau các useState):**
```jsx
const { pendingCount, syncing, addToQueue, syncNow, isOnline } = useOfflineQueue(isOnline);
```

**Thêm online indicator (banner hoặc badge):**
```jsx
{!isOnline && (
  <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50 flex items-center justify-center gap-2">
    <Icon name="wifi-off" className="w-4 h-4" />
    <span>Đang offline — Đơn sẽ đồng bộ khi có mạng</span>
  </div>
)}

{pendingCount > 0 && (
  <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-center text-sm z-50 flex items-center justify-center gap-2">
    <Icon name="refresh-cw" className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
    <span>
      {syncing ? 'Đang đồng bộ...' : `Đang chờ đồng bộ: ${pendingCount} đơn`}
    </span>
    {isOnline && !syncing && (
      <button onClick={syncNow} className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
        Đồng bộ ngay
      </button>
    )}
  </div>
)}
```

**Sửa API calls để dùng offline queue:**

Tìm các hàm gọi POST order (createOrder, createPublicOrder, createTakeawayOrder, createShipOrder) và wrap:

```jsx
async function createOrderWithOfflineSupport(orderData) {
  if (!navigator.onLine) {
    const fakeId = `offline-${Date.now()}`;
    await addToQueue('/api/orders', 'POST', orderData);
    return { success: true, order_id: fakeId, offline: true };
  }
  // Normal fetch
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  return res.json();
}
```

- [ ] **Step 4: Commit**

```bash
git add public/app.jsx
git commit -m "feat(pwa): add offline queue hook, install prompt, online status"
```

---

### Task 6: Final Integration & Testing

**Files:**
- Test: Manual browser testing

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: Working PWA với offline capability

- [ ] **Step 1: Verify tất cả files tạo đúng**

```bash
ls -la public/manifest.json public/sw.js public/icons/
```

Expected output:
```
manifest.json
sw.js
icons/icon-192.png
icons/icon-512.png
```

- [ ] **Step 2: Test Service Worker registration**

Mở browser DevTools → Application → Service Workers. Verify:
- SW status: "Activated and is running"
- Cache storage: `pos-v1` chứa tất cả precache URLs

- [ ] **Step 3: Test PWA Installability**

1. Mở app trên Chrome mobile hoặc desktop
2. Verify Chrome hiện install banner hoặc vào Menu → "Install POS"
3. Click install → app xuất hiện trên home screen/app list

- [ ] **Step 4: Test Offline Shell**

1. Bật DevTools → Network → "Offline"
2. Reload trang
3. Verify: App vẫn load, hiển thị giao diện

- [ ] **Step 5: Test Offline Order (nếu có thể)**

1. Tạo order khi offline
2. Verify: Toast "Đã lưu offline"
3. Bật lại mạng
4. Verify: Order tự sync, badge biến mất

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "feat(pwa): complete PWA implementation — offline shell + order queue

- Service worker với cache-first strategy
- PWA manifest cho installability  
- Offline order queue với IndexedDB
- Online/offline status indicator
- Auto-sync khi reconnect"
```

---

## Self-Review Checklist

- [ ] Spec coverage: Tất cả 6 requirements trong spec đều có task tương ứng
- [ ] No placeholders: Không có TBD, TODO, hay "implement later"
- [ ] Type consistency: Tên functions nhất quán xuyên suốt (addToQueue, flushOfflineQueue, etc.)
- [ ] File paths chính xác: `public/sw.js`, `public/manifest.json`, `public/icons/icon-*.png`
- [ ] Commit messages rõ ràng, mỗi task một commit

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-09-05-pwa-implementation.md`.**

**Two execution options:**

1. **Subagent-Driven (recommended)** - Tôi dispatch một subagent cho mỗi task, review giữa các task, lặp nhanh

2. **Inline Execution** - Tôi execute tasks trong session này, batch execution với checkpoints

**Which approach?**
