/**
 * POS Cashier UI - plain JS, không JSX
 * Layout theo Pos.jsx: tables grid → menu → cart panel → checkout modal
 */

const { useState, useEffect, useMemo } = React;

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

// Mock fallback cho local preview
const MOCK = {
  store_name: "Quán Cà Phê Demo",
  categories: [
    { id: 1, name: "Cà phê" },
    { id: 2, name: "Trà sữa" },
    { id: 3, name: "Nước ép" },
    { id: 4, name: "Bánh ngọt" },
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

function App() {
  const [view, setView] = useState("tables"); // 'tables' | 'menu' | 'orders'
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

  // Load menu + tables
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
        setStoreName(MOCK.store_name + " (preview)");
        setCategories(MOCK.categories);
        setProducts(MOCK.products);
        setTables(MOCK.tables);
        setUsingMock(true);
      });
  }, []);

  const loadOrders = () => {
    fetch("/api/orders")
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders || []))
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    if (view === "orders") loadOrders();
  }, [view]);

  const filtered = useMemo(() => {
    let list = products;
    if (selectedCategory !== null) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, search]);

  const cartTotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  const addToCart = (p) => {
    setCart((c) => {
      const found = c.find((it) => it.id === p.id);
      if (found) return c.map((it) => (it.id === p.id ? { ...it, qty: it.qty + 1 } : it));
      return [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }];
    });
    showToast(`Đã thêm ${p.name}`);
  };

  const updateQty = (id, delta) => {
    setCart((c) =>
      c
        .map((it) => (it.id === id ? { ...it, qty: it.qty + delta } : it))
        .filter((it) => it.qty > 0)
    );
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const selectTable = (t) => {
    setSelectedTable(t);
    setCart([]);
    setSelectedCategory(null);
    setView("menu");
  };

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    const payload = {
      table_id: selectedTable.id,
      order_type: "dine_in",
      payment_method: paymentMethod,
      items: cart.map((c) => ({
        product_id: c.id,
        product_name: c.name,
        price: c.price,
        quantity: c.qty,
      })),
    };
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lỗi");

      // Refresh tables
      const tbl = await fetch("/api/tables").then((r) => r.json());
      setTables(tbl.tables || []);
      setShowCheckout(false);
      setCart([]);
      showToast(`Đã gửi order #${data.order_id} - Thành công!`);
      setTimeout(() => {
        setSelectedTable(null);
        setView("tables");
      }, 1500);
    } catch (err) {
      showToast("Lỗi: " + err.message);
    }
  };

  // ============== Render ==============
  const root = document.getElementById("root");
  root.innerHTML = "";
  const wrap = h("div", { className: "flex flex-col h-screen bg-gray-50 font-sans text-gray-900" });

  // ===== Header =====
  const header = h("header", { className: "bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between" },
    h("div", { className: "flex items-center gap-3" },
      h("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg" }, "☕"),
      h("div", {},
        h("div", { className: "font-bold text-gray-900" }, storeName),
        h("div", { className: "text-xs text-gray-500" }, usingMock ? "Preview mode" : "Cloudflare Workers + D1"),
      ),
    ),
    h("nav", { className: "flex gap-2" },
      h("button", {
        onClick: () => setView("tables"),
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${view === "tables" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`,
      }, "🪑 Bàn"),
      h("button", {
        onClick: () => setView("orders"),
        className: `px-4 py-2 rounded-lg font-medium text-sm transition ${view === "orders" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`,
      }, "📋 Đơn hàng"),
    ),
    h("div", { className: "text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium" }, "● Online"),
  );
  wrap.appendChild(header);

  // ===== Main + Cart layout =====
  const main = h("div", { className: "flex-1 flex overflow-hidden" });

  // --- LEFT: Main view ---
  const leftPane = h("div", { className: "flex-1 overflow-y-auto p-4 md:p-6" });

  if (view === "tables") {
    // Tables grid
    leftPane.appendChild(h("div", { className: "mb-4 flex items-center justify-between" },
      h("h2", { className: "text-xl font-bold" }, "Sơ đồ bàn"),
      h("div", { className: "text-sm text-gray-500" }, `${tables.filter(t => t.status === 'empty').length} trống / ${tables.filter(t => t.status === 'occupied').length} có khách`),
    ));
    const grid = h("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" });
    tables.forEach((t) => {
      const occupied = t.status === "occupied";
      const card = h("button", {
        onClick: () => selectTable(t),
        className: `p-4 rounded-2xl border-2 text-left transition hover:scale-[1.02] ${
          occupied
            ? "bg-red-50 border-red-300 hover:border-red-500"
            : "bg-emerald-50 border-emerald-300 hover:border-emerald-500"
        }`,
      },
        h("div", { className: "flex items-center justify-between mb-2" },
          h("span", { className: "font-bold text-lg" }, t.name),
          h("span", { className: `text-xs px-2 py-0.5 rounded-full font-semibold ${
            occupied ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
          }` }, occupied ? "Có khách" : "Trống"),
        ),
        occupied && t.pending_order
          ? h("div", { className: "text-sm text-red-700 font-semibold" }, "Tạm tính: " + formatVND(t.pending_order.total))
          : h("div", { className: "text-sm text-emerald-700" }, "Sẵn sàng order"),
      );
      grid.appendChild(card);
    });
    leftPane.appendChild(grid);
  } else if (view === "menu" && selectedTable) {
    // Menu: search + categories + grid
    const topBar = h("div", { className: "mb-4 flex items-center justify-between gap-3" },
      h("div", {},
        h("button", {
          onClick: () => { setSelectedTable(null); setView("tables"); setCart([]); },
          className: "text-sm text-gray-500 hover:text-gray-900 mb-1",
        }, "← Quay lại"),
        h("h2", { className: "text-xl font-bold" }, `Bàn: ${selectedTable.name}`),
      ),
      h("input", {
        type: "search",
        placeholder: "🔍 Tìm món...",
        value: search,
        oninput: (e) => setSearch(e.target.value),
        className: "px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500",
      }),
    );
    leftPane.appendChild(topBar);

    // Category tabs
    const catTabs = h("div", { className: "flex gap-2 mb-4 overflow-x-auto pb-2" });
    const allBtn = h("button", {
      onClick: () => setSelectedCategory(null),
      className: `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
        selectedCategory === null ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
      }`,
    }, "Tất cả");
    catTabs.appendChild(allBtn);
    categories.forEach((c) => {
      catTabs.appendChild(h("button", {
        onClick: () => setSelectedCategory(c.id),
        className: `px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
          selectedCategory === c.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"
        }`,
      }, c.name));
    });
    leftPane.appendChild(catTabs);

    // Product grid
    if (filtered.length === 0) {
      leftPane.appendChild(h("div", { className: "text-center py-16 text-gray-400" }, "Không có sản phẩm"));
    } else {
      const grid = h("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" });
      filtered.forEach((p) => {
        const card = h("button", {
          onClick: () => addToCart(p),
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
        );
        grid.appendChild(card);
      });
      leftPane.appendChild(grid);
    }
  } else if (view === "orders") {
    leftPane.appendChild(h("h2", { className: "text-xl font-bold mb-4" }, "Đơn hàng gần đây"));
    if (orders.length === 0) {
      leftPane.appendChild(h("div", { className: "text-center py-16 text-gray-400" }, "Chưa có đơn nào"));
    } else {
      const list = h("div", { className: "space-y-2" });
      orders.forEach((o) => {
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

  // --- RIGHT: Cart panel (only in menu view) ---
  if (view === "menu" && selectedTable) {
    const cartPane = h("aside", { className: "w-80 bg-white border-l flex flex-col" },
      h("div", { className: "p-4 border-b" },
        h("div", { className: "flex items-center justify-between" },
          h("h3", { className: "font-bold text-lg" }, "🛒 Giỏ hàng"),
          h("span", { className: "text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold" }, `${cartCount} món`),
        ),
      ),
      h("div", { className: "flex-1 overflow-y-auto p-3 space-y-2" },
        cart.length === 0
          ? h("div", { className: "text-center py-8 text-gray-400 text-sm" }, "Chưa có món nào")
          : cart.map((it) => h("div", { className: "flex items-center gap-2 p-2 bg-gray-50 rounded-lg" },
              h("div", { className: "flex-1" },
                h("div", { className: "font-semibold text-sm" }, it.name),
                h("div", { className: "text-xs text-orange-600 font-bold" }, formatVND(it.price)),
              ),
              h("button", {
                onClick: () => updateQty(it.id, -1),
                className: "w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 font-bold",
              }, "−"),
              h("span", { className: "w-6 text-center font-semibold" }, it.qty),
              h("button", {
                onClick: () => updateQty(it.id, +1),
                className: "w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-bold",
              }, "+"),
            )),
      ),
      cart.length > 0
        ? h("div", { className: "p-4 border-t bg-gray-50" },
            h("div", { className: "flex justify-between items-center mb-3" },
              h("span", { className: "text-gray-600 font-medium" }, "Tổng cộng"),
              h("span", { className: "text-2xl font-bold text-orange-600" }, formatVND(cartTotal)),
            ),
            h("button", {
              onClick: () => setShowCheckout(true),
              className: "w-full py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition",
            }, "Thanh toán"),
          )
        : h("div", { className: "p-4 border-t text-center text-gray-400 text-xs" }, "Chọn món để bắt đầu"),
    );
    main.appendChild(cartPane);
  }

  wrap.appendChild(main);

  // ===== Checkout Modal =====
  if (showCheckout) {
    const overlay = h("div", { className: "fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4", onclick: () => setShowCheckout(false) },
      h("div", { className: "bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full", onclick: (e) => e.stopPropagation() },
        h("h3", { className: "text-xl font-bold mb-4" }, "Thanh toán"),
        h("div", { className: "bg-gray-50 p-3 rounded-lg mb-4 space-y-1" },
          cart.map((it) => h("div", { className: "flex justify-between text-sm" },
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
              onClick: () => setPaymentMethod(m),
              className: `p-3 rounded-lg border-2 font-semibold transition ${
                paymentMethod === m
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 hover:border-gray-300"
              }`,
            }, m === "cash" ? "💵 Tiền mặt" : "📱 Chuyển khoản")),
          ),
        ),
        h("div", { className: "flex gap-2" },
          h("button", {
            onClick: () => setShowCheckout(false),
            className: "flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50",
          }, "Hủy"),
          h("button", {
            onClick: submitOrder,
            className: "flex-1 py-3 bg-gray-900 hover:bg-orange-600 text-white font-bold rounded-lg transition",
          }, "Xác nhận"),
        ),
      ),
    );
    wrap.appendChild(overlay);
  }

  // ===== Toast =====
  if (toast) {
    wrap.appendChild(h("div", { className: "fixed top-20 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium animate-pulse" }, toast));
  }

  root.appendChild(wrap);
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));