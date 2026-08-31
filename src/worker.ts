/**
 * POS Demo - Cloudflare Worker
 *
 * Cashier endpoints:
 *   POST /api/auth/login        - Đăng nhập (username, password) → token
 *   GET  /api/auth/verify       - Xác thực token
 *   POST /api/auth/logout       - Hủy session
 *   GET  /api/health            - Health check
 *   GET  /api/menu              - Categories + products
 *   GET  /api/tables            - Danh sách bàn
 *   GET  /api/orders            - Orders gần đây
 *   POST /api/orders            - Tạo order
 *   POST /api/tables/:id/pay    - Thanh toán bàn
 *
 * Public menu endpoints (khách quét QR tại bàn):
 *   GET  /api/public/menu/:tableId                   - Store + table + categories + products (sizes, toppings)
 *   GET  /api/public/table-state/:tableId            - Polling: has_pending_order + customer_session_id
 *   GET  /api/public/items/:tableId                  - Submitted items (polled in My Order view)
 *   POST /api/public/orders                          - Tạo order (idempotent + session gated)
 *   DELETE /api/public/orders/:orderId/items/:itemId - Xóa item (status=pending only)
 *   PUT  /api/public/orders/:orderId/items/:itemId   - Cập nhật quantity
 *   POST /api/public/call-staff                      - Khách gọi nhân viên
 *   GET  /api/settings                               - featured_products, facebook_url
 *
 * Mọi request khác → serve từ Assets (Cloudflare Workers Assets)
 */

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  STORE_NAME: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  price: number;
  image_url: string | null;
  available: number;
}

interface Category {
  id: number;
  name: string;
  sort_order: number;
}

interface Table {
  id: number;
  name: string;
  status: string;
  current_order_id: number | null;
}

interface User {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  full_name: string | null;
  role: string;
}

interface OrderItemInput {
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  note?: string;
}

interface CreateOrderInput {
  table_id?: number;
  order_type?: string;
  payment_method?: string;
  customer_name?: string;
  items: OrderItemInput[];
}

// ============ HELPERS ============

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

// ============ CACHE ============

const inflight = new Map<string, Promise<unknown>>();

async function coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const p = fetcher().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function withCache(
  request: Request,
  ttlSeconds: number,
  swrSeconds: number,
  fetcher: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) {
    const storedAt = parseInt(cached.headers.get("x-cached-at") || "0", 10);
    const ageMs = Date.now() - storedAt;
    const ttlMs = ttlSeconds * 1000;
    const swrMs = swrSeconds * 1000;
    if (ageMs < ttlMs) {
      const h = new Headers(cached.headers);
      h.set("x-cache", "HIT");
      return new Response(cached.body, { status: cached.status, headers: h });
    }
    if (swrSeconds > 0 && ageMs < ttlMs + swrMs) {
      const ctx = (request as Request & { ctx?: ExecutionContext }).ctx;
      if (ctx) {
        ctx.waitUntil(fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))));
      } else {
        fetcher().then((r) => cache.put(request, stampCache(r, ttlSeconds))).catch(() => {});
      }
      const h = new Headers(cached.headers);
      h.set("x-cache", "STALE");
      return new Response(cached.body, { status: cached.status, headers: h });
    }
    await cache.delete(request);
  }
  const fresh = await fetcher();
  if (fresh.status >= 200 && fresh.status < 300) {
    await cache.put(request, stampCache(fresh.clone(), ttlSeconds));
  }
  const h = new Headers(fresh.headers);
  h.set("x-cache", "MISS");
  return new Response(fresh.body, { status: fresh.status, headers: h });
}

function stampCache(resp: Response, ttl: number): Response {
  const h = new Headers(resp.headers);
  h.set("Cache-Control", `public, max-age=${ttl}, s-maxage=${ttl}`);
  h.set("x-cached-at", String(Date.now()));
  return new Response(resp.body, { status: resp.status, headers: h });
}

// ============ AUTH ============

