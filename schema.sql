-- Schema cho POS demo trên Cloudflare D1
-- Port từ models.py: Category + Product
-- Multi-store: thêm store_id (mặc định 1 store cho demo)

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image_url TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  is_topping INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

-- Dữ liệu mẫu tiếng Việt
INSERT INTO categories (name, sort_order) VALUES
  ('Cà phê', 1),
  ('Trà sữa', 2),
  ('Nước ép', 3),
  ('Bánh ngọt', 4);

INSERT INTO products (category_id, name, price, image_url, available) VALUES
  (1, 'Cà phê đen', 25000, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', 1),
  (1, 'Cà phê sữa đá', 30000, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', 1),
  (1, 'Bạc xỉu', 35000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400', 1),
  (2, 'Trà sữa trân châu', 45000, 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=400', 1),
  (2, 'Trà đào cam sả', 40000, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', 1),
  (3, 'Nước ép cam', 35000, 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400', 1),
  (3, 'Sinh tố bơ', 45000, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', 0),
  (4, 'Bánh croissant', 25000, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400', 1);
