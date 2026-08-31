// POS Demo - React 18 + JSX + TailwindCSS production build
// - mode='cashier': Login → PosApp (tables grid + menu + cart + checkout)
// - mode='public': WelcomeOverlay → Menu (categories + products + sizes + toppings)
//                   + CartModal + SizeModal + EditItemModal + TableGroupModal
//                   + WaitingStaffScreen + MyOrderView
//
// React 18 + ReactDOM 18 UMD load từ CDN, JSX transform bởi Babel standalone

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ============ Helpers ============
const formatVND = (amount) => new Intl.NumberFormat("vi-VN").format(amount) + " đ";

const TOKEN_KEY = "pos_demo_token";
const USER_KEY = "pos_demo_user";
const REQUEST_TOKEN_PREFIX = "public_request_token-";
const CART_PREFIX = "public_cart-";
const SESSION_PREFIX = "publicSessionId-";
const WELCOME_KEY = "hasSeenWelcome";

const MOCK_MENU = {
  store_name: "Quán Cà Phê Demo",
  categories: [
    { id: 1, name: "Cà phê" }, { id: 2, name: "Trà sữa" },
    { id: 3, name: "Nước ép" }, { id: 4, name: "Bánh ngọt" },
  ],
  products: [
    { id: 1, category_id: 1, name: "Cà phê đen", price: 25000, image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400" },
    { id: 2, category_id: 1, name: "Cà phê sữa đá", price: 30000, image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400" },
    { id: 3, category_id: 1, name: "Bạc xỉu", price: 35000, image_url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400" },
    { id: 4, category_id: 2, name: "Trà sữa trân châu", price: 45000, image_url: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400" },
    { id: 5, category_id: 2, name: "Trà đào cam sả", price: 40000, image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
    { id: 6, category_id: 3, name: "Nước ép cam", price: 35000, image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400" },
    { id: 7, category_id: 3, name: "Sinh tố bơ", price: 45000, image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400" },
    { id: 8, category_id: 4, name: "Bánh croissant", price: 25000, image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400" },
  ],
  tables: [
    { id: 1, name: "Bàn 1", status: "empty" },
    { id: 2, name: "Bàn 2", status: "empty" },
    { id: 3, name: "Bàn 3", status: "empty" },
    { id: 4, name: "Bàn 4", status: "empty" },
    { id: 5, name: "Bàn 5", status: "occupied", pending_order: { total: 245000 } },
    { id: 6, name: "Bàn 6", status: "empty" },
    { id: 7, name: "Bàn 7", status: "occupied", pending_order: { total: 120000 } },
    { id: 8, name: "Bàn 8", status: "empty" },
  ],
};

const genToken = () => (crypto.randomUUID ? crypto.randomUUID() : "tk_" + Math.random().toString(36).slice(2));

// ============ Auth functions ============
async function authLogin(username, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || "Đăng nhập thất bại");
  return data;
}

async function authVerify(token) {
  try {
    const r = await fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.valid ? data.user : null;
  } catch { return null; }
}

async function authLogout(token) {
  try { await fetch("/api/auth/logout", { method: "POST", headers: { "Authorization": `Bearer ${token}` } }); } catch {}
}

// ============ Cashier Login View ============
function LoginView({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authLogin(username, password);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-700 p-4">
      <form onSubmit={onSubmit} className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-orange-100 p-4 rounded-full mb-4">
            <div className="w-8 h-8 flex items-center justify-center text-orange-600 text-3xl font-bold">🔐</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">F&B POS</h1>
          <p className="text-gray-500 mt-2 text-center">Đăng nhập để bắt đầu phiên làm việc</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
            <input
              type="text" value={username} data-focus-key="login-username"
              onChange={(e) => setUsername(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
            <input
              type="password" value={password} data-focus-key="login-password"
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
          <button
            type="submit" disabled={loading}
            className={`w-full text-white py-3 rounded-xl font-bold transition shadow-lg ${
              loading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 active:scale-95"
            }`}
          >{loading ? "Đang đăng nhập..." : "Đăng Nhập"}</button>
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs">
            <div className="font-semibold mb-1">Tài khoản demo:</div>
            <div>Tên đăng nhập: admin</div>
            <div>Mật khẩu: admin123</div>
          </div>
        </div>
        <div className="mt-8 text-center text-gray-400 text-sm">© 2026 Premium POS System</div>
      </form>
    </div>
  );
}

// ============ Cashier PosApp ============
function PosApp({ user, onLogout }) {
  const [view, setView] = useState("tables");
  const [storeName, setStoreName] = useState("Đang tải...");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [usingMock, setUsingMock] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/menu").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      fetch("/api/tables").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    ])
      .then(([menu, tbl]) => {
        setStoreName(menu.store_name || "POS Demo");
        setCategories(menu.categories || []);
        setProducts(menu.products || []);
        setTables(tbl.tables || []);
      })
      .catch(() => {
        setStoreName(MOCK_MENU.store_name + " (preview)");
        setCategories(MOCK_MENU.categories);
        setProducts(MOCK_MENU.products);
        setTables(MOCK_MENU.tables);
        setUsingMock(true);
      });
  }, []);

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  const filtered = useMemo(() => products.filter((p) => {
    if (selectedCategory !== null && p.category_id !== selectedCategory) return false;
    if (search.trim()) return p.name.toLowerCase().includes(search.toLowerCase().trim());
    return true;
  }), [products, selectedCategory, search]);

  const cartTotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  const addToCart = (p) => {
    const found = cart.find((it) => it.id === p.id);
    if (found) {
      setCart(cart.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it)));
    } else {
      setCart([...cart, { id: p.id, name: p.name, price: p.price, qty: 1 }]);
    }
    showToast(`Đã thêm ${p.name}`);
  };

  const updateQty = (id, delta) => {
    setCart(cart.map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0));
  };

  const loadOrders = () => {
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]));
  };

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    try {
      const r = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: selectedTable.id, order_type: "dine_in", payment_method: paymentMethod,
          items: cart.map((c) => ({ product_id: c.id, product_name: c.name, price: c.price, quantity: c.qty })),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lỗi");
      const tbl = await fetch("/api/tables").then((r) => r.json());
      setTables(tbl.tables || []);
      setShowCheckout(false);
      setCart([]);
      setToast(`Đã gửi order #${data.order_id}`);
      setTimeout(() => { setSelectedTable(null); setView("tables"); setToast(null); }, 1500);
    } catch (err) { showToast("Lỗi: " + err.message); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900">
      <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">☕</div>
          <div>
            <div className="font-bold text-gray-900">{storeName}</div>
            <div className="text-xs text-gray-500">{usingMock ? "Preview mode" : `Xin chào ${user.full_name || user.username}`}</div>
          </div>
        </div>
        <nav className="flex gap-2">
          <button onClick={() => setView("tables")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${view === "tables" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>🪑 Bàn</button>
          <button onClick={() => { setView("orders"); loadOrders(); }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${view === "orders" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>📋 Đơn hàng</button>
        </nav>
        <div className="flex items-center gap-3">
          <div className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">● Online</div>
          <button onClick={onLogout} className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200">🚪 Đăng xuất</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {view === "tables" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Sơ đồ bàn</h2>
                <div className="text-sm text-gray-500">
                  {tables.filter(t => t.status === 'empty').length} trống / {tables.filter(t => t.status === 'occupied').length} có khách
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {tables.map((t) => {
                  const occupied = t.status === "occupied";
                  return (
                    <button key={t.id}
                      onClick={() => { setSelectedTable(t); setCart([]); setSelectedCategory(null); setView("menu"); }}
                      className={`p-4 rounded-2xl border-2 text-left transition hover:scale-[1.02] ${
                        occupied ? "bg-red-50 border-red-300 hover:border-red-500" : "bg-emerald-50 border-emerald-300 hover:border-emerald-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">{t.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold text-white ${occupied ? "bg-red-500" : "bg-emerald-500"}`}>
                          {occupied ? "Có khách" : "Trống"}
                        </span>
                      </div>
                      {occupied && t.pending_order
                        ? <div className="text-sm text-red-700 font-semibold">Tạm tính: {formatVND(t.pending_order.total)}</div>
                        : <div className="text-sm text-emerald-700">Sẵn sàng order</div>}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {view === "menu" && selectedTable && (
            <>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <button onClick={() => { setSelectedTable(null); setView("tables"); setCart([]); }}
                    className="text-sm text-gray-500 hover:text-gray-900 mb-1">← Quay lại</button>
                  <h2 className="text-xl font-bold">Bàn: {selectedTable.name}</h2>
                </div>
                <input type="search" placeholder="🔍 Tìm món..." value={search} data-focus-key="menu-search"
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedCategory === null ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}>Tất cả</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                      selectedCategory === c.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
                    }`}>{c.name}</button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Không có sản phẩm</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map((p) => (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:shadow-md transition group">
                      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                      </div>
                      <div className="p-2">
                        <div className="font-semibold text-sm text-gray-800 line-clamp-2 mb-1">{p.name}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600 font-bold">{formatVND(p.price)}</span>
                          <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">+</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {view === "orders" && (
            <>
              <h2 className="text-xl font-bold mb-4">Đơn hàng gần đây</h2>
              {orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Chưa có đơn nào</div>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => {
                    const statusColor = o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700";
                    return (
                      <div key={o.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div>
                          <div className="font-semibold">#{o.id} - {o.table_name || "Mang đi"}</div>
                          <div className="text-xs text-gray-500">{o.created_at}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-orange-600">{formatVND(o.total)}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                            {o.status === "paid" ? "Đã thanh toán" : "Chờ"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {view === "menu" && selectedTable && (
          <aside className="w-80 bg-white border-l flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">🛒 Giỏ hàng</h3>
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold">{cartCount} món</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Chưa có món nào</div>
              ) : cart.map((it) => (
                <div key={it.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{it.name}</div>
                    <div className="text-xs text-orange-600 font-bold">{formatVND(it.price)}</div>
                  </div>
                  <button onClick={() => updateQty(it.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">−</button>
                  <span className="w-6 text-center font-semibold">{it.qty}</span>
                  <button onClick={() => updateQty(it.id, +1)} className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold">+</button>
                </div>
              ))}
            </div>
            {cart.length > 0 ? (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-gray-600 font-medium">Tổng cộng</span>
                  <span className="text-2xl font-bold text-orange-600">{formatVND(cartTotal)}</span>
                </div>
                <button onClick={() => setShowCheckout(true)}
                  className="w-full py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition">
                  Thanh toán
                </button>
              </div>
            ) : (
              <div className="p-4 border-t text-center text-gray-400 text-xs">Chọn món để bắt đầu</div>
            )}
          </aside>
        )}
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Thanh toán</h3>
            <div className="bg-gray-50 p-3 rounded-lg mb-4 space-y-1">
              {cart.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span>{it.qty}x {it.name}</span>
                  <span className="font-semibold">{formatVND(it.price * it.qty)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                <span>Tổng</span>
                <span className="text-orange-600">{formatVND(cartTotal)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Phương thức thanh toán</label>
              <div className="grid grid-cols-2 gap-2">
                {["cash", "transfer"].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`p-3 rounded-lg border-2 font-semibold transition ${
                      paymentMethod === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    {m === "cash" ? "💵 Tiền mặt" : "📱 Chuyển khoản"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCheckout(false)} className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={submitOrder} className="flex-1 py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed top-20 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">{toast}</div>}
    </div>
  );
}

// ============ Public: WelcomeOverlay ============
function WelcomeOverlay({ onDismiss, storeName, featuredProducts, step }) {
  const showFeatured = featuredProducts.length > 0 && step >= 2;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black p-4 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500 rounded-full opacity-20 animate-blob" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-yellow-500 rounded-full opacity-20 animate-blob animation-delay-2000" />
      <div className="relative max-w-md w-full text-center">
        <h1 className={"text-3xl md:text-5xl font-black mb-4 transition-all duration-700 bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent " + (step >= 1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
          {storeName}
        </h1>
        <p className={"text-yellow-100 text-lg mb-8 transition-all duration-700 " + (step >= 1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
          Xin được phục vụ quý khách
        </p>
        {showFeatured && (
          <div className="grid grid-cols-4 gap-3 mb-8 transition-all duration-700 translate-y-0 opacity-100">
            {featuredProducts.slice(0, 4).map((p, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
                <div className="aspect-square bg-primary-400 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="text-3xl">☕</div>}
                </div>
                <div className="text-white text-xs font-semibold line-clamp-2">{p.name}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onDismiss}
          className={"px-12 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 text-xl font-black rounded-2xl shadow-2xl hover:shadow-yellow-300/50 hover:scale-105 transition-all duration-700 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none")}>
          BẮT ĐẦU
        </button>
      </div>
    </div>
  );
}

// ============ Public: Modals ============
function CartModal({ cart, total, onClose, onUpdateQty, onEdit, onSubmit, isOrdering, orderSuccess }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold">Giỏ hàng của bạn</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="space-y-2 mb-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Giỏ hàng trống</div>
          ) : cart.map((it) => {
            const lineTotal = (it.product.price + it.toppings.reduce((s, t) => s + t.price, 0)) * it.quantity;
            return (
              <div key={it.tempId} className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{it.product.name}</div>
                    {it.size && <div className="text-xs text-primary-600 font-semibold">Size: {it.size.name}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQty(it.tempId, -1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 font-bold">−</button>
                    <span className="w-6 text-center font-semibold">{it.quantity}</span>
                    <button onClick={() => onUpdateQty(it.tempId, +1)} className="w-7 h-7 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-bold">+</button>
                  </div>
                </div>
                {it.toppings.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {it.toppings.map((t) => <span key={t.id} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">+{t.name}</span>)}
                  </div>
                )}
                {it.notes && <div className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400 rounded mb-1">📝 {it.notes}</div>}
                <div className="flex items-center justify-between">
                  <button onClick={() => onEdit(it.tempId)} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">⚙ Thêm topping / ghi chú</button>
                  <span className="text-primary-600 font-bold text-sm">{formatVND(lineTotal)}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t pt-3 sticky bottom-0 bg-white">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-700 font-semibold">Tổng cộng</span>
            <span className="text-2xl font-bold text-primary-600">{formatVND(total)}</span>
          </div>
          <button onClick={onSubmit} disabled={isOrdering || cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition shadow-lg ${
              isOrdering ? "bg-gray-400" : cart.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-primary-200"
            }`}>
            {isOrdering ? "Đang gửi..." : orderSuccess ? "✓ Đã gửi đơn!" : "Gửi đơn hàng"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SizeModal({ product, onConfirm, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-2">{product.name}</h3>
        <p className="text-gray-500 text-sm mb-4">Vui lòng chọn size</p>
        <div className="grid grid-cols-1 gap-2">
          {product.sizes.map((s) => (
            <button key={s.id} onClick={() => onConfirm(s)}
              className="p-3 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-between transition">
              <span className="font-bold text-lg">{s.name}</span>
              <span className="text-primary-600 font-bold">{formatVND(s.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ item, toppings, categories, onClose, onToggleTopping, onUpdateNotes }) {
  if (!item) return null;
  const category = categories.find((c) => c.id === item.product.category_id);
  const allowedIds = category?.allowed_toppings || [];
  const allowedToppings = allowedIds.length > 0
    ? toppings.filter((t) => allowedIds.includes(t.id))
    : toppings;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-t-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">{item.product.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="mb-4">
          <div className="text-sm font-semibold mb-2 text-gray-700">Topping</div>
          <div className="flex flex-wrap gap-2">
            {allowedToppings.length === 0
              ? <div className="text-gray-400 text-sm">Món này không có topping</div>
              : allowedToppings.map((t) => {
                  const selected = item.toppings.some((x) => x.id === t.id);
                  return (
                    <button key={t.id} onClick={() => onToggleTopping(t)}
                      className={`px-3 py-2 rounded-full text-sm font-medium border-2 transition ${
                        selected ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-white border-gray-200 hover:border-gray-300"
                      }`}>
                      {selected ? `✓ ${t.name} +${t.price.toLocaleString()}đ` : `+ ${t.name} +${t.price.toLocaleString()}đ`}
                    </button>
                  );
                })}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Ghi chú</label>
          <textarea rows={2} placeholder="VD: không đá, ít đường, cay ít..."
            value={item.notes || ""}
            data-focus-key={`public-notes-${item.tempId}`}
            onChange={(e) => onUpdateNotes(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
          />
        </div>
        <button onClick={onClose}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition">
          Xong
        </button>
      </div>
    </div>
  );
}

function TableGroupModal({ table, onChooseContinue, onChooseCallStaff }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-4xl">🍽️</div>
        <h2 className="text-xl font-black text-gray-800 mb-3">Bàn này đã được sử dụng</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          Bàn {table?.name} đã có đơn hàng được gọi từ trước. Vui lòng chọn 1 trong 2 lựa chọn:
        </p>
        <button onClick={onChooseContinue}
          className="w-full py-3 mb-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition">
          Tôi đang ngồi, gọi thêm món
        </button>
        <button onClick={onChooseCallStaff}
          className="w-full py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl transition">
          Tôi là khách mới, gọi nhân viên
        </button>
      </div>
    </div>
  );
}

function WaitingStaffScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md animate-in zoom-in-95">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-3xl animate-bounce-slow">🔔</div>
        <h2 className="text-2xl font-black text-gray-800 mb-3">Đã gọi nhân viên</h2>
        <p className="text-gray-700 leading-relaxed">
          Vui lòng chờ nhân viên đến để xử lý đơn hàng trước đó. Sau khi nhân viên xử lý xong, bạn có thể đặt món bình thường.
        </p>
      </div>
    </div>
  );
}

function MyOrderView({ items, onDelete, onReduce }) {
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-16 text-gray-400">
          <div className="text-6xl mb-4">📋</div>
          <p>Chưa có món nào trong đơn</p>
        </div>
      </div>
    );
  }
  const groups = {};
  items.forEach((it) => {
    const toppingKey = (it.toppings || []).slice().sort().join("|");
    const k = `${it.name}|${toppingKey}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(it);
  });
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      <div className="space-y-3">
        {Object.entries(groups).map(([k, list]) => {
          const first = list[0];
          const totalQty = list.reduce((s, it) => s + it.quantity, 0);
          const statusBadge = (s) => {
            if (s === "pending") return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Đã nhận món</span>;
            if (s === "processing") return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Đang làm</span>;
            if (s === "completed") return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Đã phục vụ</span>;
            return null;
          };
          return (
            <div key={k} className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {first.status === "pending" && (
                      <button onClick={() => onReduce(first.order_id, first.id, first.quantity)}
                        className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 font-bold">−</button>
                    )}
                    <span className="w-8 text-center font-bold">{totalQty}x</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{first.name}</div>
                    {first.size_name && <div className="text-xs text-primary-600 font-semibold">Size: {first.size_name}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(first.status)}
                  {first.status === "pending" && (
                    <button onClick={() => onDelete(first.order_id, first.id)}
                      className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center" title="Xóa món">🗑</button>
                  )}
                </div>
              </div>
              {(first.toppings || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {first.toppings.map((top, i) => <span key={i} className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">+{top}</span>)}
                </div>
              )}
              {first.notes && <div className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400 rounded mb-2">💬 {first.notes}</div>}
              <div className="text-right text-primary-600 font-bold text-lg">{formatVND(first.price * totalQty)}</div>
            </div>
          );
        })}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 p-6 shadow-2xl">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-white text-sm mb-1">{items.length} món đang chờ</p>
          <p className="text-white text-4xl font-black">{formatVND(total)}</p>
        </div>
      </div>
    </div>
  );
}

// ============ Public: PublicMenuView ============
function PublicMenuView({ tableId, onLogout }) {
  const [storeName, setStoreName] = useState("Đang tải...");
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_PREFIX + tableId) || "[]"); } catch { return []; }
  });
  const [activeView, setActiveView] = useState("menu");
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !sessionStorage.getItem(WELCOME_KEY));
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemTempId, setEditItemTempId] = useState(null);
  const [tableState, setTableState] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [waitingStaff, setWaitingStaff] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [requestToken, setRequestToken] = useState(() => localStorage.getItem(REQUEST_TOKEN_PREFIX + tableId) || null);
  const [lastSubmitNetworkFailed, setLastSubmitNetworkFailed] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Persist cart
  useEffect(() => {
    try { localStorage.setItem(CART_PREFIX + tableId, JSON.stringify(cart)); } catch {}
  }, [cart, tableId]);

  // Persist requestToken
  useEffect(() => {
    if (requestToken) localStorage.setItem(REQUEST_TOKEN_PREFIX + tableId, requestToken);
  }, [requestToken, tableId]);

  // Welcome animation steps
  useEffect(() => {
    if (!showWelcome) return;
    sessionStorage.setItem(WELCOME_KEY, "true");
    const t1 = setTimeout(() => setWelcomeStep(1), 100);
    const t2 = setTimeout(() => setWelcomeStep(2), 600);
    const t3 = setTimeout(() => setWelcomeStep(3), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showWelcome]);

  // Fetch menu
  useEffect(() => {
    (async () => {
      try {
        const [menuRes, settingsRes] = await Promise.all([
          fetch(`/api/public/menu/${tableId}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
          fetch(`/api/settings`).then((r) => r.ok ? r.json() : {}),
        ]);
        const prods = (menuRes.products || []).filter((p) => !p.is_topping);
        const tops = (menuRes.products || []).filter((p) => p.is_topping);
        const fp = settingsRes.featured_products || [];
        document.title = menuRes.store?.name || "Menu POS";
        setStoreName(menuRes.store?.name || "POS Demo");
        setTable(menuRes.table);
        setCategories(menuRes.categories || []);
        setProducts(prods);
        setToppings(tops);
        setFeaturedProducts((menuRes.products || []).filter((p) => fp.includes(p.id)));
        setLoading(false);
      } catch (err) {
        setError(err.message || "Không thể tải menu");
        setLoading(false);
      }
    })();
  }, [tableId]);

  // Polling table-state every 10s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/public/table-state/${tableId}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setTableState((prev) => {
          if (prev?.has_pending_order && !data.has_pending_order) {
            try { localStorage.removeItem(SESSION_PREFIX + tableId); } catch {}
            setShowGroupModal(false);
            setWaitingStaff(false);
          }
          return data;
        });
        if (data.has_pending_order) {
          const mySession = localStorage.getItem(SESSION_PREFIX + tableId);
          const isMyOrder = mySession && mySession === data.customer_session_id;
          if (!isMyOrder && !waitingStaff) setShowGroupModal(true);
          else setShowGroupModal(false);
        } else {
          setShowGroupModal(false);
        }
      } catch (err) { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tableId, waitingStaff]);

  // Polling items when in myorder view
  useEffect(() => {
    if (activeView !== "myorder") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/public/items/${tableId}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setMyItems(Array.isArray(data) ? data : []);
      } catch (err) { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeView, tableId]);

  // Filter products
  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory !== null) list = list.filter((p) => p.category_id === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Generate new request token
  const newRequestToken = useCallback(() => {
    const t = genToken();
    setRequestToken(t);
    return t;
  }, []);

  // Cart helpers
  const addToCart = (product, size) => {
    if (product.sizes && product.sizes.length > 0 && !size) {
      setSelectedProductForSize(product);
      setShowSizeModal(true);
      return;
    }
    const existing = cart.findIndex((item) =>
      item.product.id === product.id &&
      item.toppings.length === 0 &&
      ((!item.size && !size) || (item.size && size && item.size.id === size.id)) &&
      !item.notes
    );
    const itemPrice = size ? size.price : product.price;
    const productWithPrice = { ...product, price: itemPrice };
    if (existing >= 0) {
      setCart(cart.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { tempId: genToken(), product: productWithPrice, size: size || null, quantity: 1, toppings: [], notes: "" }]);
    }
    newRequestToken();
    addToast(`Đã thêm ${product.name}`);
  };

  const updateQty = (tempId, delta) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, quantity: it.quantity + delta } : it).filter((it) => it.quantity > 0));
    newRequestToken();
  };

  const toggleTopping = (tempId, topping) => {
    setCart(cart.map((it) => {
      if (it.tempId !== tempId) return it;
      const idx = it.toppings.findIndex((t) => t.id === topping.id);
      const newToppings = idx >= 0 ? it.toppings.filter((_, i) => i !== idx) : [...it.toppings, topping];
      return { ...it, toppings: newToppings };
    }));
    newRequestToken();
  };

  const updateNotes = (tempId, notes) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, notes: notes || "" } : it));
    newRequestToken();
  };

  const confirmSize = (size) => {
    if (!selectedProductForSize) return;
    addToCart(selectedProductForSize, size);
    setShowSizeModal(false);
    setSelectedProductForSize(null);
  };

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  const cartTotal = cart.reduce((sum, it) => {
    const productTotal = it.product.price * it.quantity;
    const toppingTotal = it.toppings.reduce((s, t) => s + t.price, 0) * it.quantity;
    return sum + productTotal + toppingTotal;
  }, 0);
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);

  // Submit order
  const submitOrder = async () => {
    if (cart.length === 0) { addToast("Vui lòng chọn ít nhất 1 món"); return; }
    setIsOrdering(true);
    const sessionId = localStorage.getItem(SESSION_PREFIX + tableId);
    const orderData = {
      table_id: tableId, table_position: "A",
      request_token: requestToken, retry_after_failure: lastSubmitNetworkFailed,
      items: cart.map((it) => ({
        product_id: it.product.id, quantity: it.quantity,
        toppings: it.toppings.map((t) => t.id),
        size_id: it.size?.id, notes: it.notes || "",
      })),
    };
    if (sessionId) orderData.customer_session_id = sessionId;
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) {
        let data; try { data = await res.json(); } catch { data = {}; }
        if (res.status === 409 || res.status === 403) {
          try { localStorage.removeItem(SESSION_PREFIX + tableId); } catch {}
          setShowGroupModal(true);
          setShowCartModal(false);
          setTableState({ has_pending_order: true, customer_session_id: null });
          setLastSubmitNetworkFailed(false);
          addToast(data.message || "Phiên đặt món đã hết hạn");
          setIsOrdering(false);
          return;
        }
        newRequestToken();
        setLastSubmitNetworkFailed(false);
        addToast(data.message || "Lỗi gửi đơn");
        setIsOrdering(false);
        return;
      }
      const data = await res.json();
      if (data.customer_session_id) localStorage.setItem(SESSION_PREFIX + tableId, data.customer_session_id);
      setOrderSuccess(true);
      setIsOrdering(false);
      setLastSubmitNetworkFailed(false);
      setTimeout(() => {
        try { localStorage.removeItem(CART_PREFIX + tableId); } catch {}
        setCart([]); setRequestToken(null); setOrderSuccess(false);
        setShowCartModal(false); setActiveView("myorder");
        // Trigger items fetch by setting up
      }, 2000);
    } catch (err) {
      setIsOrdering(false);
      setLastSubmitNetworkFailed(true);
      addToast("Mạng không ổn định, vui lòng thử lại. Đơn sẽ không bị gửi trùng.");
    }
  };

  const deleteItem = async (orderId, itemId) => {
    if (!confirm("Bạn có chắc muốn hủy món này?")) return;
    try {
      await fetch(`/api/public/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
      // Refresh items
      const r = await fetch(`/api/public/items/${tableId}`);
      if (r.ok) setMyItems(await r.json());
    } catch (err) { addToast("Lỗi xóa món"); }
  };

  const reduceQty = async (orderId, itemId, currentQty) => {
    try {
      if (currentQty <= 1) {
        if (!confirm("Bạn có chắc muốn hủy món này?")) return;
        await fetch(`/api/public/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/public/orders/${orderId}/items/${itemId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: currentQty - 1 }),
        });
      }
      const r = await fetch(`/api/public/items/${tableId}`);
      if (r.ok) setMyItems(await r.json());
    } catch (err) { addToast("Lỗi cập nhật"); }
  };

  const callStaff = async () => {
    try {
      await fetch("/api/public/call-staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId, reason: "new_customer" }),
      });
      setWaitingStaff(true);
      setShowGroupModal(false);
    } catch (err) { addToast("Gọi nhân viên thất bại"); }
  };

  const chooseContinue = () => {
    const sessionId = tableState?.customer_session_id;
    if (sessionId) localStorage.setItem(SESSION_PREFIX + tableId, sessionId);
    setShowGroupModal(false);
  };

  const dismissWelcome = () => setShowWelcome(false);

  // Edit item helpers
  const editItem = cart.find((it) => it.tempId === editItemTempId);

  // Render
  if (waitingStaff) return <WaitingStaffScreen />;
  if (showGroupModal && tableState?.has_pending_order) {
    return <TableGroupModal table={table} onChooseContinue={chooseContinue} onChooseCallStaff={callStaff} />;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-bold">Đang tải menu...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-red-600 font-bold mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32">
      <header className="sticky top-0 z-10 bg-primary-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="text-xs text-primary-100 mb-1">📍 {table?.name || ""}</div>
          <h1 className="text-2xl font-black">{storeName}</h1>
        </div>
      </header>

      <div className="sticky-top-72 bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex gap-4">
          <button onClick={() => setActiveView("menu")}
            className={`py-3 px-2 border-b-2 font-bold text-sm transition ${activeView === "menu" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            MENU
          </button>
          <button onClick={() => setActiveView("myorder")}
            className={`py-3 px-2 border-b-2 font-bold text-sm transition ${activeView === "myorder" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-600 hover:text-gray-900"}`}>
            MÓN ĐÃ CHỌN {myItems.length > 0 ? `(${myItems.length})` : ""}
          </button>
        </div>
      </div>

      {activeView === "menu" ? (
        <>
          <div className="sticky-top-120 bg-white border-b p-3">
            <div className="max-w-4xl mx-auto">
              <input type="search" placeholder="🔍 Tìm món..." value={searchQuery} data-focus-key="public-search"
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="bg-white border-b p-3">
            <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto">
              <button onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${selectedCategory === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                Tất cả
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${selectedCategory === c.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <main className="max-w-4xl mx-auto p-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Không có sản phẩm</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {filtered.map((p) => {
                  const hasSizes = p.sizes && p.sizes.length > 0;
                  return (
                    <button key={p.id} onClick={() => addToCart(p)}
                      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-lg transition">
                      <div className="aspect-square bg-gray-100 overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                      </div>
                      <div className="p-2">
                        <h3 className="font-semibold text-xs text-gray-800 line-clamp-2 mb-1 min-h-[2rem]">{p.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-primary-600 font-bold text-sm">
                            {hasSizes ? `Từ ${formatVND(Math.min(...p.sizes.map((s) => s.price)))}` : formatVND(p.price)}
                          </span>
                          <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">+</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>

          {cartCount > 0 && (
            <button onClick={() => setShowCartModal(true)}
              className="fixed bottom-4 right-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl z-30 flex items-center gap-2 animate-pulse-ring animate-bounce-slow">
              <span className="text-2xl animate-wiggle">🛒</span>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">{cartCount}</span>
            </button>
          )}
        </>
      ) : (
        <MyOrderView items={myItems} onDelete={deleteItem} onReduce={reduceQty} />
      )}

      {showCartModal && (
        <CartModal cart={cart} total={cartTotal} onClose={() => setShowCartModal(false)}
          onUpdateQty={updateQty} onEdit={(tempId) => { setEditItemTempId(tempId); setShowEditModal(true); }}
          onSubmit={submitOrder} isOrdering={isOrdering} orderSuccess={orderSuccess}
        />
      )}
      {showSizeModal && (
        <SizeModal product={selectedProductForSize} onConfirm={confirmSize} onClose={() => { setShowSizeModal(false); setSelectedProductForSize(null); }} />
      )}
      {showEditModal && editItem && (
        <EditItemModal item={editItem} toppings={toppings} categories={categories}
          onClose={() => { setShowEditModal(false); setEditItemTempId(null); }}
          onToggleTopping={(t) => toggleTopping(editItem.tempId, t)}
          onUpdateNotes={(notes) => updateNotes(editItem.tempId, notes)}
        />
      )}
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} storeName={storeName} featuredProducts={featuredProducts} step={welcomeStep} />}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right">{t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ App Root ============
function App() {
  const [mode, setMode] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Init: check URL path
  useEffect(() => {
    const m = window.location.pathname.match(/^\/menu\/(\d+)/);
    if (m) {
      setMode("public");
      setAuthLoading(false);
    } else {
      // Cashier mode
      const token = localStorage.getItem(TOKEN_KEY);
      const stored = localStorage.getItem(USER_KEY);
      if (!token) { setAuthLoading(false); return; }
      authVerify(token).then((u) => {
        if (u) setUser(u);
        else if (stored) setUser(JSON.parse(stored));
        setAuthLoading(false);
      });
    }
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await authLogout(token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Đang tải...</div></div>;
  }

  if (mode === "public") {
    const m = window.location.pathname.match(/^\/menu\/(\d+)/);
    return <PublicMenuView tableId={parseInt(m[1], 10)} onLogout={() => {}} />;
  }

  if (!user) return <LoginView onLogin={setUser} />;
  return <PosApp user={user} onLogout={handleLogout} />;
}

// ============ Mount ============
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);