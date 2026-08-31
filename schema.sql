-- Schema cho POS demo trên Cloudflare D1
-- Port từ models.py: Category, Product, ProductSize, Table, Order, OrderItem, OrderItemTopping, User, Session
-- + Public menu additions: product_sizes, category_toppings, order_item_toppings, settings, staff_calls

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  production_unit TEXT NOT NULL DEFAULT 'counter',
  allow_all_toppings INTEGER NOT NULL DEFAULT 1
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
  production_unit TEXT NOT NULL DEFAULT 'counter',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

-- Product sizes (S/M/L variants)
CREATE TABLE IF NOT EXISTS product_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes(product_id);

-- Category ↔ Topping (M2M) - cho phép topping nào trên category nào
CREATE TABLE IF NOT EXISTS category_toppings (
  category_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  PRIMARY KEY (category_id, product_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Bàn (phục vụ cashier chọn bàn trước khi order)
CREATE TABLE IF NOT EXISTS tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'empty',
  current_order_id INTEGER
);

-- Orders (đơn hàng của bàn hoặc takeaway/ship)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  table_id INTEGER,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  customer_name TEXT,
  customer_session_id TEXT,
  request_token TEXT UNIQUE,
  table_position TEXT NOT NULL DEFAULT 'A',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (table_id) REFERENCES tables(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(customer_session_id);

-- Order items (từng món trong đơn)
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  size_name TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON order_items(status);

-- Order item toppings (topping của từng item)
CREATE TABLE IF NOT EXISTS order_item_toppings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  price INTEGER NOT NULL,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_order_item_toppings_item ON order_item_toppings(order_item_id);

-- Users (đăng nhập cashier/admin)
-- password_hash = SHA-256(salt + password), salt random 16 bytes hex
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL DEFAULT 1,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions: token-based auth, mỗi token là 32 bytes hex random
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Settings (k-v store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Staff calls (khách gọi nhân viên từ PublicMenu)
CREATE TABLE IF NOT EXISTS staff_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_id INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'new_customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (table_id) REFERENCES tables(id)
);
CREATE INDEX IF NOT EXISTS idx_staff_calls_table ON staff_calls(table_id);

-- Dữ liệu mẫu tiếng Việt
INSERT INTO categories (name, sort_order, production_unit, allow_all_toppings) VALUES
  ('Cà phê', 1, 'counter', 1),
  ('Trà sữa', 2, 'counter', 1),
  ('Nước ép', 3, 'counter', 1),
  ('Bánh ngọt', 4, 'counter', 1),
  ('Topping', 99, 'counter', 0);

INSERT INTO products (category_id, name, price, image_url, available, production_unit, is_topping) VALUES
  (1, 'Cà phê đen', 25000, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400', 1, 'counter', 0),
  (1, 'Cà phê sữa đá', 30000, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400', 1, 'counter', 0),
  (1, 'Bạc xỉu', 35000, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400', 1, 'counter', 0),
  (2, 'Trà sữa trân châu', 45000, 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400', 1, 'counter', 0),
  (2, 'Trà đào cam sả', 40000, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400', 1, 'counter', 0),
  (3, 'Nước ép cam', 35000, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400', 1, 'counter', 0),
  (3, 'Sinh tố bơ', 45000, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', 0, 'counter', 0),
  (4, 'Bánh croissant', 25000, 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400', 1, 'counter', 0),
  (5, 'Trân châu trắng', 5000, NULL, 1, 'counter', 1),
  (5, 'Trân châu đen', 5000, NULL, 1, 'counter', 1),
  (5, 'Thạch dừa', 6000, NULL, 1, 'counter', 1);

-- Sizes cho Trà sữa trân châu (id=4) và Trà đào cam sả (id=5)
INSERT INTO product_sizes (product_id, name, price, sort_order) VALUES
  (4, 'M', 35000, 0),
  (4, 'L', 45000, 1),
  (5, 'M', 35000, 0),
  (5, 'L', 45000, 1);

-- Allow toppings trên Trà sữa (id=2)
INSERT INTO category_toppings (category_id, product_id)
  SELECT 2, id FROM products WHERE is_topping = 1;
-- Allow toppings trên Cà phê (id=1)
INSERT INTO category_toppings (category_id, product_id)
  SELECT 1, id FROM products WHERE is_topping = 1;

INSERT INTO tables (name, status) VALUES
  ('Bàn 1', 'empty'),
  ('Bàn 2', 'empty'),
  ('Bàn 3', 'empty'),
  ('Bàn 4', 'empty'),
  ('Bàn 5', 'empty'),
  ('Bàn 6', 'empty'),
  ('Bàn 7', 'empty'),
  ('Bàn 8', 'empty');

-- Settings
INSERT INTO settings (key, value) VALUES ('featured_products', '[4,5,1,2]');
INSERT INTO settings (key, value) VALUES ('facebook_url', '');