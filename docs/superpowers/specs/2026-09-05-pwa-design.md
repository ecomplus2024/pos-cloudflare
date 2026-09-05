# PWA cho POS - Design Spec

## Mục tiêu

Thêm tính năng Progressive Web App (PWA) cho toàn bộ hệ thống POS (thu ngân, bếp, tự gọi món, mang về, ship) với:

1. **Installability** — người dùng có thể cài app lên màn hình chính
2. **Offline Shell** — giao diện hoạt động khi mất mạng (cache-first)
3. **Offline Order** — tạo order khi offline, tự đồng bộ khi có mạng

## Phạm vi

Tất cả giao diện trong `public/index.html` (single-page app với routing client-side).

---

## Kiến trúc

### Cấu trúc file mới

```
public/
├── manifest.json          # PWA manifest
├── sw.js                  # Service Worker
├── icons/
│   ├── icon-192.png       # 192x192 app icon
│   └── icon-512.png       # 512x512 app icon
```

### Thay đổi file hiện có

- `public/index.html` — thêm manifest link, meta tags, SW register script
- `public/app.jsx` — thêm offline queue hook, install prompt, online/offline indicator

---

## 1. Service Worker (`public/sw.js`)

### Cache Strategy

| Resource | Strategy | Chi tiết |
|----------|----------|----------|
| Navigation (`/`) | Cache-first | Luôn trả `index.html` từ cache |
| Static files (`/app.jsx`, `/app.js`, `/styles.css`) | Cache-first | Precache khi install |
| CDN (unpkg.com) | Cache-first | Precache khi install |
| `/api/menu`, `/api/tables`, `/api/settings`, `/api/public/*` | Network-first + runtime cache | Cache response khi online, trả cache khi offline |
| `/api/*` (POST, PUT, DELETE) | Network-only | Gửi network, fail → lưu offline queue (không cache write operations) |
| `/api/changes` | Network-only | Poll endpoint, không cache |

### Precache List

```js
const CACHE_NAME = 'pos-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/app.jsx',
  '/app.js',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.24.0/babel.min.js',
  'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js',
];
```

### Lifecycle

```
Install:
  1. precache tất cả PRECACHE_URLS
  2. self.skipWaiting()

Activate:
  1. Xóa cache cũ (cache name !== CACHE_NAME)
  2. self.clients.claim()

Fetch:
  Nếu navigation request (/) → trả /index.html từ cache
  Nếu static/CDN → cache-first
  Nếu /api/* → network-first, fail → trả { error: 'offline' } JSON
```

### Versioning

Khi cập nhật code, bump `CACHE_NAME` version (ví dụ: `pos-v2`). Service worker mới sẽ install và xóa cache cũ.

---

## 2. Manifest (`public/manifest.json`)

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

---

## 3. HTML Changes (`public/index.html`)

Thêm vào `<head>`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

Thêm trước `</body>`:

```html
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.error('SW registration failed:', err));
    });
  }
</script>
```

---

## 4. Offline Order Queue (IndexedDB)

### Database Schema

```
Database: pos-offline-db (version 1)

Store: offline_orders
├── keyPath: id (auto-increment)
├── indexes:
│   ├── by-status (status)
│   └── by-created (created_at)
│
├── Fields:
│   ├── id: auto-increment
│   ├── endpoint: string (e.g., '/api/orders')
│   ├── method: 'POST'
│   ├── headers: object (Content-Type, Authorization)
│   ├── body: object (request body)
│   ├── created_at: number (Date.now())
│   ├── status: 'pending' | 'syncing' | 'synced' | 'failed'
│   ├── retry_count: number (default: 0)
│   ├── max_retries: number (default: 3)
│   └── error_message: string | null
```

### Flow

```
1. User tạo order
   ├─ Online: POST /api/orders → success
   └─ Offline:
      a. Lưu { endpoint, body, headers } vào IndexedDB
      b. Tạo fake order response (optimistic UI)
      c. Hiển toast "Đã lưu offline, sẽ đồng bộ khi có mạng"
      d. Trả về fake_order_id

2. Khi online trở lại (SW 'online' event hoặc app detect):
   a. Đọc queue từ IndexedDB (status = 'pending')
   b. Với mỗi item theo thứ tự FIFO:
      - Set status = 'syncing'
      - POST lên server
      - Success → status = 'synced', xóa sau 5s
      - Fail → status = 'failed' nếu retry_count >= max_retries
      - Fail → retry_count++, giữ 'pending' nếu còn lượt retry
   c. Thông báo UI khi sync hoàn tất

3. UI hiển thị:
   - Badge "Đang chờ đồng bộ: N đơn" khi có pending items
   - Toast khi sync thành công/thất bại
```

### Helper Functions (trong app.jsx)

```js
// IndexedDB helpers
async function openDB()
async function addToQueue(endpoint, body, headers)
async function getPendingOrders()
async function updateOrderStatus(id, status, error?)
async function removeSyncedOrders()
async function flushQueue()
```

---

## 5. UI Changes (`public/app.jsx`)

### Online/Offline Indicator

- Thêm state `isOnline` (từ `navigator.onLine` + event listeners)
- Khi offline: hiển banner vàng "Đang offline" ở đầu app
- Khi có pending sync: badge "Đang đồng bộ: N đơn"

### Install Prompt

- Listen `beforeinstallprompt` event
- Hiển nút "Cài đặt app" trong header/sidebar
- Sau khi installed: ẩn nút, hiển toast "Đã cài đặt!"

### API Call Wrapper

```js
async function apiCall(endpoint, options = {}) {
  if (!navigator.onLine && options.method === 'POST') {
    // Lưu vào offline queue
    const id = await addToQueue(endpoint, options.body, options.headers);
    return { offline: true, queue_id: id };
  }
  // Normal fetch
  const res = await fetch(endpoint, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---

## 6. Icons

Tạo icon đơn giản (chữ "POS" trên nền gradient xanh) dưới dạng SVG, convert sang PNG:

- `icon-192.png` — 192x192px
- `icon-512.png` — 512x512px

Sử dụng canvas trong script hoặc tạo sẵn file PNG.

---

## 7. Security Considerations

- Service worker chỉ cache GET requests, không cache POST response body
- IndexedDB offline queue không lưu password hay token nhạy cảm
- Authorization header được lưu trong queue (cần token hợp lệ khi sync)
- Nếu token hết hạn khi sync → đánh dấu 'failed', user cần login lại

---

## 8. Testing Plan

1. **Install test**: Mở app trên mobile → Chrome hiện banner "Add to Home Screen"
2. **Offline shell test**: Tắt mạng → app vẫn load giao diện
3. **Offline order test**: Tắt mạng → tạo order → bật mạng → order tự sync
4. **Cache update test**: Deploy version mới → SW cũ được thay thế
5. **Multiple device test**: Cài trên nhiều device, sync không bị duplicate

---

## 9. File Changes Summary

| File | Action | Mô tả |
|------|--------|-------|
| `public/sw.js` | Tạo mới | Service worker logic |
| `public/manifest.json` | Tạo mới | PWA manifest |
| `public/icons/icon-192.png` | Tạo mới | App icon 192px |
| `public/icons/icon-512.png` | Tạo mới | App icon 512px |
| `public/index.html` | Sửa | Thêm manifest link, meta tags, SW register |
| `public/app.jsx` | Sửa | Thêm offline queue, install prompt, online indicator |
