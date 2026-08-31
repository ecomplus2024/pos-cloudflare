/**
 * POS Demo - Cloudflare Worker
 *
 * Endpoints:
 *   GET  /api/menu         - Trả về danh sách sản phẩm + danh mục
 *   GET  /api/health       - Health check
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

async function handleProducts(env: Env, url: URL): Promise<Response> {
  const categoryId = url.searchParams.get("category_id");
  const query = categoryId
    ? "SELECT * FROM products WHERE available = 1 AND category_id = ? ORDER BY name"
    : "SELECT * FROM products WHERE available = 1 ORDER BY name";

  const stmt = env.DB.prepare(query);
  const result = categoryId
    ? await stmt.bind(Number(categoryId)).all<Product>()
    : await stmt.all<Product>();

  return json({ products: result.results });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // API routes
    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        store: env.STORE_NAME,
        time: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/menu") {
      try {
        return await handleMenu(env);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    if (url.pathname === "/api/products") {
      try {
        return await handleProducts(env, url);
      } catch (err) {
        return json({ error: String(err) }, 500);
      }
    }

    // Mọi thứ khác → React frontend (static assets)
    return env.ASSETS.fetch(request);
  },
};
