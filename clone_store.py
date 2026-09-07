#!/usr/bin/env python3
"""
Clone dữ liệu từ cửa hàng SQLite (port 6002) vào Cloudflare D1.

Sử dụng:
    python clone_store.py                          # Clone menu + tables + users
    python clone_store.py --with-orders            # Clone luôn đơn hàng
    python clone_store.py --dry-run                # Chỉ in SQL, không thực thi
    python clone_store.py --execute                # Thực thi trực tiếp qua wrangler

Mapping bảng:
    SQLite.category       → D1.categories
    SQLite.product        → D1.products         (price: float→integer)
    SQLite.product_size   → D1.product_sizes    (price: float→integer, +sort_order)
    SQLite.category_toppings → D1.category_toppings (same)
    SQLite.table          → D1.tables           (status: available→empty)
    SQLite.user           → D1.users            (password_hash: werkzeug→SHA256 placeholder)
    SQLite.order          → D1.orders           (--with-orders only)
    SQLite.order_item     → D1.order_items      (--with-orders only)
    SQLite.order_item_topping → D1.order_item_toppings (--with-orders only)
"""

import sqlite3
import json
import subprocess
import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
SOURCE_DB = r"C:\Users\Admin\Desktop\pos\pos\stores\default\pos.db"
SOURCE_SETTINGS = r"C:\Users\Admin\Desktop\pos\pos\stores\default\settings.json"
D1_DATABASE_ID = "9dd2600b-5b43-4976-baf5-5c86d1c74748"
OUTPUT_SQL = "clone_output.sql"


def connect_source():
    """Kết nối SQLite source database."""
    if not os.path.exists(SOURCE_DB):
        print(f"❌ Không tìm thấy database: {SOURCE_DB}")
        sys.exit(1)
    conn = sqlite3.connect(SOURCE_DB)
    conn.row_factory = sqlite3.Row
    return conn