async function handleLogin(env: Env, body: { username?: string; password?: string }): Promise<Response> {
  if (!body.username || !body.password) {
    return json({ message: "Thiếu tên đăng nhập hoặc mật khẩu" }, 400);
  }
  const userResult = await env.DB.prepare(
    "SELECT id, username, password_hash, salt, full_name, role FROM users WHERE username = ?"
  ).bind(body.username).first<User>();
  if (!userResult) return json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, 401);
  const hashed = await sha256Hex(userResult.salt + body.password);
  if (hashed !== userResult.password_hash) return json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, 401);
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
  ).bind(token, userResult.id, expiresAt).run();
  return json({
    access_token: token,
    user: {
      id: userResult.id,
      username: userResult.username,
      full_name: userResult.full_name,
      role: userResult.role,
    },
  });
}

async function handleVerify(env: Env, token: string): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`
  ).bind(token).first<{ id: number; username: string; full_name: string | null; role: string; expires_at: string }>();
  if (!result) return json({ valid: false, message: "Token không hợp lệ" }, 401);
  if (new Date(result.expires_at) < new Date()) return json({ valid: false, message: "Token đã hết hạn" }, 401);
  return json({
    valid: true,
    user: { id: result.id, username: result.username, full_name: result.full_name, role: result.role },
  });
}

async function handleLogout(env: Env, token: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ success: true });
}

// ============ MENU / TABLES / ORDERS (cashier) ============

async function handleMenu(env: Env): Promise<Response> {
  const [categoriesResult, productsResult] = await Promise.all([
    env.DB.prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order, name").all<Category>(),
    env.DB.prepare(
      `SELECT id, category_id, name, price, image_url, available FROM products
       WHERE available = 1 ORDER BY name`
    ).all<Product>(),
  ]);
  return json({ store_name: env.STORE_NAME, categories: categoriesResult.results, products: productsResult.results });
}

async function handleTables(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, name, status, current_order_id FROM tables ORDER BY id`
  ).all<Table>();
  const ordersResult = await env.DB.prepare(
    `SELECT id, table_id, total, created_at FROM orders
     WHERE status = 'pending' AND table_id IS NOT NULL`
  ).all<{ id: number; table_id: number; total: number; created_at: string }>();
  const ordersByTable = new Map<number, { id: number; total: number; created_at: string }>();
  for (const o of ordersResult.results) ordersByTable.set(o.table_id, o);
  return json({
    tables: result.results.map((t) => ({ ...t, pending_order: ordersByTable.get(t.id) || null })),
  });
}

async function handleGetOrders(env: Env): Promise<Response> {
  const orders = await env.DB.prepare(
    `SELECT o.id, o.table_id, o.order_type, o.total, o.status,
            o.payment_method, o.customer_name, o.created_at, t.name as table_name
     FROM orders o LEFT JOIN tables t ON t.id = o.table_id
     ORDER BY o.created_at DESC LIMIT 50`
  ).all();
  return json({ orders: orders.results });
}

async function handleCreateOrder(env: Env, body: CreateOrderInput): Promise<Response> {
  if (!body.items || body.items.length === 0) return json({ error: "Cart rỗng" }, 400);
  const total = body.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const orderResult = await env.DB.prepare(
    `INSERT INTO orders (table_id, order_type, total, status, payment_method, customer_name)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    body.table_id ?? null,
    body.order_type ?? "dine_in",
    total,
    "pending",
    body.payment_method ?? null,
    body.customer_name ?? null
  ).first<{ id: number }>();
  if (!orderResult) return json({ error: "Không tạo được đơn" }, 500);
  const orderId = orderResult.id;
  const stmt = env.DB.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  await env.DB.batch(body.items.map((it) =>
    stmt.bind(orderId, it.product_id, it.product_name, it.price, it.quantity, it.note ?? null)
  ));
  if (body.table_id) {
    await env.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id).run();
  }
  return json({ success: true, order_id: orderId, total, items_count: body.items.length });
}

async function handlePayTable(env: Env, tableId: number, paymentMethod: string): Promise<Response> {
  const order = await env.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first<{ id: number }>();
  if (!order) return json({ error: "Không có order pending cho bàn này" }, 404);
  await env.DB.prepare(`UPDATE orders SET status = 'paid', payment_method = ? WHERE id = ?`)
    .bind(paymentMethod, order.id).run();
  await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`)
    .bind(tableId).run();
  return json({ success: true, order_id: order.id });
}

