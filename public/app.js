/**
 * POS Demo - plain JS, không React, không JSX
 * - Login view (giống Login.jsx gốc)
 * - Auth gate: chưa đăng nhập → Login
 * - PosApp sau khi login
 *
 * Re-render thủ công qua setState() + render()
 */

function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") el.className = v;
    else if (k.startsWith("on")) el[k.toLowerCase()] = v;
    else if (k === "htmlFor") el.setAttribute("for", v);
    else if (v != null && v !== false) el.setAttribute(k, v);
  });
  children.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.appendChild(typeof c === "string" || typeof c === "number"
      ? document.createTextNode(String(c))
      : c);
  });
  return el;
}

// ============ State ============
const TOKEN_KEY = "pos_demo_token";
const USER_KEY = "pos_demo_user";

const state = {
  // Auth
  authLoading: true,
  user: null,
  loginForm: { username: "admin", password: "", error: "", loading: false },

  // PosApp
  view: "tables",
  storeName: "Đang tải...",
  categories: [],
  products: [],
  tables: [],
  orders: [],
  selectedTable: null,
  selectedCategory: null,
  search: "",
  cart: [],
  showCheckout: false,
  paymentMethod: "cash",
  usingMock: false,
  toast: null,
  toastTimer: null,
};

function setState(patch) {
  Object.assign(state, patch);
  render();
}

// ============ MOCK fallback ============
const MOCK = {
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
    { id: 3, name: "Bàn 3", status: "occupied", pending_order: { total: 95000 } },
    { id: 4, name: "Bàn 4", status: "empty" },
    { id: 5, name: "Bàn 5", status: "empty" },
    { id: 6, name: "Bàn 6", status: "empty" },
    { id: 7, name: "Bàn 7", status: "occupied", pending_order: { total: 45000 } },
    { id: 8, name: "Bàn 8", status: "empty" },
  ],
};

// ============ Login View ============
function LoginView() {
  const { username, password, error, loading } = state.loginForm;

  const onSubmit = async (e) => {
    e.preventDefault();
    setState({
      loginForm: { ...state.loginForm, error: "", loading: true },
    });
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setState({
          loginForm: { ...state.loginForm, error: data.message || "Đăng nhập thất bại", loading: false },
        });
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setState({ user: data.user, loginForm: { username: "admin", password: "", error: "", loading: false } });
    } catch (err) {
      setState({
        loginForm: { ...state.loginForm, error: "Lỗi mạng: " + err.message, loading: false },
      });
    }
  };

  return h("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-700 p-4" },
    h("form", { onSubmit, className: "bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md" },
      h("div", { className: "flex flex-col items-center mb-8" },
        h("div", { className: "bg-orange-100 p-4 rounded-full mb-4" },
          h("div", { className: "w-8 h-8 flex items-center justify-center text-orange-600 text-3xl font-bold" }, "🔐"),
        ),
        h("h1", { className: "text-3xl font-bold text-gray-800" }, "F&B POS"),
        h("p", { className: "text-gray-500 mt-2 text-center" }, "Đăng nhập để bắt đầu phiên làm việc"),
      ),
      h("div", { className: "space-y-6" },
        h("div", {},
          h("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Tên đăng nhập"),
          h("input", {
            type: "text", value: username,
            oninput: (e) => setState({ loginForm: { ...state.loginForm, username: e.target.value } }),
            className: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none",
            placeholder: "admin", required: true,
          }),
        ),
        h("div", {},
          h("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Mật khẩu"),
          h("input", {
            type: "password", value: password,
            oninput: (e) => setState({ loginForm: { ...state.loginForm, password: e.target.value } }),
            className: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none",
            placeholder: "••••••••", required: true,
          }),
        ),
        error ? h("div", { className: "bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center" }, error) : null,
        h("button", {
          type: "submit", disabled: loading,
          className: `w-full text-white py-3 rounded-xl font-bold transition shadow-lg ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700 active:scale-95"
          }`,
        }, loading ? "Đang đăng nhập..." : "Đăng Nhập"),
        h("div", { className: "bg-blue-50 text-blue-700 p-3 rounded-lg text-xs" },
          h("div", { className: "font-semibold mb-1" }, "Tài khoản demo:"),
          h("div", {}, "Tên đăng nhập: admin"),
          h("div", {}, "Mật khẩu: admin123"),
        ),
      ),
      h("div", { className: "mt-8 text-center text-gray-400 text-sm" }, "© 2026 Premium POS System"),
    ),
  );
}

