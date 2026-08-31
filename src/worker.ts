/**
 * POS Demo - Cloudflare Worker
 *
 * Endpoints:
 *   GET  /api/health        - Health check
 *   GET  /api/menu          - Categories + products
 *   GET  /api/tables        - Danh sách bàn + trạng thái
 *   GET  /api/orders        - Danh sách orders gần đây
 *   POST /api/orders        - Tạo order mới từ cart
 *   POST /api/tables/:id/pay - Đánh dấu bàn đã thanh toán
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
  "Access-Control-Allow-Headers": "Content-Type",
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

  // Lấy orders pending của từng bàn để hiển thị tổng tiền
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

  const total = body.items.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  // Tạo order
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

  // Insert order_items
  const stmt = env.DB.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, note)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  await env.DB.batch(
    body.items.map((it) =>
      stmt.bind(orderId, it.product_id, it.product_name, it.price, it.quantity, it.note ?? null)
    )
  );

  // Cập nhật bàn thành occupied nếu là dine_in
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
  // Lấy order pending của bàn
  const order = await env.DB.prepare(
    `SELECT id FROM orders WHERE table_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`
  ).bind(tableId).first<{ id: number }>();

  if (!order) {
    return json({ error: "Không có order pending cho bàn này" }, 404);
  }

  // Đánh dấu order paid
  await env.DB.prepare(
    `UPDATE orders SET status = 'paid', payment_method = ? WHERE id = ?`
  ).bind(paymentMethod, order.id).run();

  // Reset bàn về empty
  await env.DB.prepare(
    `UPDATE tables SET status = 'empty', current_order_id = NULL WHERE id = ?`
  ).bind(tableId).run();

  return json({ success: true, order_id: order.id });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        store: env.STORE_NAME,
        time: new Date().toISOString(),
      });
    }

    // Menu
    if (url.pathname === "/api/menu") {
      try {
        return await handleMenu(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // Tables
    if (url.pathname === "/api/tables") {
      try {
        return await handleTables(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // Pay table: POST /api/tables/:id/pay
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

    // Orders
    if (url.pathname === "/api/orders") {
      if (request.method === "GET") {
        try {
          return await handleGetOrders(env);
        } catch (err) {
          return json({ error: String(err) }, 500);
        }
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

    // Mọi thứ khác → React frontend (static assets)
    return env.ASSETS.fetch(request);
  },
};