// ============ PUBLIC MENU ENDPOINTS ============

interface PublicProduct {
  id: number; name: string; price: number; image_url: string | null;
  category_id: number; is_topping: number; production_unit: string;
}

interface PublicCategory {
  id: number; name: string; sort_order: number;
  production_unit: string; allow_all_toppings: number;
  allowed_toppings: number[];
}

async function handlePublicMenu(env: Env, tableId: number): Promise<Response> {
  const tableRow = await env.DB.prepare("SELECT id, name FROM tables WHERE id = ?").bind(tableId).first<{ id: number; name: string }>();
  if (!tableRow) return json({ message: "Bàn không tồn tại" }, 404);

  const categoriesResult = await env.DB.prepare(
    `SELECT id, name, sort_order, production_unit, allow_all_toppings
     FROM categories ORDER BY
     CASE production_unit WHEN 'counter' THEN 0 WHEN 'kitchen' THEN 1 ELSE 2 END,
     sort_order, id`
  ).all<PublicCategory>();

  const productsResult = await env.DB.prepare(
    `SELECT id, category_id, name, price, image_url, available, is_topping, production_unit
     FROM products WHERE available = 1`
  ).all<PublicProduct>();

  // Load sizes cho products
  const productIds = productsResult.results.map((p) => p.id);
  let sizesByProduct = new Map<number, { id: number; name: string; price: number }[]>();
  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const sizesResult = await env.DB.prepare(
      `SELECT id, product_id, name, price FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY sort_order, id`
    ).bind(...productIds).all<{ id: number; product_id: number; name: string; price: number }>();
    for (const s of sizesResult.results) {
      if (!sizesByProduct.has(s.product_id)) sizesByProduct.set(s.product_id, []);
      sizesByProduct.get(s.product_id)!.push({ id: s.id, name: s.name, price: s.price });
    }
  }

  // Load category_toppings cho mỗi category
  const catIds = categoriesResult.results.map((c) => c.id);
  let toppingsByCategory = new Map<number, number[]>();
  if (catIds.length > 0) {
    const placeholders = catIds.map(() => "?").join(",");
    const ctResult = await env.DB.prepare(
      `SELECT category_id, product_id FROM category_toppings WHERE category_id IN (${placeholders})`
    ).bind(...catIds).all<{ category_id: number; product_id: number }>();
    for (const r of ctResult.results) {
      if (!toppingsByCategory.has(r.category_id)) toppingsByCategory.set(r.category_id, []);
      toppingsByCategory.get(r.category_id)!.push(r.product_id);
    }
  }

  const categories = categoriesResult.results.map((c) => ({
    ...c,
    allowed_toppings: toppingsByCategory.get(c.id) || [],
  }));

  const products = productsResult.results.map((p) => ({
    ...p,
    sizes: sizesByProduct.get(p.id) || [],
  }));

  return json({
    store: { name: env.STORE_NAME },
    table: tableRow,
    categories,
    products,
  });
}

