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
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <aside className="hidden md:flex flex-col items-center py-6 bg-white border-r shadow-sm w-20">
        <button className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center text-2xl shadow-md" title="POS">🛒</button>
        <div className="mt-8 flex-1 flex flex-col items-center gap-3">
          <button className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-2xl hover:bg-gray-200" title="Bếp">👨‍🍳</button>
          <button className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-2xl hover:bg-gray-200" title="Pha chế">🥤</button>
        </div>
        <button className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-2xl hover:bg-gray-200" title="Cài đặt">⚙️</button>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">☕</div>
          <div>
            <div className="font-bold text-gray-900">{storeName}</div>
            <div className="text-xs text-gray-500">{usingMock ? "Preview mode" : `Xin chào ${user.full_name || user.username}`}</div>
          </div>
        </div>
        <nav className="flex gap-2">
          <button onClick={() => setView("orders")}
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
              <div className="flex gap-2 mb-6">
                <button className="px-5 py-2 rounded-full bg-red-600 text-white font-bold text-sm shadow-sm">🪑 Sơ đồ bàn</button>
                <button className="px-5 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50">📦 Mang về</button>
                <button className="px-5 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50">🚚 Ship</button>
              </div>
              <div className="grid md:grid-cols-5 gap-4">
                <button onClick={() => { setSelectedTable({ id: 0, name: "Mang về", status: "takeaway" }); setCart([]); setView("menu"); }}
                  className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 text-left hover:border-orange-500 transition relative">
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-orange-500"></div>
                  <div className="font-black text-orange-600 text-base mb-3">ORDER NHANH</div>
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div className="text-xs text-orange-600 font-semibold tracking-wider">MANG VỀ / TẠI QUẦY</div>
                </button>
                {tables.map((t) => {
                  const occupied = t.status === "occupied";
                  const isSelected = selectedTable?.id === t.id;
                  return (
                    <button key={t.id}
                      onClick={() => { setSelectedTable(t); setCart([]); setSelectedCategory(null); setView("menu"); }}
                      className={`bg-white border-2 rounded-2xl p-5 text-left transition relative ${
                        isSelected ? "border-red-500 shadow-md" : occupied ? "border-red-200 hover:border-red-400" : "border-gray-200 hover:border-gray-400"
                      }`}>
                      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${occupied ? "bg-red-400" : "bg-gray-300"}`}></div>
                      <div className={`font-black text-base mb-3 ${isSelected ? "text-red-600" : "text-blue-900"}`}>{t.name}</div>
                      {occupied && t.pending_order ? (
                        <div className="space-y-1">
                          <div className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-600 rounded inline-block">{formatVND(t.pending_order.total)}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1"><span>⏱</span><span>DÙNG 24PH</span></div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">{occupied ? "Đang phục vụ" : "Bàn trống"}</div>
                      )}
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
    </div>
  );
}

// ============ Public: WelcomeOverlay ============
function WelcomeOverlay({ onDismiss, storeName, featuredProducts, step, facebookUrl }) {
  const showFeatured = featuredProducts.length > 0 && step >= 2;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black text-white">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full opacity-10" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')"}}></div>
        <div className="absolute -top-20 -left-20 h-64 w-64 animate-blob rounded-full bg-primary-500 opacity-20 blur-3xl" />
        <div className="animation-delay-2000 absolute -bottom-20 -right-20 h-64 w-64 animate-blob rounded-full bg-yellow-500 opacity-20 blur-3xl" />
      </div>

      <div className={"relative px-6 text-center transform transition-all duration-700 delay-100 ease-out " + (step >= 2 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
        {/* Store name với gradient text italic */}
        <h1 className="bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-3xl font-black italic text-transparent drop-shadow-sm md:text-5xl">
          {storeName}
        </h1>
        <div className="mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        <p className="mb-6 text-xl font-light leading-relaxed text-primary-100 md:text-2xl">
          Xin được phục vụ
        </p>

        {/* Featured products */}
        {showFeatured && (
          <div className={"mb-6 transform transition-all duration-700 delay-200 " + (step >= 2 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
              <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">Món mới</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {featuredProducts.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden w-36 shadow-xl">
                  <div className="aspect-square bg-white/5 flex items-center justify-center">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="text-3xl text-white/40">🍲</div>}
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1">{p.name}</p>
                    <p className="text-yellow-400 font-black text-sm">{formatVND(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BẮT ĐẦU button với ChevronRight + animate-ping */}
        <div className={"transform transition-all duration-700 delay-200 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
          <button onClick={onDismiss}
            className="group relative mx-auto flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-12 py-4 text-xl font-black text-black shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <span>BẮT ĐẦU</span>
            <span className="transition-transform group-hover:translate-x-1 text-2xl">→</span>
            <div className="absolute inset-0 animate-ping rounded-full ring-2 ring-white/50 opacity-50"></div>
          </button>
          <p className="mt-4 text-sm text-white/50">Nhấn để gọi món</p>
        </div>
      </div>

      {/* Bottom: Facebook link + Menu điện tử */}
      <div className={"absolute bottom-6 flex flex-col items-center space-y-3 transform transition-all duration-700 delay-500 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
        {facebookUrl && (
          <a href={facebookUrl} target="_blank" rel="noreferrer"
            className="flex items-center space-x-3 rounded-full border border-blue-400/30 bg-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/40">
            <span>Kết bạn Facebook để đặt ship khi cần</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
        )}
        <p className="flex items-center justify-center gap-2 text-xs font-light uppercase tracking-widest text-white/40">
          Menu điện tử cho
          <span className="font-bold text-yellow-400">{storeName}</span>
        </p>
      </div>
    </div>
  );
}

// ============ Public: Modals ============
function CartModal({ cart, total, onClose, onUpdateQty, onEdit, onSubmit, isOrdering, orderSuccess, onRemove }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-h-[80vh] rounded-t-3xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-black">Giỏ hàng của bạn</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Giỏ hàng trống</div>
          ) : cart.map((it, idx) => {
            const hasToppings = it.toppings.length > 0;
            const hasNotes = it.notes && it.notes.trim().length > 0;
            return (
              <div key={it.tempId} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-800 text-sm">
                      {it.product.name} {it.size && <span className="text-primary-600 font-normal">({it.size.name})</span>}
                    </h3>
                    <p className="text-primary-600 font-bold text-sm">{it.product.price.toLocaleString()}đ</p>
                    <button onClick={() => onEdit(it.tempId)} className="mt-2 w-full text-left">
                      {hasToppings ? (
                        <div className="flex items-start gap-1.5 mb-1.5">
                          <span className="text-primary-600 flex-shrink-0 mt-0.5">🧩</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-wider mb-0.5">Topping</p>
                            <div className="flex flex-wrap gap-1">
                              {it.toppings.map((t, ti) => (
                                <span key={ti} className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">+{t.name}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-gray-400 hover:text-primary-600 transition">
                          <span>🧩</span>
                          <span className="text-[10px] font-black uppercase tracking-wider">Topping:</span>
                          <span className="italic font-medium">Thêm topping...</span>
                        </div>
                      )}
                      {hasNotes ? (
                        <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                          <span className="text-yellow-600 flex-shrink-0 mt-0.5">💬</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider mb-0.5">Ghi chú</p>
                            <p className="text-xs text-yellow-700 font-medium leading-snug">{it.notes}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-gray-400 hover:text-primary-600 transition">
                          <span>💬</span>
                          <span className="text-[10px] font-black uppercase tracking-wider">Ghi chú:</span>
                          <span className="italic font-medium">Thêm ghi chú...</span>
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button onClick={() => onUpdateQty(it.tempId, -1)} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold">−</button>
                    <span className="font-black w-8 text-center">{it.quantity}</span>
                    <button onClick={() => onUpdateQty(it.tempId, +1)} className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
                <button onClick={() => onRemove(it.tempId)}
                  className="mt-3 text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-wider">
                  Xóa món
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-600">Tổng cộng:</span>
            <span className="text-2xl font-black text-primary-600">{total.toLocaleString()}đ</span>
          </div>
          <button onClick={onSubmit} disabled={isOrdering || orderSuccess}
            className="w-full bg-primary-600 text-white py-4 rounded-xl font-black text-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center space-x-2">
            {orderSuccess ? (
              <>
                <span className="text-2xl">✓</span>
                <span>Đã gửi đơn!</span>
              </>
            ) : (
              <span>{isOrdering ? "Đang gửi..." : "Gửi đơn hàng"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SizeModal({ product, onConfirm, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-black text-gray-800 text-center uppercase tracking-tight">Chọn kích cỡ</h3>
          <p className="text-xs text-gray-500 text-center font-bold">{product.name}</p>
        </div>
        <div className="p-6 space-y-3">
          {product.sizes.map((s) => (
            <button key={s.id} onClick={() => onConfirm(s)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all group">
              <span className="font-black text-gray-800 group-hover:text-primary-700">{s.name}</span>
              <span className="font-black text-primary-600">{s.price.toLocaleString()}đ</span>
            </button>
          ))}
        </div>
        <div className="p-6 bg-gray-50 border-t">
          <button onClick={onClose} className="w-full py-3 bg-white border text-gray-600 font-bold rounded-xl uppercase hover:bg-gray-100 transition">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ item, toppings, categories, onClose, onToggleTopping, onUpdateNotes }) {
  if (!item) return null;
  const category = categories.find((c) => c.id === item.product.category_id);
  const allowedToppings = (category?.allow_all_toppings !== false)
    ? toppings
    : (category?.allowed_toppings?.length > 0
        ? toppings.filter((t) => category.allowed_toppings.includes(t.id))
        : []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative bg-white w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-800">Tuỳ chỉnh món</h3>
            <p className="text-sm font-bold text-gray-500">{item.product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {allowedToppings.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-800 mb-3">Chọn Topping</h4>
              <div className="grid grid-cols-2 gap-2">
                {allowedToppings.map((t) => {
                  const selected = item.toppings.find((x) => x.id === t.id);
                  return (
                    <button key={t.id} onClick={() => onToggleTopping(t)}
                      className={`p-3 rounded-xl text-left text-sm font-bold transition border ${selected ? "bg-primary-600 text-white border-primary-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}>
                      <div>{t.name}</div>
                      <div className={`text-xs mt-0.5 ${selected ? "text-primary-100" : "text-gray-400"}`}>+{t.price.toLocaleString()}đ</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-sm font-black text-gray-800 mb-3">Ghi chú</h4>
            <textarea rows={2} placeholder="VD: không đá, ít đường, cay ít..."
              value={item.notes || ""}
              onChange={(e) => onUpdateNotes(e.target.value)}
              data-focus-key={`public-notes-${item.tempId}`}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose}
            className="w-full py-4 bg-primary-600 text-white rounded-xl font-black text-base hover:bg-primary-700 transition">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

function TableGroupModal({ table, onChooseContinue, onChooseCallStaff }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-black text-gray-800 mb-3">
          Bàn này đã có món được gọi từ trước
        </h2>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Nếu bạn đang ngồi và muốn gọi thêm món, vui lòng chọn bên dưới.
          Nếu bạn là khách mới, hãy gọi nhân viên đến để xử lý đơn hàng
          trước khi đặt món.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onChooseContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            Tôi đang ngồi, gọi thêm món
          </button>
          <button onClick={onChooseCallStaff}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors">
            Tôi là khách mới, gọi nhân viên
          </button>
        </div>
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
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-6xl mb-4 text-gray-300">📋</div>
          <p className="text-gray-500 font-bold">Chưa có món nào</p>
          <p className="text-gray-400 text-sm mt-2">Món đã chọn sẽ hiện ở đây</p>
        </div>
      </div>
    );
  }
  // Group items by name + toppings
  const groups = {};
  items.forEach((it) => {
    const toppingKey = (it.toppings || []).slice().sort().join(",");
    const k = `${it.name}|${toppingKey}`;
    if (groups[k]) {
      groups[k].quantity = (groups[k].quantity || 0) + it.quantity;
      groups[k].total_price = (groups[k].total_price || 0) + it.price * it.quantity;
      groups[k].items.push(it);
    } else {
      groups[k] = { ...it, quantity: it.quantity, total_price: it.price * it.quantity, items: [it] };
    }
  });
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

  const statusBadge = (s) => {
    if (s === "pending") return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center space-x-1"><span>✓</span><span>Đã nhận món</span></span>;
    if (s === "processing") return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center space-x-1"><span>👨‍🍳</span><span>Đang làm</span></span>;
    if (s === "completed") return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center space-x-1"><span>✓</span><span>Đã phục vụ</span></span>;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="space-y-3">
        {Object.values(groups).map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {item.status === "pending" && (
                  <button onClick={() => onReduce(item.order_id, item.id, item.quantity)}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs font-black rounded hover:bg-red-200 active:scale-95 transition-all">
                    −
                  </button>
                )}
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-black rounded">
                  {item.quantity}x
                </span>
                <div className="flex flex-col">
                  <h3 className="font-black text-gray-800">{item.name}</h3>
                  {item.size_name && <span className="text-xs text-primary-600 font-bold">Size: {item.size_name}</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {statusBadge(item.status)}
                {item.status === "pending" && (
                  <button onClick={() => onDelete(item.order_id, item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hủy món">
                    🗑
                  </button>
                )}
              </div>
            </div>
            {item.toppings && item.toppings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.toppings.map((topping, i) => (
                  <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">+{topping}</span>
                ))}
              </div>
            )}
            {item.notes && (
              <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                <p className="text-xs text-yellow-700 font-medium flex items-start">
                  <span className="mr-1">💬</span>
                  <span>{item.notes}</span>
                </p>
              </div>
            )}
            <div className="text-right mt-2 font-black text-gray-800">{item.total_price.toLocaleString()}đ</div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-2xl p-6 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-primary-100 font-bold uppercase tracking-wide">Tổng cộng</p>
            <p className="text-sm text-primary-200 mt-1">{items.length} món đang chờ</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-white">{total.toLocaleString()}đ</p>
          </div>
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
  const [facebookUrl, setFacebookUrl] = useState("");
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
          fetch(`/api/public/menu/${tableId}?_=${Date.now()}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
          fetch(`/api/settings?_=${Date.now()}`).then((r) => r.ok ? r.json() : {}),
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
        setFacebookUrl(settingsRes.facebook_url || "");
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
        const r = await fetch(`/api/public/table-state/${tableId}?_=${Date.now()}`);
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
        const r = await fetch(`/api/public/items/${tableId}?_=${Date.now()}`);
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

  const removeItem = (tempId) => {
    setCart(cart.filter((it) => it.tempId !== tempId));
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
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {table?.name && <p className="text-primary-100 font-bold">{table.name}</p>}
          <div className="relative mt-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔍</span>
            <input
              type="text"
              placeholder="Tìm kiếm món..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-focus-key="public-search"
              className="w-full pl-10 pr-10 py-2 rounded-full bg-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-lg font-bold">
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-[72px] bg-white border-b z-10">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={() => setActiveView("menu")}
            className={`flex-1 py-3 font-black text-sm transition ${activeView === "menu" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            MENU
          </button>
          <button onClick={() => setActiveView("myorder")}
            className={`flex-1 py-3 font-black text-sm transition flex items-center justify-center space-x-2 ${activeView === "myorder" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            <span>📋</span>
            <span>MÓN ĐÃ CHỌN</span>
          </button>
        </div>
      </div>

      {activeView === "menu" ? (
        <>
          <div className="sticky top-[120px] bg-white border-b z-10">
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2 p-3">
              <button onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                Tất cả
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === c.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <main className="max-w-4xl mx-auto p-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Không có sản phẩm</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filtered.map((p) => {
                  const hasSizes = p.sizes && p.sizes.length > 0;
                  return (
                    <div key={p.id} onClick={() => addToCart(p)}
                      className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform">
                      <div className="relative w-full bg-gray-50" style={{paddingBottom: "100%"}}>
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} loading="lazy" decoding="async"
                            className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-2xl">🍽️</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight">{p.name}</h3>
                        <p className="text-primary-600 font-black text-sm mt-1">
                          {hasSizes ? "Từ " + Math.min(...p.sizes.map(s => s.price)).toLocaleString() + "đ" : p.price.toLocaleString() + "đ"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {cart.length > 0 && (
            <button onClick={() => setShowCartModal(true)}
              className="fixed bottom-4 right-4 bg-primary-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 font-black z-20 animate-bounce-slow"
              style={{boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)", animation: "bounce 2s infinite, pulse-ring 1.5s ease-out infinite"}}>
              <span className="text-2xl animate-wiggle">🛒</span>
              <div className="flex flex-col items-start">
                <span className="text-xs text-primary-200">{cart.length} món</span>
                <span className="text-sm">{cartTotal.toLocaleString()}đ</span>
              </div>
            </button>
          )}
        </>
      ) : (
        <MyOrderView items={myItems} onDelete={deleteItem} onReduce={reduceQty} />
      )}

      {showCartModal && (
        <CartModal cart={cart} total={cartTotal} onClose={() => setShowCartModal(false)}
          onUpdateQty={updateQty} onEdit={(tempId) => { setEditItemTempId(tempId); setShowEditModal(true); }}
          onRemove={removeItem}
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
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} storeName={storeName} featuredProducts={featuredProducts} step={welcomeStep} facebookUrl={facebookUrl} />}

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