def escape_sql(value):
    """Escape giá trị cho SQL string."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime):
        return f"'{value.isoformat()}'"
    s = str(value).replace("'", "''")
    return f"'{s}'"


def read_source_data(conn):
    """Đọc toàn bộ dữ liệu cần clone từ source."""
    data = {}

    # Categories
    data["categories"] = conn.execute(
        "SELECT id, name, sort_order, production_unit, allow_all_toppings FROM category ORDER BY sort_order"
    ).fetchall()

    # Products
    data["products"] = conn.execute(
        "SELECT id, name, price, image_url, available, production_unit, is_topping, category_id FROM product"
    ).fetchall()

    # Product sizes
    data["product_sizes"] = conn.execute(
        "SELECT id, product_id, name, price FROM product_size"
    ).fetchall()

    # Category toppings
    data["category_toppings"] = conn.execute(
        "SELECT category_id, product_id FROM category_toppings"
    ).fetchall()

    # Tables
    data["tables"] = conn.execute(
        "SELECT id, name, status FROM table"
    ).fetchall()

    # Users
    data["users"] = conn.execute(
        "SELECT id, username, password_hash, role, full_name FROM user"
    ).fetchall()

    # Orders (optional)
    try:
        data["orders"] = conn.execute(
            "SELECT id, table_id, table_position, user_id, status, total_amount, created_at, "
            "kitchen_status, order_type, display_code, client_id, customer_name, customer_phone, "
            "ship_address, payment_status, payment_method, payment_archived, customer_session_id "
            "FROM 'order'"
        ).fetchall()
    except Exception:
        data["orders"] = []

    # Order items
    try:
        data["order_items"] = conn.execute(
            "SELECT id, order_id, product_id, quantity, price, status, size_name, notes "
            "FROM order_item"
        ).fetchall()
    except Exception:
        data["order_items"] = []

    # Order item toppings
    try:
        data["order_item_toppings"] = conn.execute(
            "SELECT id, order_item_id, product_id, price FROM order_item_topping"
        ).fetchall()
    except Exception:
        data["order_item_toppings"] = []

    return data


def read_source_settings():
    """Đọc settings.json từ source store."""
    if os.path.exists(SOURCE_SETTINGS):
        with open(SOURCE_SETTINGS, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def generate_sql(data, settings, with_orders=False):
    """Tạo SQL statements cho D1."""
    lines = []
    lines.append("-- ══════════════════════════════════════════════════════════")
    lines.append(f"-- Clone dữ liệu từ port 6002 vào D1")
    lines.append(f"-- Generated: {datetime.now().isoformat()}")
    lines.append("-- ══════════════════════════════════════════════════════════")
    lines.append("")

    # ── Xóa dữ liệu cũ (theo thứ tự FK) ──
    lines.append("-- Xóa dữ liệu cũ")
    lines.append("DELETE FROM order_item_toppings;")
    lines.append("DELETE FROM order_items;")
    lines.append("DELETE FROM orders;")
    lines.append("DELETE FROM category_toppings;")
    lines.append("DELETE FROM product_sizes;")
    lines.append("DELETE FROM products;")
    lines.append("DELETE FROM categories;")
    lines.append("DELETE FROM tables;")
    lines.append("DELETE FROM users;")
    lines.append("DELETE FROM sessions;")
    lines.append("DELETE FROM settings;")
    lines.append("DELETE FROM staff_calls;")
    lines.append("DELETE FROM zalo_notification_logs;")
    lines.append("")

    # ── Categories ──
    lines.append(f"-- Categories ({len(data['categories'])} rows)")
    for row in data["categories"]:
        allow = 1 if row["allow_all_toppings"] else 0
        lines.append(
            f"INSERT INTO categories (id, store_id, name, sort_order, production_unit, allow_all_toppings) "
            f"VALUES ({row['id']}, 1, {escape_sql(row['name'])}, {row['sort_order']}, "
            f"{escape_sql(row['production_unit'])}, {allow});"
        )
    lines.append("")

    # ── Products ──
    lines.append(f"-- Products ({len(data['products'])} rows)")
    for row in data["products"]:
        price = int(round(row["price"]))  # D1 dùng INTEGER cho price
        img = escape_sql(row["image_url"])
        avail = 1 if row["available"] else 0
        topping = 1 if row["is_topping"] else 0
        lines.append(
            f"INSERT INTO products (id, store_id, category_id, name, price, image_url, available, "
            f"is_topping, production_unit) "
            f"VALUES ({row['id']}, 1, {row['category_id']}, {escape_sql(row['name'])}, "
            f"{price}, {img}, {avail}, {topping}, {escape_sql(row['production_unit'])});"
        )
    lines.append("")

    # ── Product sizes ──
    lines.append(f"-- Product sizes ({len(data['product_sizes'])} rows)")
    for i, row in enumerate(data["product_sizes"]):
        price = int(round(row["price"]))
        lines.append(
            f"INSERT INTO product_sizes (id, product_id, name, price, sort_order) "
            f"VALUES ({row['id']}, {row['product_id']}, {escape_sql(row['name'])}, {price}, {i});"
        )
    lines.append("")

    # ── Category toppings ──
    lines.append(f"-- Category toppings ({len(data['category_toppings'])} rows)")
    for row in data["category_toppings"]:
        lines.append(
            f"INSERT INTO category_toppings (category_id, product_id) "
            f"VALUES ({row['category_id']}, {row['product_id']});"
        )
    lines.append("")

    # ── Tables ──
    lines.append(f"-- Tables ({len(data['tables'])} rows)")
    for row in data["tables"]:
        # SQLite: available/occupied → D1: empty/occupied
        status = "empty" if row["status"] == "available" else row["status"]
        lines.append(
            f"INSERT INTO tables (id, store_id, name, status) "
            f"VALUES ({row['id']}, 1, {escape_sql(row['name'])}, {escape_sql(status)});"
        )
    lines.append("")

    # ── Users ──
    lines.append(f"-- Users ({len(data['users'])} rows)")
    lines.append("-- Lưu ý: password_hash từ werkzeug không tương thích với D1 (SHA-256).")
    lines.append("-- User sẽ cần đổi mật khẩu sau khi clone, hoặc tạo user mới.")
    for row in data["users"]:
        # Tạo salt placeholder - password_hash sẽ không dùng được
        # nhưng vẫn clone để giữ cấu trúc. Admin nên tạo lại user.
        lines.append(
            f"INSERT INTO users (id, store_id, username, password_hash, salt, full_name, role) "
            f"VALUES ({row['id']}, 1, {escape_sql(row['username'])}, "
            f"{escape_sql(row['password_hash'])}, 'clone-placeholder', "
            f"{escape_sql(row['full_name'])}, {escape_sql(row['role'])});"
        )
    lines.append("")

    # ── Orders (optional) ──
    if with_orders and data["orders"]:
        lines.append(f"-- Orders ({len(data['orders'])} rows)")
        for row in data["orders"]:
            order_type = row["order_type"] or "dine_in"
            created = escape_sql(row["created_at"]) if row["created_at"] else "datetime('now')"
            # Map payment_method NULL → NULL
            pm = escape_sql(row["payment_method"]) if row["payment_method"] else "NULL"
            lines.append(
                f"INSERT INTO orders (id, store_id, table_id, order_type, total, status, "
                f"payment_method, customer_name, customer_session_id, table_position, created_at) "
                f"VALUES ({row['id']}, 1, {row['table_id'] or 'NULL'}, {escape_sql(order_type)}, "
                f"{int(round(row['total_amount']))}, {escape_sql(row['status'])}, "
                f"{pm}, {escape_sql(row['customer_name'])}, "
                f"{escape_sql(row['customer_session_id'])}, "
                f"{escape_sql(row['table_position'] or 'A')}, {created});"
            )
        lines.append("")

        # Order items
        lines.append(f"-- Order items ({len(data['order_items'])} rows)")
        for row in data["order_items"]:
            price = int(round(row["price"]))
            lines.append(
                f"INSERT INTO order_items (id, order_id, product_id, product_name, price, "
                f"quantity, note, status, size_name) "
                f"VALUES ({row['id']}, {row['order_id']}, {row['product_id']}, "
                f"'item-{row['id']}', {price}, {row['quantity']}, "
                f"{escape_sql(row['notes'])}, {escape_sql(row['status'])}, "
                f"{escape_sql(row['size_name'])});"
            )
        lines.append("")

        # Order item toppings
        lines.append(f"-- Order item toppings ({len(data['order_item_toppings'])} rows)")
        for row in data["order_item_toppings"]:
            price = int(round(row["price"]))
            lines.append(
                f"INSERT INTO order_item_toppings (id, order_item_id, product_id, price) "
                f"VALUES ({row['id']}, {row['order_item_id']}, {row['product_id']}, {price});"
            )
        lines.append("")

    # ── Settings ──
    lines.append("-- Settings")

    # Featured products từ source settings
    featured = settings.get("featured_products", [])
    if featured:
        lines.append(
            f"INSERT INTO settings (key, value) VALUES ('featured_products', {escape_sql(json.dumps(featured))});"
        )

    facebook = settings.get("facebook_url", "")
    lines.append(
        f"INSERT INTO settings (key, value) VALUES ('facebook_url', {escape_sql(facebook)});"
    )

    # Ship settings
    ship_enabled = settings.get("ship_enabled", True)
    lines.append(
        f"INSERT INTO settings (key, value) VALUES ('ship_enabled', {escape_sql(json.dumps(ship_enabled))});"
    )

    # Zalo bot settings (nếu có)
    zalo = settings.get("zalo_bot", {})
    if zalo:
        lines.append(
            f"INSERT INTO settings (key, value) VALUES ('zalo_bot', {escape_sql(json.dumps(zalo))});"
        )

    lines.append("")

    # Reset autoincrement
    lines.append("-- Reset AUTOINCREMENT counters")
    max_cat = max((r["id"] for r in data["categories"]), default=0)
    max_prod = max((r["id"] for r in data["products"]), default=0)
    max_size = max((r["id"] for r in data["product_sizes"]), default=0)
    max_table = max((r["id"] for r in data["tables"]), default=0)
    max_user = max((r["id"] for r in data["users"]), default=0)
    lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('categories', {max_cat});")
    lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('products', {max_prod});")
    lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('product_sizes', {max_size});")
    lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('tables', {max_table});")
    lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('users', {max_user});")

    if with_orders and data["orders"]:
        max_order = max((r["id"] for r in data["orders"]), default=0)
        max_oi = max((r["id"] for r in data["order_items"]), default=0)
        max_oit = max((r["id"] for r in data["order_item_toppings"]), default=0)
        lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('orders', {max_order});")
        lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('order_items', {max_oi});")
        lines.append(f"INSERT INTO sqlite_sequence (name, seq) VALUES ('order_item_toppings', {max_oit});")

    lines.append("")
    lines.append("-- ✅ Clone hoàn tất!")
    return "\n".join(lines)


def execute_sql(sql_content):
    """Thực thi SQL qua wrangler d1 execute."""
    print(f"\n🚀 Đang thực thi trên D1 ({D1_DATABASE_ID})...")

    # Ghi SQL ra file tạm
    tmp_file = "_clone_tmp.sql"
    with open(tmp_file, "w", encoding="utf-8") as f:
        f.write(sql_content)

    try:
        result = subprocess.run(
            ["npx", "wrangler", "d1", "execute", "pos-free",
             f"--remote", f"--file={tmp_file}"],
            capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))
        )
        print(result.stdout)
        if result.returncode != 0:
            print(f"❌ Lỗi: {result.stderr}")
            return False
        print("✅ Clone thành công!")
        return True
    finally:
        if os.path.exists(tmp_file):
            os.remove(tmp_file)


def print_summary(data):
    """In tóm tắt dữ liệu sẽ clone."""
    print("\n📊 Tóm tắt dữ liệu sẽ clone:")
    print(f"  • Categories:    {len(data['categories'])}")
    print(f"  • Products:      {len(data['products'])}")
    print(f"  • Product sizes: {len(data['product_sizes'])}")
    print(f"  • Cat toppings:  {len(data['category_toppings'])}")
    print(f"  • Tables:        {len(data['tables'])}")
    print(f"  • Users:         {len(data['users'])}")
    if data["orders"]:
        print(f"  • Orders:        {len(data['orders'])}")
        print(f"  • Order items:   {len(data['order_items'])}")
        print(f"  • Ord toppings:  {len(data['order_item_toppings'])}")


def main():
    parser = argparse.ArgumentParser(description="Clone dữ liệu từ SQLite (port 6002) vào Cloudflare D1")
    parser.add_argument("--with-orders", action="store_true", help="Clone luôn đơn hàng")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ tạo file SQL, không thực thi")
    parser.add_argument("--execute", action="store_true", help="Thực thi trực tiếp qua wrangler")
    parser.add_argument("--output", default=OUTPUT_SQL, help=f"Tên file output (default: {OUTPUT_SQL})")
    args = parser.parse_args()

    print("🔄 Đang đọc dữ liệu từ cửa hàng port 6002...")
    conn = connect_source()
    data = read_source_data(conn)
    settings = read_source_settings()
    conn.close()

    print_summary(data)

    print(f"\n📝 Đang tạo SQL cho D1...")
    sql_content = generate_sql(data, settings, with_orders=args.with_orders)

    # Luôn lưu file SQL
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"💾 Đã lưu SQL: {args.output}")

    if args.execute:
        execute_sql(sql_content)
    elif args.dry_run:
        print(f"\n📋 Dry-run: SQL đã tạo tại {args.output}")
        print("   Dùng --execute để thực thi trực tiếp")
    else:
        # Default: tạo file + hướng dẫn
        print(f"\n📋 Bước tiếp theo:")
        print(f"   1. Xem SQL:  cat {args.output}")
        print(f"   2. Thực thi: python clone_store.py --execute")
        print(f"   Hoặc thủ công:")
        print(f"   npx wrangler d1 execute pos-free --remote --file={args.output}")


if __name__ == "__main__":
    main()