async function handlePublicTableState(env: Env, tableId: number): Promise<Response> {
  const pending = await env.DB.prepare(
    `SELECT customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first<{ customer_session_id: string | null }>();
  const hasPending = !!pending;
  return json({
    table_id: tableId,
    status: hasPending ? "occupied" : "available",
    has_pending_order: hasPending,
    customer_session_id: pending?.customer_session_id ?? null,
  });
}

async function handlePublicItems(env: Env, tableId: number): Promise<Response> {
  // Lấy tất cả order_items của table từ pending/processing orders
  const result = await env.DB.prepare(
    `SELECT oi.id, oi.order_id, oi.product_id, oi.product_name, oi.price, oi.quantity,
            oi.note, oi.status, oi.size_name
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.table_id = ? AND o.status IN ('pending', 'processing') AND oi.status IN ('pending', 'processing', 'completed')
     ORDER BY oi.id DESC`
  ).bind(tableId).all<{
    id: number; order_id: number; product_id: number; product_name: string;
    price: number; quantity: number; note: string | null; status: string;
    size_name: string | null;
  }>();

  // Load toppings cho mỗi item
  const itemIds = result.results.map((r) => r.id);
  let toppingsByItem = new Map<number, string[]>();
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const tResult = await env.DB.prepare(
      `SELECT oit.order_item_id, p.name FROM order_item_toppings oit
       JOIN products p ON p.id = oit.product_id
       WHERE oit.order_item_id IN (${placeholders})`
    ).bind(...itemIds).all<{ order_item_id: number; name: string }>();
    for (const t of tResult.results) {
      if (!toppingsByItem.has(t.order_item_id)) toppingsByItem.set(t.order_item_id, []);
      toppingsByItem.get(t.order_item_id)!.push(t.name);
    }
  }

  return json(result.results.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    product_id: it.product_id,
    name: it.product_name,
    quantity: it.quantity,
    price: it.price,
    status: it.status,
    size_name: it.size_name,
    notes: it.note,
    toppings: toppingsByItem.get(it.id) || [],
    created_at: it.created_at,
  })));
}

interface PublicOrderItemInput {
  product_id: number;
  quantity?: number;
  size_id?: number | null;
  toppings?: number[];
  notes?: string;
}

interface CreatePublicOrderInput {
  table_id: number;
  table_position?: string;
  items: PublicOrderItemInput[];
  request_token?: string;
  retry_after_failure?: boolean;
  customer_session_id?: string;
}

async function handleCreatePublicOrder(env: Env, body: CreatePublicOrderInput): Promise<Response> {
  if (!body.table_id || !body.items?.length) {
    return json({ message: "Thiếu thông tin bàn hoặc món ăn" }, 400);
  }

  // 1. Idempotency
  if (body.request_token) {
    const replayed = await env.DB.prepare(
      `SELECT id, total, customer_session_id FROM orders
       WHERE request_token = ? AND table_id = ? AND status IN ('pending', 'processing')
       LIMIT 1`
    ).bind(body.request_token, body.table_id).first<{ id: number; total: number; customer_session_id: string | null }>();
    if (replayed) {
      return json({
        message: "Đặt món thành công",
        order_id: replayed.id,
        total_amount: replayed.total,
        customer_session_id: replayed.customer_session_id,
        replayed: true,
      }, 200);
    }
  }

  // 2. Session gating
  const pending = await env.DB.prepare(
    `SELECT id, customer_session_id FROM orders
     WHERE table_id = ? AND status IN ('pending', 'processing')
     ORDER BY created_at DESC LIMIT 1`
  ).bind(body.table_id).first<{ id: number; customer_session_id: string | null }>();

  let sessionId: string;
  if (pending) {
    if (!body.customer_session_id) {
      return json({ error: "table_occupied_need_choice", message: "Bàn này đã có đơn chưa thanh toán. Vui lòng chọn tiếp tục hoặc gọi nhân viên." }, 409);
    }
    if (body.customer_session_id !== pending.customer_session_id) {
      return json({ error: "invalid_session", message: "Phiên đặt món đã hết hạn hoặc không hợp lệ." }, 403);
    }
    sessionId = pending.customer_session_id;
  } else {
    sessionId = crypto.randomUUID();
  }

  // 3. Tạo hoặc dùng existing order
  let orderId: number;
  let isNewOrder = false;
  if (pending) {
    orderId = pending.id;
  } else {
    const insertResult = await env.DB.prepare(
      `INSERT INTO orders (table_id, order_type, total, status, customer_session_id, request_token, table_position)
       VALUES (?, 'dine_in', 0, 'pending', ?, ?, ?) RETURNING id`
    ).bind(body.table_id, sessionId, body.request_token ?? null, body.table_position ?? "A").first<{ id: number }>();
    if (!insertResult) return json({ error: "Không tạo được đơn" }, 500);
    orderId = insertResult.id;
    isNewOrder = true;
  }

  // 4. Insert items + toppings
  const mergeDuplicates = !!body.retry_after_failure && !isNewOrder;
  let computedTotal = 0;

  for (const it of body.items) {
    const product = await env.DB.prepare(
      `SELECT id, price, name, available FROM products WHERE id = ?`
    ).bind(it.product_id).first<{ id: number; price: number; name: string; available: number }>();
    if (!product || !product.available) continue;

    let itemPrice = product.price;
    let sizeName: string | null = null;
    if (it.size_id) {
      const size = await env.DB.prepare(
        `SELECT name, price FROM product_sizes WHERE id = ? AND product_id = ?`
      ).bind(it.size_id, product.id).first<{ name: string; price: number }>();
      if (size) {
        itemPrice = size.price;
        sizeName = size.name;
      }
    }
    const qty = it.quantity ?? 1;
    const notes = it.notes ?? "";
    const toppingIds: number[] = it.toppings ?? [];

    if (mergeDuplicates) {
      // Tìm matching item trong order
      const existingItems = await env.DB.prepare(
        `SELECT id, price, size_name, note FROM order_items
         WHERE order_id = ? AND product_id = ? AND status = 'pending'`
      ).bind(orderId, product.id).all<{ id: number; price: number; size_name: string | null; note: string | null }>();

      for (const ex of existingItems.results) {
        if ((ex.size_name ?? null) !== sizeName) continue;
        if ((ex.note ?? "") !== notes) continue;
        // Check toppings match
        const exToppings = await env.DB.prepare(
          `SELECT product_id FROM order_item_toppings WHERE order_item_id = ?`
        ).bind(ex.id).all<{ product_id: number }>();
        const exIds = exToppings.results.map((t) => t.product_id).sort((a, b) => a - b);
        const newIds = [...toppingIds].sort((a, b) => a - b);
        if (JSON.stringify(exIds) !== JSON.stringify(newIds)) continue;
        // Match → increment qty
        await env.DB.prepare(`UPDATE order_items SET quantity = quantity + ? WHERE id = ?`).bind(qty, ex.id).run();
        const toppingSum = await sumToppingPrices(env, toppingIds);
        computedTotal += (itemPrice + toppingSum) * qty;
        // Skip to next item
        product.id = -1; // mark as processed
        break;
      }
      if (product.id === -1) continue;
    }

    const inserted = await env.DB.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, status, size_name, note)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?) RETURNING id`
    ).bind(orderId, product.id, product.name, itemPrice, qty, sizeName, notes || null).first<{ id: number }>();
    if (!inserted) continue;

    let toppingSum = 0;
    for (const tid of toppingIds) {
      const tp = await env.DB.prepare(
        `SELECT price FROM products WHERE id = ? AND is_topping = 1 AND available = 1`
      ).bind(tid).first<{ price: number }>();
      if (tp) {
        await env.DB.prepare(
          `INSERT INTO order_item_toppings (order_item_id, product_id, price) VALUES (?, ?, ?)`
        ).bind(inserted.id, tid, tp.price).run();
        toppingSum += tp.price;
      }
    }
    computedTotal += (itemPrice + toppingSum) * qty;
  }

  // 5. Recalc total + update table status
  await recalcOrderTotal(env, orderId);
  const finalTotal = (await env.DB.prepare("SELECT total FROM orders WHERE id = ?").bind(orderId).first<{ total: number }>())?.total ?? 0;

  if (isNewOrder) {
    await env.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id).run();
  }

  // Cache bust
  await caches.default.delete(new Request("https://cache/api/tables", { method: "GET" }));

  return json({
    message: "Đặt món thành công",
    order_id: orderId,
    total_amount: finalTotal,
    customer_session_id: sessionId,
    added_items_count: body.items.length,
  }, 201);
}

