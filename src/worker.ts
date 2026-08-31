/**
 * POS Demo - Cloudflare Worker
 *
 * Endpoints:
 *   POST /api/auth/login        - Đăng nhập (username, password) → token
 *   GET  /api/auth/verify       - Xác thực token từ Authorization header
 *   POST /api/auth/logout       - Hủy session
 *   GET  /api/health            - Health check
 *   GET  /api/menu              - Categories + products
 *   GET  /api/tables            - Danh sách bàn + trạng thái
 *   GET  /api/orders            - Danh sách orders gần đây
 *   POST /api/orders            - Tạo order mới từ cart
 *   POST /api/tables/:id/pay    - Đánh dấu bàn đã thanh toán
 *
 * Mọi request khác → serve từ Assets (React frontend trong public/)
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// SHA-256 hash với salt, trả về hex string
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Random session token (32 bytes hex)
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Trích token từ Authorization header (Bearer
function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

// ===================== AUTH =====================

async function handleLogin(env: Env, body: { username?: string; password?: string }): Promise<Response> {
  if (!body.username || !body.password) {
    return json({ message: "Thiếu tên đăng nhập hoặc mật khẩu" }, 400);
  }

  const userResult = await env.DB.prepare(
    "SELECT id, username, password_hash, salt, full_name, role FROM users WHERE username = ?"
  ).bind(body.username).first<User>();

  if (!userResult) {
    return json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, 401);
  }

  const hashed = await sha256Hex(userResult.salt + body.password);
  if (hashed !== userResult.password_hash) {
    return json({ message: "Sai tên đăng nhập hoặc mật khẩu" }, 401);
  }

  // Tạo session token, hết hạn sau 7 ngày
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
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`
  ).bind(token).first<{ id: number; username: string; full_name: string | null; role: string; expires_at: string }>();

  if (!result) {
    return json({ valid: false, message: "Token không hợp lệ" }, 401);
  }

  if (new Date(result.expires_at) < new Date()) {
    return json({ valid: false, message: "Token đã hết hạn" }, 401);
  }

  return json({
    valid: true,
    user: {
      id: result.id,
      username: result.username,
      full_name: result.full_name,
      role: result.role,
    },
  });
}

async function handleLogout(env: Env, token: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ success: true });
}

// ===================== MENU / TABLES / ORDERS =====================

async function handleMenu(env: Env): Promise<Response> {
  const [categoriesResult, productsResult] = await Promise.all([
    env.DB.prepare(
      "SELECT id, name, sort_order FROM categories ORDER BY sort_order, name"
    ).all<Category>(),
    env.DB.prepare(
      `SELECT id, category_id, name, price, image_url, available
       FROM products
       WHERE available = 1
       ORDER BY name`
    ).all<Product>(),
  ]);

  return json({
    store_name: env.STORE_NAME,
    categories: categoriesResult.results,
    products: productsResult.results,
  });
}

async function handleTables(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, name, status, current_order_id
     FROM tables
     ORDER BY id`
  ).all<Table>();

  const ordersResult = await env.DB.prepare(
    `SELECT id, table_id, total, created_at
     FROM orders
     WHERE status = 'pending' AND table_id IS NOT NULL`
  ).all<{ id: number; table_id: number; total: number; created_at: string }>();

  const ordersByTable = new Map<number, { id: number; total: number; created_at: string }>();
  for (const o of ordersResult.results) {
    ordersByTable.set(o.table_id, o);
  }

  const tables = result.results.map((t) => ({
    ...t,
    pending_order: ordersByTable.get(t.id) || null,
  }));

  return json({ tables });
}

async function handleGetOrders(env: Env): Promise<Response> {
  const orders = await env.DB.prepare(
    `SELECT o.id, o.table_id, o.order_type, o.total, o.status,
            o.payment_method, o.customer_name, o.created_at,
            t.name as table_name
     FROM orders o
     LEFT JOIN tables t ON t.id = o.table_id
     ORDER BY o.created_at DESC
     LIMIT 50`
  ).all();

  return json({ orders: orders.results });
}

async function handleCreateOrder(env: Env, body: CreateOrderInput): Promise<Response> {
  if (!body.items || body.items.length === 0) {
    return json({ error: "Cart rỗng" }, 400);
  }

  const total = body.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const orderResult = await env.DB.prepare(
    `INSERT INTO orders (table_id, order_type, total, status, payment_method, customer_name)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).bind(
    body.table_id ?? null,
    body.order_type ?? "dine_in",
    total,
    "pending",
    body.payment_method ?? null,
    body.customer_name ?? null
  ).first<{ id: number }>();

  if (!orderResult) {
    return json({ error: "Không tạo được đơn" }, 500);
  }

  const orderId = orderResult.id;
  const stmt = env.DB.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  await env.DB.batch(
    body.items.map((it) =>
      stmt.bind(orderId, it.product_id, it.product_name, it.price, it.quantity, it.note ?? null)
    )
  );

  if (body.table_id) {
    await env.DB.prepare(
      `UPDATE tables SET status = 'occupied', current_order_id = ? WHERE id = ?`
    ).bind(orderId, body.table_id).run();
  }

  return json({
    success: true,
    order_id: orderId,
    total,
    items_count: body.items.length,
  });
}

async function handlePayTable(env: Env, tableId: number, paymentMethod: string): Promise<Response> {
  const order = await env.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first<{ id: number }>();

  if (!order) {
    return json({ error: "Không có order pending cho bàn này" }, 404);
  }

  await env.DB.prepare(
    `UPDATE orders SET status = 'paid', payment_method = ? WHERE id = ?`
  ).bind(paymentMethod, order.id).run();

  await env.DB.prepare(
    `UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`
  ).bind(tableId).run();

  return json({ success: true, order_id: order.id });
}

// ===================== ROUTER =====================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ----- AUTH -----
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = (await request.json()) as { username?: string; password?: string };
        return await handleLogin(env, body);
      } catch (err) {
        return json({ message: "Body không hợp lệ" }, 400);
      }
    }

    if (url.pathname === "/api/auth/verify" && request.method === "GET") {
      const token = extractToken(request);
      if (!token) return json({ valid: false, message: "Thiếu token" }, 401);
      try {
        return await handleVerify(env, token);
      } catch (err) {
        return json({ valid: false, message: String(err) }, 500);
      }
    }

    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      const token = extractToken(request);
      if (!token) return json({ success: false }, 400);
      try {
        return await handleLogout(env, token);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // ----- HEALTH / MENU / TABLES / ORDERS -----
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        store: env.STORE_NAME,
        time: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/menu") {
      try { return await handleMenu(env); }
      catch (err) { return json({ error: String(err) }, 500); }
    }

    if (url.pathname === "/api/tables") {
      try { return await handleTables(env); }
      catch (err) { return json({ error: String(err) }, 500); }
    }

    const payMatch = url.pathname.match(/^\/api\/tables\/(\d+)\/pay$/);
    if (payMatch && request.method === "POST") {
      try {
        const tableId = parseInt(payMatch[1], 10);
        const body = (await request.json()) as { payment_method?: string };
        return await handlePayTable(env, tableId, body.payment_method ?? "cash");
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        try { return await handleGetOrders(env); }
        catch (err) { return json({ error: String(err) }, 500); }
      }
      if (request.method === "POST") {
        try {
          const body = (await request.json()) as CreateOrderInput;
          return await handleCreateOrder(env, body);
        } catch (err) {
          return json({ error: String(err) }, 400);
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};