// ============ PosApp (sau login) ============
function PosApp() {
  // Load menu + tables một lần
  if (state.categories.length === 0 && !state.usingMock) {
    fetchMenuAndTables();
  }

  const filtered = state.products.filter((p) => {
    if (state.selectedCategory !== null && p.category_id !== state.selectedCategory) return false;
    if (state.search.trim()) {
      return p.name.toLowerCase().includes(state.search.toLowerCase().trim());
    }
    return true;
  });

  const cartTotal = state.cart.reduce((s, it) => s + it.price * it.qty, 0);
  const cartCount = state.cart.reduce((s, it) => s + it.qty, 0);

  const wrap = h("div", { className: "flex flex-col h-screen bg-gray-50 font-sans text-gray-900" });

  // Header
  const header = h("header", { className: "bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg" }, "☕"),
      h("div", {},
        h("div", { className: "font-bold text-gray-900" }, state.storeName),
        h("div", { className: "text-xs text-gray-500" },
          state.usingMock ? "Preview mode" : `Xin chào ${state.user.full_name || state.user.username}`),
      ),
    ),
    h("nav", { className: "flex gap-2" },
      h("button", {
        onclick: () => setState({ view: "tables" }),
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${state.view === "tables" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`,
      }, "🪑 Bàn"),
      h("button", {
        onclick: () => { setState({ view: "orders" }); loadOrders(); },
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${state.view === "orders" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`,
      }, "📋 Đơn hàng"),
    ),
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium" }, "● Online"),
      h("button", {
        onclick: handleLogout,
        className: "text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200",
      }, "🚪 Đăng xuất"),
    ),
  );
  wrap.appendChild(header);

  const main = h("div", { className: "flex-1 flex overflow-hidden" });
  const leftPane = h("div", { className: "flex-1 overflow-y-auto p-4 md:p-6" });

  if (state.view === "tables") {
    leftPane.appendChild(h("div", { className: "mb-4 flex items-center justify-between" },
      h("h2", { className: "text-xl font-bold" }, "Sơ đồ bàn"),
      h("div", { className: "text-sm text-gray-500" },
        `${state.tables.filter(t => t.status === 'empty').length} trống / ${state.tables.filter(t => t.status === 'occupied').length} có khách`),
    ));
    const grid = h("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" });
    state.tables.forEach((t) => {
      const occupied = t.status === "occupied";
      grid.appendChild(h("button", {
        onclick: () => setState({ selectedTable: t, cart: [], selectedCategory: null, view: "menu" }),
        className: `p-4 rounded-2xl border-2 text-left transition hover:scale-[1.02] ${
          occupied ? "bg-red-50 border-red-300 hover:border-red-500" : "bg-emerald-50 border-emerald-300 hover:border-emerald-500"
        }`,
      },
        h("div", { className: "flex items-center justify-between mb-2" },
          h("span", { className: "font-bold text-lg" }, t.name),
          h("span", { className: `text-xs px-2 py-0.5 rounded-full font-semibold text-white ${occupied ? "bg-red-500" : "bg-emerald-500"}` },
            occupied ? "Có khách" : "Trống"),
        ),
        (occupied && t.pending_order)
          ? h("div", { className: "text-sm text-red-700 font-semibold" }, "Tạm tính: " + formatVND(t.pending_order.total))
          : h("div", { className: "text-sm text-emerald-700" }, "Sẵn sàng order"),
      ));
    });
    leftPane.appendChild(grid);
  } else if (state.view === "menu" && state.selectedTable) {
    leftPane.appendChild(h("div", { className: "mb-4 flex items-center justify-between gap-3" },
      h("div", {},
        h("button", {
          onclick: () => setState({ selectedTable: null, view: "tables", cart: [] }),
          className: "text-sm text-gray-500 hover:text-gray-900 mb-1",
        }, "← Quay lại"),
        h("h2", { className: "text-xl font-bold" }, `Bàn: ${state.selectedTable.name}`),
      ),
      h("input", {
        type: "search", placeholder: "🔍 Tìm món...", value: state.search,
        oninput: (e) => setState({ search: e.target.value }),
        className: "px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500",
      }),
    ));

    const catTabs = h("div", { className: "flex gap-2 mb-4 overflow-x-auto pb-2" });
    catTabs.appendChild(h("button", {
      onclick: () => setState({ selectedCategory: null }),
      className: `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
        state.selectedCategory === null ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
      }`,
    }, "Tất cả"));
    state.categories.forEach((c) => {
      catTabs.appendChild(h("button", {
        onclick: () => setState({ selectedCategory: c.id }),
        className: `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
          state.selectedCategory === c.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
        }`,
      }, c.name));
    });
    leftPane.appendChild(catTabs);

    if (filtered.length === 0) {
      leftPane.appendChild(h("div", { className: "text-center py-16 text-gray-400" }, "Không có sản phẩm"));
    } else {
      const grid = h("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" });
      filtered.forEach((p) => {
        grid.appendChild(h("button", {
          onclick: () => addToCart(p),
          className: "bg-white rounded-xl border border-gray-200 overflow-hidden text-left hover:shadow-md transition group",
        },
          h("div", { className: "aspect-[4/3] bg-gray-100 overflow-hidden" },
            p.image_url
              ? h("img", { src: p.image_url, alt: p.name, loading: "lazy", className: "w-full h-full object-cover group-hover:scale-105 transition" })
              : h("div", { className: "w-full h-full flex items-center justify-center text-3xl" }, "🍽️"),
          ),
          h("div", { className: "p-2" },
            h("div", { className: "font-semibold text-sm text-gray-800 line-clamp-2 mb-1" }, p.name),
            h("div", { className: "flex items-center justify-between" },
              h("span", { className: "text-orange-600 font-bold" }, formatVND(p.price)),
              h("span", { className: "w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center" }, "+"),
            ),
          ),
        ));
      });
      leftPane.appendChild(grid);
    }
  } else if (state.view === "orders") {
    leftPane.appendChild(h("h2", { className: "text-xl font-bold mb-4" }, "Đơn hàng gần đây"));
    if (state.orders.length === 0) {
      leftPane.appendChild(h("div", { className: "text-center py-16 text-gray-400" }, "Chưa có đơn nào"));
    } else {
      const list = h("div", { className: "space-y-2" });
      state.orders.forEach((o) => {
        const statusColor = o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700";
        list.appendChild(h("div", { className: "bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between" },
          h("div", {},
            h("div", { className: "font-semibold" }, `#${o.id} - ${o.table_name || "Mang đi"}`),
            h("div", { className: "text-xs text-gray-500" }, o.created_at),
          ),
          h("div", { className: "flex items-center gap-3" },
            h("span", { className: "font-bold text-orange-600" }, formatVND(o.total)),
            h("span", { className: `text-xs px-2 py-1 rounded-full font-medium ${statusColor}` }, o.status === "paid" ? "Đã thanh toán" : "Chờ"),
          ),
        ));
      });
      leftPane.appendChild(list);
    }
  }
  main.appendChild(leftPane);

  if (state.view === "menu" && state.selectedTable) {
    const cartPane = h("aside", { className: "w-80 bg-white border-l flex flex-col" },
      h("div", { className: "p-4 border-b" },
        h("div", { className: "flex items-center justify-between" },
          h("h3", { className: "font-bold text-lg" }, "🛒 Giỏ hàng"),
          h("span", { className: "text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold" }, `${cartCount} món`),
        ),
      ),
      h("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" },
        state.cart.length === 0
          ? h("div", { className: "text-center py-8 text-gray-400 text-sm" }, "Chưa có món nào")
          : state.cart.map((it) => h("div", { className: "flex items-center gap-2 p-2 bg-gray-50 rounded-lg" },
              h("div", { className: "flex-1" },
                h("div", { className: "font-semibold text-sm" }, it.name),
                h("div", { className: "text-xs text-orange-600 font-bold" }, formatVND(it.price)),
              ),
              h("button", { onclick: () => updateQty(it.id, -1), className: "w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 font-bold" }, "−"),
              h("span", { className: "w-6 text-center font-semibold" }, it.qty),
              h("button", { onclick: () => updateQty(it.id, +1), className: "w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold" }, "+"),
            )),
      ),
      state.cart.length > 0
        ? h("div", { className: "p-4 border-t bg-gray-50" },
            h("div", { className: "flex justify-between items-center mb-3" },
              h("span", { className: "text-gray-600 font-medium" }, "Tổng cộng"),
              h("span", { className: "text-2xl font-bold text-orange-600" }, formatVND(cartTotal)),
            ),
            h("button", {
              onclick: () => setState({ showCheckout: true }),
              className: "w-full py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition",
            }, "Thanh toán"),
          )
        : h("div", { className: "p-4 border-t text-center text-gray-400 text-xs" }, "Chọn món để bắt đầu"),
    );
    main.appendChild(cartPane);
  }
  wrap.appendChild(main);

  if (state.showCheckout) {
    const overlay = h("div", { className: "fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4", onclick: () => setState({ showCheckout: false }) },
      h("div", { className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full", onclick: (e) => e.stopPropagation() },
        h("h3", { className: "text-xl font-bold mb-4" }, "Thanh toán"),
        h("div", { className: "bg-gray-50 p-3 rounded-lg mb-4 space-y-1" },
          state.cart.map((it) => h("div", { className: "flex justify-between text-sm" },
            h("span", {}, `${it.qty}x ${it.name}`),
            h("span", { className: "font-semibold" }, formatVND(it.price * it.qty)),
          )),
          h("div", { className: "border-t pt-2 mt-2 flex justify-between font-bold text-lg" },
            h("span", {}, "Tổng"),
            h("span", { className: "text-orange-600" }, formatVND(cartTotal)),
          ),
        ),
        h("div", { className: "mb-4" },
          h("label", { className: "block text-sm font-medium mb-2" }, "Phương thức thanh toán"),
          h("div", { className: "grid grid-cols-2 gap-2" },
            ["cash", "transfer"].map((m) => h("button", {
              onclick: () => setState({ paymentMethod: m }),
              className: `p-3 rounded-lg border-2 font-semibold transition ${
                state.paymentMethod === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 hover:border-gray-300"
              }`,
            }, m === "cash" ? "💵 Tiền mặt" : "📱 Chuyển khoản")),
          ),
        ),
        h("div", { className: "flex gap-2" },
          h("button", { onclick: () => setState({ showCheckout: false }), className: "flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50" }, "Hủy"),
          h("button", { onclick: submitOrder, className: "flex-1 py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition" }, "Xác nhận"),
        ),
      ),
    );
    wrap.appendChild(overlay);
  }

  if (state.toast) wrap.appendChild(h("div", { className: "fixed top-20 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium" }, state.toast));

  return wrap;
}

