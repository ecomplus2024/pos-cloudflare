#!/usr/bin/env node
/**
 * Clone dữ liệu từ cửa hàng SQLite (port 6002) vào Cloudflare D1.
 *
 * Sử dụng:
 *   node clone_store.mjs                   # Tạo SQL file
 *   node clone_store.mjs --execute         # Thực thi trực tiếp qua wrangler
 *   node clone_store.mjs --with-orders     # Clone luôn đơn hàng
 *
 * Mapping bảng:
 *   SQLite.category       → D1.categories
 *   SQLite.product        → D1.products         (price: float→integer)
 *   SQLite.product_size   → D1.product_sizes    (price: float→integer)
 *   SQLite.category_toppings → D1.category_toppings
 *   SQLite.table          → D1.tables           (status: available→empty)
 *   SQLite.user           → D1.users
 *   SQLite.order          → D1.orders           (--with-orders)
 *   SQLite.order_item     → D1.order_items      (--with-orders)
 *   SQLite.order_item_topping → D1.order_item_toppings (--with-orders)
 */

import Database from "better-sqlite3";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────
const SOURCE_DB = String.raw`C:\Users\Admin\Desktop\pos\pos\stores\default\pos.db`;
const SOURCE_SETTINGS = String.raw`C:\Users\Admin\Desktop\pos\pos\stores\default\settings.json`;
const D1_NAME = "pos-free";
const OUTPUT_SQL = path.join(__dirname, "clone_output.sql");

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const withOrders = args.includes("--with-orders");
const doExecute = args.includes("--execute");

