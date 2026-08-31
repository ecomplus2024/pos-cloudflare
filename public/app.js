/**
 * POS Demo - plain JS, không React, không JSX
 * - mode='cashier': Login → PosApp (tables grid + menu + cart + checkout)
 * - mode='public': WelcomeOverlay → Menu (categories + products + sizes + toppings + notes)
 *                   + CartModal + SizeModal + EditItemModal + TableGroupModal + WaitingStaffScreen
 *                   + MyOrderView (polling 10s)
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
  // Global
  mode: null, // 'cashier' | 'public'

  // Auth (cashier)
  authLoading: true,
  user: null,
  loginForm: { username: "admin", password: "", error: "", loading: false },

  // Cashier PosApp
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

  // Public mode
  public: {
    tableId: null,
    storeName: "Đang tải...",
    table: null,
    categories: [],
    products: [],
    toppings: [],
    featuredProducts: [],
    selectedCategory: null,
    searchQuery: "",
    cart: [], // [{tempId, product, size, quantity, toppings, notes}]
    activeView: "menu", // 'menu' | 'myorder'
    myItems: [],
    itemsLoading: false,
    loading: true,
    error: null,
    showWelcome: false,
    welcomeStep: 0,
    showCart: false,
    showSizeModal: false,
    selectedProductForSize: null,
    showEditModal: false,
    editItemTempId: null,
    tableState: null,
    showGroupModal: false,
    waitingStaff: false,
    isOrdering: false,
    orderSuccess: false,
    requestToken: null,
    lastSubmitNetworkFailed: false,
    pollInterval: null,
    itemsInterval: null,
    toasts: [], // [{id, message}]
  },
};

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function setPublicState(patch) {
  Object.assign(state.public, patch);
  render();
}

// ============ MOCK fallback (cashier only) ============
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

// ============ Login View (cashier) ============
function LoginView() {
  const { username, password, error, loading } = state.loginForm;
  const onSubmit = async (e) => {
    e.preventDefault();
    setState({ loginForm: { ...state.loginForm, error: "", loading: true } });
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        setState({ loginForm: { ...state.loginForm, error: data.message || "Đăng nhập thất bại", loading: false } });
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setState({ user: data.user, loginForm: { username: "admin", password: "", error: "", loading: false } });
    } catch (err) {
      setState({ loginForm: { ...state.loginForm, error: "Lỗi mạng: " + err.message, loading: false } });
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
            type: "text", value: username, "data-focus-key": "login-username",
            oninput: (e) => setState({ loginForm: { ...state.loginForm, username: e.target.value } }),
            className: "w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none",
            placeholder: "admin", required: true,
          }),
        ),
        h("div", {},
          h("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Mật khẩu"),
          h("input", {
            type: "password", value: password, "data-focus-key": "login-password",
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

// ============ PosApp (cashier - sau login) ============
function PosApp() {
  if (state.categories.length === 0 && !state.usingMock) fetchMenuAndTables();
  const filtered = state.products.filter((p) => {
    if (state.selectedCategory !== null && p.category_id !== state.selectedCategory) return false;
    if (state.search.trim()) return p.name.toLowerCase().includes(state.search.toLowerCase().trim());
    return true;
  });
  const cartTotal = state.cart.reduce((s, it) => s + it.price * it.qty, 0);
  const cartCount = state.cart.reduce((s, it) => s + it.qty, 0);

  const wrap = h("div", { className: "flex flex-col h-screen bg-gray-50 font-sans text-gray-900" });
  const header = h("header", { className: "bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg" }, "☕"),
      h("div", {},
        h("div", { className: "font-bold text-gray-900" }, state.storeName),
        h("div", { className: "text-xs text-gray-500" }, state.usingMock ? "Preview mode" : `Xin chào ${state.user.full_name || state.user.username}`),
      ),
    ),
    h("nav", { className: "flex gap-2" },
      h("button", { onclick: () => setState({ view: "tables" }),
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${state.view === "tables" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}` }, "🪑 Bàn"),
      h("button", { onclick: () => { setState({ view: "orders" }); loadOrders(); },
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${state.view === "orders" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}` }, "📋 Đơn hàng"),
    ),
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium" }, "● Online"),
      h("button", { onclick: handleLogout, className: "text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200" }, "🚪 Đăng xuất"),
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
        h("button", { onclick: () => setState({ selectedTable: null, view: "tables", cart: [] }),
          className: "text-sm text-gray-500 hover:text-gray-900 mb-1" }, "← Quay lại"),
        h("h2", { className: "text-xl font-bold" }, `Bàn: ${state.selectedTable.name}`),
      ),
      h("input", {
        type: "search", placeholder: "🔍 Tìm món...", value: state.search, "data-focus-key": "menu-search",
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
            h("button", { onclick: () => setState({ showCheckout: true }),
              className: "w-full py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition" }, "Thanh toán"),
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

// ============ Action handlers (cashier) ============
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
  setState({ cart: state.cart.map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it)).filter((it) => it.qty > 0) });
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
    .then(([menu, tbl]) => setState({
      storeName: menu.store_name || "POS Demo",
      categories: menu.categories || [],
      products: menu.products || [],
      tables: tbl.tables || [],
      usingMock: false,
    }))
    .catch(() => setState({
      storeName: MOCK.store_name + " (preview)",
      categories: MOCK.categories,
      products: MOCK.products,
      tables: MOCK.tables,
      usingMock: true,
    }));
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
    table_id: state.selectedTable.id, order_type: "dine_in",
    payment_method: state.paymentMethod,
    items: state.cart.map((c) => ({ product_id: c.id, product_name: c.name, price: c.price, quantity: c.qty })),
  };
  try {
    const r = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Lỗi");
    const tbl = await fetch("/api/tables").then((r) => r.json());
    setState({ tables: tbl.tables || [], showCheckout: false, cart: [], toast: `Đã gửi order #${data.order_id}` });
    setTimeout(() => setState({ selectedTable: null, view: "tables", toast: null }), 1500);
  } catch (err) { showToast("Lỗi: " + err.message); }
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

// ============ Auth init (cashier) ============
async function initAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);
  if (!token) { setState({ authLoading: false }); return; }
  try {
    const r = await fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } });
    if (r.ok) {
      const data = await r.json();
      if (data.valid) { setState({ user: data.user, authLoading: false }); return; }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    if (storedUser) { setState({ user: JSON.parse(storedUser), authLoading: false }); return; }
  }
  setState({ authLoading: false });
}

// ============ PUBLIC MODE: bootstrap + handlers ============

function publicGenerateToken() {
  return (crypto.randomUUID ? crypto.randomUUID() : "tk_" + Math.random().toString(36).slice(2));
}

function publicAddToast(msg) {
  const id = Date.now() + Math.random();
  state.public.toasts.push({ id, message: msg });
  render();
  setTimeout(() => {
    state.public.toasts = state.public.toasts.filter((t) => t.id !== id);
    render();
  }, 2500);
}

function publicPersistCart() {
  try { localStorage.setItem(`public_cart-${state.public.tableId}`, JSON.stringify(state.public.cart)); } catch {}
}

function publicNewRequestToken() {
  state.public.requestToken = publicGenerateToken();
  try { localStorage.setItem(`public_request_token-${state.public.tableId}`, state.public.requestToken); } catch {}
}

function publicGetTotal() {
  return state.public.cart.reduce((sum, it) => {
    const productTotal = it.product.price * it.quantity;
    const toppingTotal = it.toppings.reduce((s, t) => s + t.price, 0) * it.quantity;
    return sum + productTotal + toppingTotal;
  }, 0);
}

function publicGetCartCount() {
  return state.public.cart.reduce((s, it) => s + it.quantity, 0);
}

async function publicFetchMenu() {
  try {
    const [menuRes, settingsRes] = await Promise.all([
      fetch(`/api/public/menu/${state.public.tableId}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
      fetch(`/api/settings`).then((r) => r.ok ? r.json() : {}),
    ]);
    const products = (menuRes.products || []).filter((p) => !p.is_topping);
    const toppings = (menuRes.products || []).filter((p) => p.is_topping);
    const fp = settingsRes.featured_products || [];
    document.title = menuRes.store?.name || "Menu POS";
    setPublicState({
      storeName: menuRes.store?.name || "POS Demo",
      table: menuRes.table,
      categories: menuRes.categories || [],
      products,
      toppings,
      featuredProducts: (menuRes.products || []).filter((p) => fp.includes(p.id)),
      loading: false,
      error: null,
    });
  } catch (err) {
    setPublicState({ loading: false, error: err.message || "Không thể tải menu" });
  }
}

async function publicPollTableState() {
  try {
    const r = await fetch(`/api/public/table-state/${state.public.tableId}`);
    if (!r.ok) return;
    const data = await r.json();
    const prev = state.public.tableState;
    const released = prev?.has_pending_order && !data.has_pending_order;
    if (released) {
      try { localStorage.removeItem(`publicSessionId-${state.public.tableId}`); } catch {}
      setPublicState({ showGroupModal: false, waitingStaff: false, tableState: data });
      return;
    }
    if (data.has_pending_order) {
      const mySession = localStorage.getItem(`publicSessionId-${state.public.tableId}`);
      const isMyOrder = mySession && mySession === data.customer_session_id;
      if (!isMyOrder && !state.public.waitingStaff) {
        setPublicState({ showGroupModal: true, tableState: data });
        return;
      }
    }
    setPublicState({ tableState: data, showGroupModal: false });
  } catch (err) {
    console.warn("Poll table-state fail:", err);
  }
}

async function publicPollItems() {
  if (state.public.activeView !== "myorder") return;
  try {
    setPublicState({ itemsLoading: true });
    const r = await fetch(`/api/public/items/${state.public.tableId}`);
    if (!r.ok) throw new Error("Lỗi");
    const data = await r.json();
    setPublicState({ myItems: Array.isArray(data) ? data : [], itemsLoading: false });
  } catch (err) {
    setPublicState({ itemsLoading: false });
  }
}

function publicStartPolling() {
  if (state.public.pollInterval) clearInterval(state.public.pollInterval);
  state.public.pollInterval = setInterval(publicPollTableState, 10000);
  if (state.public.itemsInterval) clearInterval(state.public.itemsInterval);
  state.public.itemsInterval = setInterval(publicPollItems, 10000);
  publicPollTableState();
}

function publicStopPolling() {
  if (state.public.pollInterval) { clearInterval(state.public.pollInterval); state.public.pollInterval = null; }
  if (state.public.itemsInterval) { clearInterval(state.public.itemsInterval); state.public.itemsInterval = null; }
}

function publicAddToCart(product, size) {
  if (product.sizes && product.sizes.length > 0 && !size) {
    setPublicState({ selectedProductForSize: product, showSizeModal: true });
    return;
  }
  const existingIndex = state.public.cart.findIndex((item) =>
    item.product.id === product.id &&
    item.toppings.length === 0 &&
    ((!item.size && !size) || (item.size && size && item.size.id === size.id)) &&
    !item.notes
  );
  const itemPrice = size ? size.price : product.price;
  const productWithPrice = { ...product, price: itemPrice };
  const tempId = publicGenerateToken();
  if (existingIndex >= 0) {
    const newCart = [...state.public.cart];
    newCart[existingIndex].quantity += 1;
    setPublicState({ cart: newCart });
  } else {
    setPublicState({
      cart: [...state.public.cart, {
        tempId, product: productWithPrice, size: size || null,
        quantity: 1, toppings: [], notes: "",
      }],
    });
  }
  publicNewRequestToken();
  publicPersistCart();
  publicAddToast(`Đã thêm ${product.name}`);
}

function publicUpdateQty(tempId, delta) {
  const newCart = [...state.public.cart];
  const idx = newCart.findIndex((it) => it.tempId === tempId);
  if (idx < 0) return;
  newCart[idx].quantity += delta;
  if (newCart[idx].quantity <= 0) newCart.splice(idx, 1);
  setPublicState({ cart: newCart });
  publicNewRequestToken();
  publicPersistCart();
}

function publicToggleTopping(tempId, topping) {
  const newCart = [...state.public.cart];
  const item = newCart.find((it) => it.tempId === tempId);
  if (!item) return;
  const idx = item.toppings.findIndex((t) => t.id === topping.id);
  if (idx >= 0) item.toppings.splice(idx, 1);
  else item.toppings.push(topping);
  setPublicState({ cart: newCart });
  publicNewRequestToken();
  publicPersistCart();
}

function publicUpdateNotes(tempId, notes) {
  const newCart = [...state.public.cart];
  const item = newCart.find((it) => it.tempId === tempId);
  if (!item) return;
  item.notes = notes || "";
  setPublicState({ cart: newCart });
  publicNewRequestToken();
  publicPersistCart();
}

function publicConfirmSize(size) {
  if (!state.public.selectedProductForSize) return;
  publicAddToCart(state.public.selectedProductForSize, size);
  setPublicState({ showSizeModal: false, selectedProductForSize: null });
}

async function publicSubmitOrder() {
  if (state.public.cart.length === 0) { publicAddToast("Vui lòng chọn ít nhất 1 món"); return; }
  setPublicState({ isOrdering: true });
  const sessionId = localStorage.getItem(`publicSessionId-${state.public.tableId}`);
  const orderData = {
    table_id: state.public.tableId,
    table_position: "A",
    request_token: state.public.requestToken,
    retry_after_failure: state.public.lastSubmitNetworkFailed,
    items: state.public.cart.map((it) => ({
      product_id: it.product.id,
      quantity: it.quantity,
      toppings: it.toppings.map((t) => t.id),
      size_id: it.size?.id,
      notes: it.notes || "",
    })),
  };
  if (sessionId) orderData.customer_session_id = sessionId;
  try {
    const res = await fetch("/api/public/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) {
      // Cố gắng đọc body để biết status
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (res.status === 409 || res.status === 403) {
        try { localStorage.removeItem(`publicSessionId-${state.public.tableId}`); } catch {}
        setPublicState({
          isOrdering: false, showGroupModal: true,
          showCart: false, showSizeModal: false, showEditModal: false,
          tableState: { has_pending_order: true, customer_session_id: null },
          lastSubmitNetworkFailed: false,
        });
        publicAddToast(data.message || "Phiên đặt món đã hết hạn");
        return;
      }
      // Server error → regenerate
      publicNewRequestToken();
      setPublicState({ isOrdering: false, lastSubmitNetworkFailed: false });
      publicAddToast(data.message || "Lỗi gửi đơn");
      return;
    }
    const data = await res.json();
    if (data.customer_session_id) {
      try { localStorage.setItem(`publicSessionId-${state.public.tableId}`, data.customer_session_id); } catch {}
    }
    setPublicState({
      orderSuccess: true, isOrdering: false, lastSubmitNetworkFailed: false,
    });
    // Clear cart + chuyển sang MyOrder sau 2s
    setTimeout(() => {
      try { localStorage.removeItem(`public_cart-${state.public.tableId}`); } catch {}
      setPublicState({
        cart: [], requestToken: null, orderSuccess: false,
        showCart: false, activeView: "myorder",
      });
      publicPollItems();
    }, 2000);
  } catch (err) {
    // Network error
    setPublicState({ isOrdering: false, lastSubmitNetworkFailed: true });
    publicAddToast("Mạng không ổn định, vui lòng thử lại. Đơn sẽ không bị gửi trùng.");
  }
}

async function publicDeleteItem(orderId, itemId) {
  if (!confirm("Bạn có chắc muốn hủy món này?")) return;
  try {
    await fetch(`/api/public/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
    await publicPollItems();
  } catch (err) { publicAddToast("Lỗi xóa món"); }
}

async function publicReduceQty(orderId, itemId, currentQty) {
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
    await publicPollItems();
  } catch (err) { publicAddToast("Lỗi cập nhật"); }
}

async function publicCallStaff() {
  try {
    await fetch("/api/public/call-staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_id: state.public.tableId, reason: "new_customer" }),
    });
    setPublicState({ waitingStaff: true, showGroupModal: false });
  } catch (err) { publicAddToast("Gọi nhân viên thất bại"); }
}

function publicChooseContinue() {
  const sessionId = state.public.tableState?.customer_session_id;
  if (sessionId) {
    try { localStorage.setItem(`publicSessionId-${state.public.tableId}`, sessionId); } catch {}
  }
  setPublicState({ showGroupModal: false });
}

function publicDismissWelcome() {
  setPublicState({ showWelcome: false });
}

function bootstrapPublicMode(tableId) {
  state.mode = "public";
  state.authLoading = false;
  state.public.tableId = tableId;
  state.public.requestToken = localStorage.getItem(`public_request_token-${tableId}`) || null;
  try {
    state.public.cart = JSON.parse(localStorage.getItem(`public_cart-${tableId}`) || "[]");
  } catch { state.public.cart = []; }
  // Welcome overlay per-tab
  if (!sessionStorage.getItem("hasSeenWelcome")) {
    state.public.showWelcome = true;
    sessionStorage.setItem("hasSeenWelcome", "true");
    state.public.welcomeStep = 0;
    setTimeout(() => setPublicState({ welcomeStep: 1 }), 100);
    setTimeout(() => setPublicState({ welcomeStep: 2 }), 600);
    setTimeout(() => setPublicState({ welcomeStep: 3 }), 1000);
  }
  render();
  publicFetchMenu();
  publicStartPolling();
}

// ============ PUBLIC VIEWS ============

function FeaturedProducts() {
  return h("div", { className: "grid grid-cols-4 gap-3 mb-8 transition-all duration-700 translate-y-0 opacity-100" },
    state.public.featuredProducts.slice(0, 4).map((p) => FeaturedCard({ p }))
  );
}

function FeaturedCard(props) {
  const p = props.p;
  const img = p.image_url
    ? h("img", { src: p.image_url, alt: p.name, className: "w-full h-full object-cover" })
    : h("div", { className: "text-3xl" }, "☕");
  return h("div", { className: "bg-white/10 backdrop-blur-sm rounded-xl p-2" },
    h("div", { className: "aspect-square bg-primary-400 rounded-lg mb-2 overflow-hidden flex items-center justify-center" }, img),
    h("div", { className: "text-white text-xs font-semibold line-clamp-2" }, p.name),
  );
}

function WelcomeOverlay() {
  if (!state.public.showWelcome) return null;
  const step = state.public.welcomeStep;
  const showFeatured = state.public.featuredProducts.length > 0 && step >= 2;
  return h("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black p-4 overflow-hidden" },
    h("div", { className: "absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500 rounded-full opacity-20 animate-blob" }),
    h("div", { className: "absolute bottom-1/4 right-1/4 w-72 h-72 bg-yellow-500 rounded-full opacity-20 animate-blob animation-delay-2000" }),
    h("div", { className: "relative max-w-md w-full text-center" },
      h("h1", { className: "text-3xl md:text-5xl font-black mb-4 transition-all duration-700 bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent " + (step >= 1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0") },
        state.public.storeName),
      h("p", { className: "text-yellow-100 text-lg mb-8 transition-all duration-700 " + (step >= 1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0") },
        "Xin được phục vụ quý khách"),
      showFeatured ? FeaturedProducts() : null,
      h("button", {
        onclick: publicDismissWelcome,
        className: "px-12 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 text-xl font-black rounded-2xl shadow-2xl hover:shadow-yellow-300/50 hover:scale-105 transition-all duration-700 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0 pointer-events-none"),
      }, "BẮT ĐẦU"),
    ),
  );
}

function SizeModal() {
  if (!state.public.showSizeModal || !state.public.selectedProductForSize) return null;
  const p = state.public.selectedProductForSize;
  return h("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in", onclick: () => setPublicState({ showSizeModal: false, selectedProductForSize: null }) },
    h("div", { className: "bg-white rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95", onclick: (e) => e.stopPropagation() },
      h("h3", { className: "text-xl font-bold mb-2" }, p.name),
      h("p", { className: "text-gray-500 text-sm mb-4" }, "Vui lòng chọn size"),
      h("div", { className: "grid grid-cols-1 gap-2" },
        p.sizes.map((s) => h("button", {
          onclick: () => publicConfirmSize(s),
          className: "p-3 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 flex items-center justify-between transition",
        },
          h("span", { className: "font-bold text-lg" }, s.name),
          h("span", { className: "text-primary-600 font-bold" }, formatVND(s.price)),
        )),
      ),
    ),
  );
}

function EditItemModal() {
  if (!state.public.showEditModal || !state.public.editItemTempId) return null;
  const item = state.public.cart.find((it) => it.tempId === state.public.editItemTempId);
  if (!item) return null;
  // Filter toppings by category
  const category = state.public.categories.find((c) => c.id === item.product.category_id);
  const allowedIds = category?.allowed_toppings || [];
  const allowedToppings = allowedIds.length > 0
    ? state.public.toppings.filter((t) => allowedIds.includes(t.id))
    : state.public.toppings;
  return h("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-end justify-center animate-in fade-in", onclick: () => setPublicState({ showEditModal: false, editItemTempId: null }) },
    h("div", { className: "bg-white rounded-t-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom", onclick: (e) => e.stopPropagation() },
      h("div", { className: "flex items-center justify-between mb-4" },
        h("h3", { className: "text-xl font-bold" }, item.product.name),
        h("button", { onclick: () => setPublicState({ showEditModal: false, editItemTempId: null }), className: "text-gray-400 hover:text-gray-700 text-2xl" }, "×"),
      ),
      h("div", { className: "mb-4" },
        h("div", { className: "text-sm font-semibold mb-2 text-gray-700" }, "Topping"),
        h("div", { className: "flex flex-wrap gap-2" },
          allowedToppings.length === 0
            ? h("div", { className: "text-gray-400 text-sm" }, "Món này không có topping")
            : allowedToppings.map((t) => {
                const selected = item.toppings.some((x) => x.id === t.id);
                return h("button", {
                  onclick: () => publicToggleTopping(item.tempId, t),
                  className: `px-3 py-2 rounded-full text-sm font-medium border-2 transition ${
                    selected ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-white border-gray-200 hover:border-gray-300"
                  }`,
                }, selected ? `✓ ${t.name} +${t.price.toLocaleString()}đ` : `+ ${t.name} +${t.price.toLocaleString()}đ`);
              }),
        ),
      ),
      h("div", { className: "mb-4" },
        h("label", { className: "text-sm font-semibold text-gray-700 mb-2 block" }, "Ghi chú"),
        h("textarea", {
          rows: 2, placeholder: "VD: không đá, ít đường, cay ít...",
          value: item.notes || "",
          "data-focus-key": `public-notes-${item.tempId}`,
          oninput: (e) => publicUpdateNotes(item.tempId, e.target.value),
          className: "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none",
        }),
      ),
      h("button", {
        onclick: () => setPublicState({ showEditModal: false, editItemTempId: null }),
        className: "w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition",
      }, "Xong"),
    ),
  );
}

function CartModal() {
  if (!state.public.showCart) return null;
  const total = publicGetTotal();
  return h("div", { className: "fixed inset-0 bg-black/50 z-40 flex items-end justify-center animate-in fade-in", onclick: () => setPublicState({ showCart: false }) },
    h("div", { className: "bg-white rounded-t-3xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom", onclick: (e) => e.stopPropagation() },
      h("div", { className: "flex items-center justify-between mb-3" },
        h("h3", { className: "text-xl font-bold" }, "Giỏ hàng của bạn"),
        h("button", { onclick: () => setPublicState({ showCart: false }), className: "text-gray-400 hover:text-gray-700 text-2xl" }, "×"),
      ),
      h("div", { className: "space-y-2 mb-4" },
        state.public.cart.length === 0
          ? h("div", { className: "text-center py-8 text-gray-400 text-sm" }, "Giỏ hàng trống")
          : state.public.cart.map((it) => {
              const lineTotal = (it.product.price + it.toppings.reduce((s, t) => s + t.price, 0)) * it.quantity;
              return h("div", { className: "bg-gray-50 rounded-xl p-3" },
                h("div", { className: "flex items-start justify-between mb-1" },
                  h("div", { className: "flex-1" },
                    h("div", { className: "font-semibold text-sm" }, it.product.name),
                    it.size ? h("div", { className: "text-xs text-primary-600 font-semibold" }, "Size: " + it.size.name) : null,
                  ),
                  h("div", { className: "flex items-center gap-2" },
                    h("button", { onclick: () => publicUpdateQty(it.tempId, -1), className: "w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 font-bold" }, "−"),
                    h("span", { className: "w-6 text-center font-semibold" }, it.quantity),
                    h("button", { onclick: () => publicUpdateQty(it.tempId, +1), className: "w-7 h-7 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-bold" }, "+"),
                  ),
                ),
                it.toppings.length > 0
                  ? h("div", { className: "flex flex-wrap gap-1 mb-1" },
                      it.toppings.map((t) => h("span", { className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full" }, `+${t.name}`)))
                  : null,
                it.notes
                  ? h("div", { className: "text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400 rounded mb-1" }, "📝 " + it.notes)
                  : null,
                h("div", { className: "flex items-center justify-between" },
                  h("button", {
                    onclick: () => setPublicState({ editItemTempId: it.tempId, showEditModal: true }),
                    className: "text-xs text-primary-600 hover:text-primary-700 font-semibold",
                  }, "⚙ Thêm topping / ghi chú"),
                  h("span", { className: "text-primary-600 font-bold text-sm" }, formatVND(lineTotal)),
                ),
              );
            }),
      ),
      h("div", { className: "border-t pt-3 sticky bottom-0 bg-white" },
        h("div", { className: "flex justify-between items-center mb-3" },
          h("span", { className: "text-gray-700 font-semibold" }, "Tổng cộng"),
          h("span", { className: "text-2xl font-bold text-primary-600" }, formatVND(total)),
        ),
        h("button", {
          onclick: publicSubmitOrder, disabled: state.public.isOrdering || state.public.cart.length === 0,
          className: `w-full py-4 rounded-xl font-bold text-white text-lg transition shadow-lg ${
            state.public.isOrdering ? "bg-gray-400" : state.public.cart.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-gradient-to-r from-primary-600 to-primary-700 hover:shadow-primary-200"
          }`,
        }, state.public.isOrdering ? "Đang gửi..." : state.public.orderSuccess ? "✓ Đã gửi đơn!" : "Gửi đơn hàng"),
      ),
    ),
  );
}

function TableGroupModal() {
  if (!state.public.showGroupModal || !state.public.tableState?.has_pending_order) return null;
  return h("div", { className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" },
    h("div", { className: "bg-white rounded-3xl p-6 max-w-sm w-full animate-in zoom-in-95 text-center" },
      h("div", { className: "w-20 h-20 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center text-4xl" }, "🍽️"),
      h("h2", { className: "text-xl font-black text-gray-800 mb-3" }, "Bàn này đã được sử dụng"),
      h("p", { className: "text-gray-600 mb-6 leading-relaxed" },
        "Bàn " + state.public.table?.name + " đã có đơn hàng được gọi từ trước. Vui lòng chọn 1 trong 2 lựa chọn:"),
      h("button", {
        onclick: publicChooseContinue,
        className: "w-full py-3 mb-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition",
      }, "Tôi đang ngồi, gọi thêm món"),
      h("button", {
        onclick: publicCallStaff,
        className: "w-full py-3 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl transition",
      }, "Tôi là khách mới, gọi nhân viên"),
    ),
  );
}

function WaitingStaffScreen() {
  if (!state.public.waitingStaff) return null;
  return h("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4" },
    h("div", { className: "bg-white p-8 rounded-2xl shadow-xl text-center max-w-md animate-in zoom-in-95" },
      h("div", { className: "w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-3xl animate-bounce-slow" }, "🔔"),
      h("h2", { className: "text-2xl font-black text-gray-800 mb-3" }, "Đã gọi nhân viên"),
      h("p", { className: "text-gray-700 leading-relaxed" },
        "Vui lòng chờ nhân viên đến để xử lý đơn hàng trước đó. Sau khi nhân viên xử lý xong, bạn có thể đặt món bình thường."),
    ),
  );
}

function MyOrderView() {
  const items = state.public.myItems || [];
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
  if (items.length === 0) {
    return h("div", { className: "max-w-2xl mx-auto p-4" },
      h("div", { className: "text-center py-16 text-gray-400" },
        h("div", { className: "text-6xl mb-4" }, "📋"),
        h("p", {}, "Chưa có món nào trong đơn")));
  }
  // Group items by name+toppings
  const groups = {};
  items.forEach((it) => {
    const toppingKey = (it.toppings || []).slice().sort().join("|");
    const k = `${it.name}|${toppingKey}`;
    if (!groups[k]) groups[k] = [];
    groups[k].push(it);
  });
  return h("div", { className: "max-w-2xl mx-auto p-4 pb-32" },
    h("div", { className: "space-y-3" },
      Object.entries(groups).map(([k, list]) => {
        const first = list[0];
        const totalQty = list.reduce((s, it) => s + it.quantity, 0);
        const statusBadge = (s) => {
          if (s === "pending") return h("span", { className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" }, "Đã nhận món");
          if (s === "processing") return h("span", { className: "text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" }, "Đang làm");
          if (s === "completed") return h("span", { className: "text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium" }, "Đã phục vụ");
          return null;
        };
        return h("div", { className: "bg-white rounded-xl shadow-md p-4" },
          h("div", { className: "flex items-center justify-between mb-2" },
            h("div", { className: "flex items-center gap-3" },
              h("div", { className: "flex items-center gap-1" },
                first.status === "pending" ? h("button", {
                  onclick: () => publicReduceQty(first.order_id, first.id, first.quantity),
                  className: "w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 font-bold",
                }, "−") : null,
                h("span", { className: "w-8 text-center font-bold" }, `${totalQty}x`),
              ),
              h("div", { className: "flex-1" },
                h("div", { className: "font-semibold text-gray-800" }, first.name),
                first.size_name ? h("div", { className: "text-xs text-primary-600 font-semibold" }, "Size: " + first.size_name) : null,
              ),
            ),
            h("div", { className: "flex items-center gap-2" },
              statusBadge(first.status),
              first.status === "pending" ? h("button", {
                onclick: () => publicDeleteItem(first.order_id, first.id),
                className: "w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center",
                title: "Xóa món",
              }, "🗑") : null,
            ),
          ),
          (first.toppings || []).length > 0
            ? h("div", { className: "flex flex-wrap gap-1 mb-2" },
                first.toppings.map((top) => h("span", { className: "text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full" }, `+${top}`)))
            : null,
          first.notes ? h("div", { className: "text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border-l-2 border-yellow-400 rounded mb-2" }, "💬 " + first.notes) : null,
          h("div", { className: "text-right text-primary-600 font-bold text-lg" }, formatVND(first.price * totalQty)),
        );
      }),
    ),
    h("div", { className: "fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary-600 to-primary-700 p-6 shadow-2xl" },
      h("div", { className: "max-w-2xl mx-auto text-center" },
        h("p", { className: "text-white text-sm mb-1" }, `${items.length} món đang chờ`),
        h("p", { className: "text-white text-4xl font-black" }, formatVND(total)),
      ),
    ),
  );
}

function PublicMenuView() {
  // Priority: waitingStaff > groupModal > loading > error > main view
  if (state.public.waitingStaff) return WaitingStaffScreen();
  if (state.public.showGroupModal && state.public.tableState?.has_pending_order) return TableGroupModal();
  if (state.public.loading) {
    return h("div", { className: "min-h-screen flex items-center justify-center bg-gray-50" },
      h("div", { className: "text-center" },
        h("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" }),
        h("p", { className: "mt-4 text-gray-600 font-bold" }, "Đang tải menu..."),
      ),
    );
  }
  if (state.public.error) {
    return h("div", { className: "min-h-screen flex items-center justify-center bg-gray-50 p-4" },
      h("div", { className: "text-center max-w-md" },
        h("div", { className: "text-6xl mb-4" }, "❌"),
        h("p", { className: "text-red-600 font-bold mb-2" }, state.public.error),
        h("button", { onclick: publicFetchMenu, className: "px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700" }, "Thử lại")));
  }

  // Main view
  const wrap = h("div", { className: "min-h-screen bg-gray-50 font-sans text-gray-900 pb-32" });

  // Sticky header
  const header = h("header", { className: "sticky top-0 z-10 bg-primary-600 text-white shadow-md" },
    h("div", { className: "max-w-4xl mx-auto px-4 py-3" },
      h("div", { className: "text-xs text-primary-100 mb-1" }, state.public.table ? `📍 ${state.public.table.name}` : ""),
      h("h1", { className: "text-2xl font-black" }, state.public.storeName),
    ),
  );
  wrap.appendChild(header);

  // Tabs (menu / myorder)
  const tabs = h("div", { className: "sticky-top-72 bg-white border-b" },
    h("div", { className: "max-w-4xl mx-auto px-4 flex gap-4" },
      h("button", {
        onclick: () => setPublicState({ activeView: "menu" }),
        className: `py-3 px-2 border-b-2 font-bold text-sm transition ${
          state.public.activeView === "menu" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-600 hover:text-gray-900"
        }`,
      }, "MENU"),
      h("button", {
        onclick: () => { setPublicState({ activeView: "myorder" }); publicPollItems(); },
        className: `py-3 px-2 border-b-2 font-bold text-sm transition ${
          state.public.activeView === "myorder" ? "border-primary-600 text-primary-600" : "border-transparent text-gray-600 hover:text-gray-900"
        }`,
      }, `MÓN ĐÃ CHỌN ${state.public.myItems.length > 0 ? `(${state.public.myItems.length})` : ""}`),
    ),
  );
  wrap.appendChild(tabs);

  if (state.public.activeView === "menu") {
    // Search + categories
    const searchBar = h("div", { className: "sticky-top-120 bg-white border-b p-3" },
      h("div", { className: "max-w-4xl mx-auto" },
        h("input", {
          type: "search", placeholder: "🔍 Tìm món...",
          value: state.public.searchQuery, "data-focus-key": "public-search",
          oninput: (e) => setPublicState({ searchQuery: e.target.value }),
          className: "w-full px-4 py-2 rounded-full border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none",
        }),
      ),
    );
    wrap.appendChild(searchBar);

    const catTabs = h("div", { className: "bg-white border-b p-3" },
      h("div", { className: "max-w-4xl mx-auto flex gap-2 overflow-x-auto" },
        h("button", {
          onclick: () => setPublicState({ selectedCategory: null }),
          className: `px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
            state.public.selectedCategory === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`,
        }, "Tất cả"),
        state.public.categories.filter((c) => !c.allow_all_toppings === false || c.id).map((c) => h("button", {
          onclick: () => setPublicState({ selectedCategory: c.id }),
          className: `px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
            state.public.selectedCategory === c.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`,
        }, c.name)),
      ),
    );
    wrap.appendChild(catTabs);

    // Products grid
    let list = state.public.products;
    if (state.public.selectedCategory !== null) list = list.filter((p) => p.category_id === state.public.selectedCategory);
    if (state.public.searchQuery.trim()) {
      const q = state.public.searchQuery.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    const main = h("main", { className: "max-w-4xl mx-auto p-3" });
    if (list.length === 0) {
      main.appendChild(h("div", { className: "text-center py-16 text-gray-400" }, "Không có sản phẩm"));
    } else {
      const grid = h("div", { className: "grid grid-cols-3 sm:grid-cols-4 gap-3" });
      list.forEach((p) => {
        const hasSizes = p.sizes && p.sizes.length > 0;
        grid.appendChild(h("button", {
          onclick: () => publicAddToCart(p),
          className: "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-lg transition",
        },
          h("div", { className: "aspect-square bg-gray-100 overflow-hidden" },
            p.image_url
              ? h("img", { src: p.image_url, alt: p.name, loading: "lazy", className: "w-full h-full object-cover" })
              : h("div", { className: "w-full h-full flex items-center justify-center text-3xl" }, "🍽️"),
          ),
          h("div", { className: "p-2" },
            h("h3", { className: "font-semibold text-xs text-gray-800 line-clamp-2 mb-1 min-h-[2rem]" }, p.name),
            h("div", { className: "flex items-center justify-between" },
              h("span", { className: "text-primary-600 font-bold text-sm" }, hasSizes ? `Từ ${formatVND(Math.min(...p.sizes.map((s) => s.price)))}` : formatVND(p.price)),
              h("span", { className: "w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center" }, "+"),
            ),
          ),
        ));
      });
      main.appendChild(grid);
    }
    wrap.appendChild(main);

    // Cart FAB (chỉ khi cart.length > 0)
    const cartCount = publicGetCartCount();
    if (cartCount > 0) {
      wrap.appendChild(h("button", {
        onclick: () => setPublicState({ showCart: true }),
        className: "fixed bottom-4 right-4 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl z-30 flex items-center gap-2 animate-pulse-ring animate-bounce-slow",
      },
        h("span", { className: "text-2xl animate-wiggle" }, "🛒"),
        h("span", { className: "absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold" }, String(cartCount)),
      ));
    }
  } else {
    wrap.appendChild(MyOrderView());
  }

  // Modals + overlay
  wrap.appendChild(CartModal());
  wrap.appendChild(SizeModal());
  wrap.appendChild(EditItemModal());
  wrap.appendChild(WelcomeOverlay());

  // Toasts
  if (state.public.toasts.length > 0) {
    const toastBox = h("div", { className: "fixed top-4 right-4 z-50 space-y-2" },
      ...state.public.toasts.map((t) => h("div", { className: "bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right" }, t.message)),
    );
    wrap.appendChild(toastBox);
  }

  return wrap;
}

// ============ Render ============
function captureFocus() {
  const active = document.activeElement;
  if (!active || !active.dataset || !active.dataset.focusKey) return null;
  return {
    focusKey: active.dataset.focusKey,
    selectionStart: active.selectionStart,
    selectionEnd: active.selectionEnd,
  };
}

function restoreFocus(saved) {
  if (!saved) return;
  const el = document.querySelector(`[data-focus-key="${saved.focusKey}"]`);
  if (!el) return;
  el.focus();
  try { if (saved.selectionStart != null) el.setSelectionRange(saved.selectionStart, saved.selectionEnd); } catch (e) {}
}

function render() {
  const root = document.getElementById("root");
  const savedFocus = captureFocus();
  root.innerHTML = "";

  // PUBLIC MODE - ưu tiên cao nhất
  if (state.mode === "public") {
    root.appendChild(PublicMenuView());
    restoreFocus(savedFocus);
    return;
  }

  // CASHIER MODE
  if (state.authLoading) {
    root.appendChild(h("div", { className: "min-h-screen flex items-center justify-center" },
      h("div", { className: "text-gray-500" }, "Đang tải...")));
    restoreFocus(savedFocus);
    return;
  }
  if (!state.user) {
    root.appendChild(LoginView());
    restoreFocus(savedFocus);
    return;
  }
  root.appendChild(PosApp());
  restoreFocus(savedFocus);
}

// ============ Bootstrap ============
const m = window.location.pathname.match(/^\/menu\/(\d+)/);
if (m) {
  bootstrapPublicMode(parseInt(m[1], 10));
} else {
  initAuth();
}