// ============ Action handlers ============
function addToCart(p) {
  const found = state.cart.find((it) => it.id === p.id);
  if (found) {
    setState({ cart: state.cart.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it)) });
  } else {
    setState({ cart: [...state.cart, { id: p.id, name: p.name, price: p.price, qty: 1 }] });
  }
  showToast(`Đã thêm ${p.name}`);
}

function updateQty(id, delta) {
  setState({
    cart: state.cart.map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0),
  });
}

function showToast(msg) {
  if (state.toastTimer) clearTimeout(state.toastTimer);
  setState({ toast: msg });
  state.toastTimer = setTimeout(() => setState({ toast: null }), 2000);
}

function fetchMenuAndTables() {
  Promise.all([
    fetch("/api/menu").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch("/api/tables").then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ])
    .then(([menu, tbl]) => {
      setState({
        storeName: menu.store_name || "POS Demo",
        categories: menu.categories || [],
        products: menu.products || [],
        tables: tbl.tables || [],
        usingMock: false,
      });
    })
    .catch(() => {
      setState({
        storeName: MOCK.store_name + " (preview)",
        categories: MOCK.categories,
        products: MOCK.products,
        tables: MOCK.tables,
        usingMock: true,
      });
    });
}

function loadOrders() {
  fetch("/api/orders")
    .then((r) => (r.ok ? r.json() : { orders: [] }))
    .then((d) => setState({ orders: d.orders || [] }))
    .catch(() => setState({ orders: [] }));
}