// ── Helpers ───────────────────────────────────────────────────────────
function esc(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function intPrice(floatPrice) {
  return Math.round(floatPrice);
}

// ── Main ──────────────────────────────────────────────────────────────
console.log("🔄 Đang đọc dữ liệu từ cửa hàng port 6002...");

if (!fs.existsSync(SOURCE_DB)) {
  console.error(`❌ Không tìm thấy database: ${SOURCE_DB}`);
  process.exit(1);
}

const db = new Database(SOURCE_DB, { readonly: true });

// Read source data
const categories = db
  .prepare(
    "SELECT id, name, sort_order, production_unit, allow_all_toppings FROM category ORDER BY sort_order"
  )
  .all();

const products = db
  .prepare(
    "SELECT id, name, price, image_url, available, production_unit, is_topping, category_id FROM product"
  )
  .all();

const productSizes = db
  .prepare("SELECT id, product_id, name, price FROM product_size")
  .all();

const categoryToppings = db
  .prepare("SELECT category_id, product_id FROM category_toppings")
  .all();

const tables = db
  .prepare("SELECT id, name, status FROM [table]")
  .all();

const users = db
  .prepare("SELECT id, username, password_hash, role, full_name FROM user")
  .all();

// Orders (optional)
let orders = [];
let orderItems = [];
let orderItemToppings = [];
if (withOrders) {
  try {
    orders = db
      .prepare(
        `SELECT id, table_id, table_position, user_id, status, total_amount, created_at,
         kitchen_status, order_type, display_code, client_id, customer_name, customer_phone,
         ship_address, payment_status, payment_method, payment_archived, customer_session_id
         FROM "order"`
      )
      .all();
    orderItems = db
      .prepare(
        "SELECT id, order_id, product_id, quantity, price, status, size_name, notes FROM order_item"
      )
      .all();
    orderItemToppings = db
      .prepare("SELECT id, order_item_id, product_id, price FROM order_item_topping")
      .all();
  } catch (e) {
    console.log("⚠️  Không đọc được đơn hàng:", e.message);
  }
}

db.close();

// Read settings.json
let settings = {};
if (fs.existsSync(SOURCE_SETTINGS)) {
  settings = JSON.parse(fs.readFileSync(SOURCE_SETTINGS, "utf-8"));
}

// ── Summary ───────────────────────────────────────────────────────────
console.log("\n📊 Tóm tắt dữ liệu sẽ clone:");
console.log(`  • Categories:    ${categories.length}`);
console.log(`  • Products:      ${products.length}`);
console.log(`  • Product sizes: ${productSizes.length}`);
console.log(`  • Cat toppings:  ${categoryToppings.length}`);
console.log(`  • Tables:        ${tables.length}`);
console.log(`  • Users:         ${users.length}`);
if (withOrders) {
  console.log(`  • Orders:        ${orders.length}`);
  console.log(`  • Order items:   ${orderItems.length}`);
  console.log(`  • Ord toppings:  ${orderItemToppings.length}`);
}

// ── Generate SQL ──────────────────────────────────────────────────────
console.log("\n📝 Đang tạo SQL cho D1...");

const lines = [];

lines.push("-- ══════════════════════════════════════════════════════════");
lines.push(`-- Clone dữ liệu từ port 6002 vào D1`);
lines.push(`-- Generated: ${new Date().toISOString()}`);
lines.push("-- ══════════════════════════════════════════════════════════");
lines.push("");

// Xóa dữ liệu cũ (theo thứ tự FK)
lines.push("-- Xóa dữ liệu cũ");
lines.push("DELETE FROM order_item_toppings;");
lines.push("DELETE FROM order_items;");
lines.push("DELETE FROM orders;");
lines.push("DELETE FROM category_toppings;");
lines.push("DELETE FROM product_sizes;");
lines.push("DELETE FROM products;");
lines.push("DELETE FROM categories;");
lines.push("DELETE FROM tables;");
lines.push("DELETE FROM users;");
lines.push("DELETE FROM sessions;");
lines.push("DELETE FROM settings;");
lines.push("DELETE FROM staff_calls;");
lines.push("DELETE FROM zalo_notification_logs;");
lines.push("");

// Categories
lines.push(`-- Categories (${categories.length} rows)`);
for (const r of categories) {
  lines.push(
    `INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) ` +
      `VALUES (${r.id}, 1, ${esc(r.name)}, ${r.sort_order}, ${esc(r.production_unit)}, ${r.allow_all_toppings ? 1 : 0});`
  );
}
lines.push("");

// Products
lines.push(`-- Products (${products.length} rows)`);
for (const r of products) {
  lines.push(
    `INSERT INTO products (id, store_id, category_id, name, price, image_url, available, is_topping, production_unit) ` +
      `VALUES (${r.id}, 1, ${r.category_id}, ${esc(r.name)}, ${intPrice(r.price)}, ${esc(r.image_url)}, ${r.available ? 1 : 0}, ${r.is_topping ? 1 : 0}, ${esc(r.production_unit)});`
  );
}
lines.push("");

// Product sizes
lines.push(`-- Product sizes (${productSizes.length} rows)`);
productSizes.forEach((r, i) => {
  lines.push(
    `INSERT INTO product_sizes (id, product_id, name, price, sort_order) ` +
      `VALUES (${r.id}, ${r.product_id}, ${esc(r.name)}, ${intPrice(r.price)}, ${i});`
  );
});
lines.push("");

// Category toppings
lines.push(`-- Category toppings (${categoryToppings.length} rows)`);
for (const r of categoryToppings) {
  lines.push(
    `INSERT INTO category_toppings (category_id, product_id) VALUES (${r.category_id}, ${r.product_id});`
  );
}
lines.push("");

// Tables
lines.push(`-- Tables (${tables.length} rows)`);
for (const r of tables) {
  const status = r.status === "available" ? "empty" : r.status;
  lines.push(
    `INSERT INTO tables (id, store_id, name, status) VALUES (${r.id}, 1, ${esc(r.name)}, ${esc(status)});`
  );
}
lines.push("");

// Users
lines.push(`-- Users (${users.length} rows)`);
lines.push(
  "-- Lưu ý: password_hash từ werkzeug không tương thích D1 (SHA-256). User cần đổi mật khẩu."
);
for (const r of users) {
  lines.push(
    `INSERT INTO users (id, store_id, username, password_hash, salt, full_name, role) ` +
      `VALUES (${r.id}, 1, ${esc(r.username)}, ${esc(r.password_hash)}, 'clone-placeholder', ${esc(r.full_name)}, ${esc(r.role)});`
  );
}
lines.push("");

// Orders (optional)
if (withOrders && orders.length > 0) {
  lines.push(`-- Orders (${orders.length} rows)`);
  for (const r of orders) {
    const orderType = r.order_type || "dine_in";
    const created = r.created_at ? esc(r.created_at) : "datetime('now')";
    const pm = r.payment_method ? esc(r.payment_method) : "NULL";
    lines.push(
      `INSERT INTO orders (id, store_id, table_id, order_type, total, status, payment_method, customer_name, customer_session_id, table_position, created_at) ` +
        `VALUES (${r.id}, 1, ${r.table_id || "NULL"}, ${esc(orderType)}, ${intPrice(r.total_amount)}, ${esc(r.status)}, ${pm}, ${esc(r.customer_name)}, ${esc(r.customer_session_id)}, ${esc(r.table_position || "A")}, ${created});`
    );
  }
  lines.push("");

  lines.push(`-- Order items (${orderItems.length} rows)`);
  for (const r of orderItems) {
    lines.push(
      `INSERT INTO order_items (id, order_id, product_id, product_name, price, quantity, note, status, size_name) ` +
        `VALUES (${r.id}, ${r.order_id}, ${r.product_id}, 'item-${r.id}', ${intPrice(r.price)}, ${r.quantity}, ${esc(r.notes)}, ${esc(r.status)}, ${esc(r.size_name)});`
    );
  }
  lines.push("");

  lines.push(`-- Order item toppings (${orderItemToppings.length} rows)`);
  for (const r of orderItemToppings) {
    lines.push(
      `INSERT INTO order_item_toppings (id, order_item_id, product_id, price) ` +
        `VALUES (${r.id}, ${r.order_item_id}, ${r.product_id}, ${intPrice(r.price)});`
    );
  }
  lines.push("");
}

// Settings
lines.push("-- Settings");
if (settings.featured_products) {
  lines.push(
    `INSERT INTO settings (key, value) VALUES ('featured_products', ${esc(JSON.stringify(settings.featured_products))});`
  );
}
lines.push(
  `INSERT INTO settings (key, value) VALUES ('facebook_url', ${esc(settings.facebook_url || "")});`
);
lines.push(
  `INSERT INTO settings (key, value) VALUES ('ship_enabled', ${esc(JSON.stringify(settings.ship_enabled !== false))});`
);
if (settings.zalo_bot) {
  lines.push(
    `INSERT INTO settings (key, value) VALUES ('zalo_bot', ${esc(JSON.stringify(settings.zalo_bot))});`
  );
}
lines.push("");

// Reset autoincrement
lines.push("-- Reset AUTOINCREMENT counters");
const maxCat = Math.max(...categories.map((r) => r.id), 0);
const maxProd = Math.max(...products.map((r) => r.id), 0);
const maxSize = Math.max(...productSizes.map((r) => r.id), 0);
const maxTable = Math.max(...tables.map((r) => r.id), 0);
const maxUser = Math.max(...users.map((r) => r.id), 0);
lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('categories', ${maxCat});`);
lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('products', ${maxProd});`);
lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('product_sizes', ${maxSize});`);
lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('tables', ${maxTable});`);
lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('users', ${maxUser});`);

if (withOrders && orders.length > 0) {
  const maxOrder = Math.max(...orders.map((r) => r.id), 0);
  const maxOI = Math.max(...orderItems.map((r) => r.id), 0);
  const maxOIT = Math.max(...orderItemToppings.map((r) => r.id), 0);
  lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', ${maxOrder});`);
  lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('order_items', ${maxOI});`);
  lines.push(`INSERT INTO sqlite_sequence (name, seq) VALUES ('order_item_toppings', ${maxOIT});`);
}

lines.push("");
lines.push("-- ✅ Clone hoàn tất!");

const sqlContent = lines.join("\n");

// ── Write output ──────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_SQL, sqlContent, "utf-8");
console.log(`💾 Đã lưu SQL: ${OUTPUT_SQL}`);

// ── Execute or print instructions ─────────────────────────────────────
if (doExecute) {
  console.log(`\n🚀 Đang thực thi trên D1 (${D1_NAME})...`);
  try {
    const output = execSync(
      `npx wrangler d1 execute ${D1_NAME} --remote --file="${OUTPUT_SQL}"`,
      { cwd: __dirname, encoding: "utf-8", stdio: "pipe" }
    );
    console.log(output);
    console.log("✅ Clone thành công!");
  } catch (e) {
    console.error("❌ Lỗi khi thực thi:", e.stderr || e.message);
    process.exit(1);
  }
} else {
  console.log("\n📋 Bước tiếp theo:");
  console.log(`   1. Xem SQL:  cat clone_output.sql`);
  console.log(`   2. Thực thi: node clone_store.mjs --execute`);
  console.log(`   Hoặc thủ công:`);
  console.log(`   npx wrangler d1 execute ${D1_NAME} --remote --file=clone_output.sql`);
}