async function sumToppingPrices(env: Env, toppingIds: number[]): Promise<number> {
  if (toppingIds.length === 0) return 0;
  const placeholders = toppingIds.map(() => "?").join(",");
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(price), 0) AS total FROM products
     WHERE id IN (${placeholders}) AND is_topping = 1 AND available = 1`
  ).bind(...toppingIds).first<{ total: number }>();
  return r?.total ?? 0;
}

async function recalcOrderTotal(env: Env, orderId: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE orders SET total = (
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) +
             COALESCE((SELECT SUM(oit.price * oi.quantity)
                       FROM order_item_toppings oit
                       JOIN order_items oi ON oi.id = oit.order_item_id
                       WHERE oi.order_id = ?), 0)
      FROM order_items oi WHERE oi.order_id = ?
    ) WHERE id = ?`
  ).bind(orderId, orderId, orderId).run();
}

async function handleDeletePublicItem(env: Env, orderId: number, itemId: number): Promise<Response> {
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first<{ id: number; status: string }>();
  if (!item) return json({ message: "Không tìm thấy món" }, 404);
  if (item.status === "completed") return json({ message: "Món đã hoàn thành, không thể xóa" }, 400);

  await env.DB.prepare(`DELETE FROM order_items WHERE id = ?`).bind(itemId).run();

  // Check nếu order rỗng → xóa order + release bàn
  const remaining = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ?`
  ).bind(orderId).first<{ cnt: number }>();
  if ((remaining?.cnt ?? 0) === 0) {
    const order = await env.DB.prepare(`SELECT table_id FROM orders WHERE id = ?`).bind(orderId).first<{ table_id: number | null }>();
    await env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(orderId).run();
    if (order?.table_id) {
      await env.DB.prepare(`UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`).bind(order.table_id).run();
    }
  } else {
    await recalcOrderTotal(env, orderId);
  }

  return json({ success: true });
}

async function handleUpdatePublicItemQuantity(env: Env, orderId: number, itemId: number, body: { quantity?: number }): Promise<Response> {
  const item = await env.DB.prepare(
    `SELECT id, status FROM order_items WHERE id = ? AND order_id = ?`
  ).bind(itemId, orderId).first<{ id: number; status: string }>();
  if (!item) return json({ message: "Không tìm thấy món" }, 404);
  if (item.status === "completed") return json({ message: "Món đã hoàn thành" }, 400);

  const qty = body.quantity ?? 0;
  if (qty <= 0) {
    return await handleDeletePublicItem(env, orderId, itemId);
  }
  await env.DB.prepare(`UPDATE order_items SET quantity = ? WHERE id = ?`).bind(qty, itemId).run();
  await recalcOrderTotal(env, orderId);
  return json({ success: true });
}

async function handlePublicCallStaff(env: Env, body: { table_id?: number; reason?: string }): Promise<Response> {
  if (!body.table_id) return json({ error: "missing_table_id" }, 400);
  const table = await env.DB.prepare("SELECT id FROM tables WHERE id = ?").bind(body.table_id).first<{ id: number }>();
  if (!table) return json({ error: "Table not found" }, 404);
  await env.DB.prepare(
    `INSERT INTO staff_calls (table_id, reason) VALUES (?, ?)`
  ).bind(body.table_id, body.reason ?? "new_customer").run();
  return json({ ok: true });
}

async function handleGetSettings(env: Env): Promise<Response> {
  const r = await env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const settings: Record<string, unknown> = {};
  for (const row of r.results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return json(settings);
}

// ============ ROUTER ============

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ----- AUTH -----
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = (await request.json()) as { username?: string; password?: string };
        return await handleLogin(env, body);
      } catch { return json({ message: "Body không kh hợp lệ" }, 400); }
    }
    if (url.pathname === "/api/auth/verify" && request.method === "GET") {
      const token = extractToken(request);
      if (!token) return json({ valid: false, message: "Thiếu token" }, 401);
      try { return await handleVerify(env, token); }
      catch (err) { return json({ valid: false, message: String(err) }, 500); }
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = extractToken(request);
      if (!token) return json({ success: false }, 400);
      try { return await handleLogout(env, token); }
      catch (err) { return json({ error: String(err) }, 500); }
    }

    // ----- CASHIER MENU/TABLES/ORDERS -----
    if (url.pathname === "/api/health") {
      return json({ ok: true, store: env.STORE_NAME, time: new Date().toISOString() });
    }
    if (url.pathname === "/api/menu") {
      try { return await handleMenu(env); } catch (err) { return json({ error: String(err) }, 500); }
    }
    if (url.pathname === "/api/tables") {
      try { return await handleTables(env); } catch (err) { return json({ error: String(err) }, 500); }
    }
    const payMatch = url.pathname.match(/^\/api\/tables\/(\d+)\/pay$/);
    if (payMatch && request.method === "POST") {
      try {
        const tableId = parseInt(payMatch[1], 10);
        const body = (await request.json()) as { payment_method?: string };
        return await handlePayTable(env, tableId, body.payment_method ?? "cash");
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        try { return await handleGetOrders(env); } catch (err) { return json({ error: String(err) }, 500); }
      }
      if (request.method === "POST") {
        try {
          const body = (await request.json()) as CreateOrderInput;
          return await handleCreateOrder(env, body);
        } catch (err) { return json({ error: String(err) }, 400); }
      }
    }

    // ----- PUBLIC MENU -----
    const publicMenuMatch = url.pathname.match(/^\/api\/public\/menu\/(\d+)$/);
    if (publicMenuMatch && request.method === "GET") {
      try {
        return await withCache(request, 60, 30, () =>
          handlePublicMenu(env, parseInt(publicMenuMatch[1], 10))
        );
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    const tableStateMatch = url.pathname.match(/^\/api\/public\/table-state\/(\d+)$/);
    if (tableStateMatch && request.method === "GET") {
      try {
        return await withCache(request, 5, 5, () =>
          handlePublicTableState(env, parseInt(tableStateMatch[1], 10))
        );
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    const itemsMatch = url.pathname.match(/^\/api\/public\/items\/(\d+)$/);
    if (itemsMatch && request.method === "GET") {
      try {
        return await handlePublicItems(env, parseInt(itemsMatch[1], 10));
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    if (url.pathname === "/api/public/orders" && request.method === "POST") {
      try {
        const body = (await request.json()) as CreatePublicOrderInput;
        return await handleCreatePublicOrder(env, body);
      } catch (err) { return json({ error: String(err) }, 400); }
    }
    const itemMatch = url.pathname.match(/^\/api\/public\/orders\/(\d+)\/items\/(\d+)$/);
    if (itemMatch && request.method === "DELETE") {
      try {
        return await handleDeletePublicItem(env, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10));
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    if (itemMatch && request.method === "PUT") {
      try {
        const body = (await request.json()) as { quantity?: number };
        return await handleUpdatePublicItemQuantity(env, parseInt(itemMatch[1], 10), parseInt(itemMatch[2], 10), body);
      } catch (err) { return json({ error: String(err) }, 500); }
    }
    if (url.pathname === "/api/public/call-staff" && request.method === "POST") {
      try {
        const body = (await request.json()) as { table_id?: number; reason?: string };
        return await handlePublicCallStaff(env, body);
      } catch (err) { return json({ error: String(err) }, 400); }
    }
    if (url.pathname === "/api/settings" && request.method === "GET") {
      try { return await handleGetSettings(env); } catch (err) { return json({ error: String(err) }, 500); }
    }

    // Static asset với SPA fallback cho /menu/:tableId
    const assetResp = await env.ASSETS.fetch(request);
    if (assetResp.status === 404 && !url.pathname.startsWith("/api/")) {
      // Serve index.html cho SPA routing
      const indexResp = await env.ASSETS.fetch(new Request(new URL("/index.html", url)));
      if (indexResp.ok) return indexResp;
    }
    return assetResp;
  },
};