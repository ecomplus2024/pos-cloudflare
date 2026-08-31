# POS Demo - Cloudflare Workers + D1

Demo POS chạy hoàn toàn trên Cloudflare: **Worker (API) + Assets (React frontend) + D1 (database)**, một lần deploy duy nhất.

## Cấu trúc

```
cf-pos-demo/
├── wrangler.toml          # Cấu hình Worker + Assets + D1 binding
├── package.json
├── tsconfig.json
├── schema.sql             # Schema + dữ liệu mẫu cho D1
├── src/
│   └── worker.ts          # API: /api/health, /api/menu, /api/products
└── public/                # Static React frontend (served bởi Worker)
    ├── index.html
    └── app.jsx            # React + Tailwind (qua CDN cho demo)
```

## Yêu cầu

- Node.js 18+
- Tài khoản Cloudflare (miễn phí)

## Deploy từng bước

```bash
# 1. Cài dependencies
cd cf-pos-demo
npm install

# 2. Login Cloudflare (mở browser, đăng nhập, cấp quyền - KHÔNG cần API key)
npx wrangler login

# 3. Tạo D1 database
npm run db:create
# → Copy database_id từ output (vd: "abcd-1234-...")

# 4. Sửa wrangler.toml: thay REPLACE_AFTER_WRANGLER_D1_CREATE
#    bằng database_id vừa copy

# 5. Khởi tạo schema + dữ liệu mẫu trên D1
npm run db:init

# 6. Deploy
npm run deploy
```

Sau khi deploy xong, wrangler sẽ in ra URL:
```
Published pos-demo (1.23 sec)
  https://pos-demo.<your-subdomain>.workers.dev
```

## Test các endpoint

```bash
# Health check
curl https://pos-demo.<your-subdomain>.workers.dev/api/health

# Lấy menu (categories + products)
curl https://pos-demo.<your-subdomain>.workers.dev/api/menu

# Lọc sản phẩm theo danh mục
curl https://pos-demo.<your-subdomain>.workers.dev/api/products?category_id=1
```

## Test local (không cần deploy)

```bash
npx wrangler dev
# Mở http://localhost:8787
```

Database local dùng `--local` flag:
```bash
npx wrangler d1 execute pos-demo-db --file=./schema.sql --local
```

## Cách hoạt động

```
Browser                Cloudflare Edge
   │                         │
   │  1. GET /              │
   │────────────────────►  Worker (worker.ts)
   │                         │
   │                         ├─ URL là /api/* ?
   │                         │   → Query D1, trả JSON
   │                         │
   │                         └─ URL khác ?
   │                             → env.ASSETS.fetch()
   │                               → Trả file từ public/
   │
   │  2. HTML + JS + CSS     │
   │◄────────────────────
   │
   │  3. React gọi /api/menu │
   │────────────────────►  Worker query D1
   │◄────────────────────  Trả JSON
   │
   │  4. Render menu         │
```

## Multi-store (nếu muốn mở rộng)

Thêm cột `store_id` đã có sẵn trong schema. Mọi query thêm `WHERE store_id = ?`:
```typescript
const storeId = Number(new URL(request.url).searchParams.get("store") || 1);
const { results } = await env.DB
  .prepare("SELECT * FROM products WHERE store_id = ?")
  .bind(storeId)
  .all();
```

## Production notes

- **Tailwind qua CDN** chỉ để demo. Production nên build Tailwind CLI trước:
  ```bash
  npm install -D tailwindcss
  npx tailwindcss -i ./src/input.css -o ./public/styles.css --minify
  ```
- **React qua CDN** cũng chỉ cho demo. Production nên build với Vite → static bundle.
- **SSE/real-time**: Workers không giữ connection → dùng Durable Objects.
- **Auth**: thêm middleware kiểm tra JWT trong worker.ts trước khi gọi DB.