async function submitOrder() {
  if (!state.selectedTable || state.cart.length === 0) return;
  const payload = {
    table_id: state.selectedTable.id,
    order_type: "dine_in",
    payment_method: state.paymentMethod,
    items: state.cart.map((c) => ({ product_id: c.id, product_name: c.name, price: c.price, quantity: c.qty })),
  };
  try {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Lỗi");
    const tbl = await fetch("/api/tables").then((r) => r.json());
    setState({
      tables: tbl.tables || [],
      showCheckout: false,
      cart: [],
      toast: `Đã gửi order #${data.order_id}`,
    });
    setTimeout(() => setState({ selectedTable: null, view: "tables", toast: null }), 1500);
  } catch (err) {
    showToast("Lỗi: " + err.message);
  }
}

async function handleLogout() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    try { await fetch("/api/auth/logout", { method: "POST", headers: { "Authorization": `Bearer ${token}` } }); } catch {}
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  setState({ user: null, view: "tables", cart: [], selectedTable: null });
}

// ============ Auth init ============
async function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);
  if (!token) { setState({ authLoading: false }); return; }

  try {
    const r = await fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } });
    if (r.ok) {
      const data = await r.json();
      if (data.valid) {
        setState({ user: data.user, authLoading: false });
        return;
      }
    }
    // Token invalid
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Worker không khả dụng - dùng stored user cho preview
    if (storedUser) {
      setState({ user: JSON.parse(storedUser), authLoading: false });
      return;
    }
  }
  setState({ authLoading: false });
}

// ============ Render ============
function render() {
  const root = document.getElementById("root");
  root.innerHTML = "";

  if (state.authLoading) {
    root.appendChild(h("div", { className: "min-h-screen flex items-center justify-center" },
      h("div", { className: "text-gray-500" }, "Đang tải...")));
    return;
  }

  if (!state.user) {
    root.appendChild(LoginView());
    return;
  }

  root.appendChild(PosApp());
}

// Khởi động
initAuth();