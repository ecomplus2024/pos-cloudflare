/**
 * POS Demo - React Frontend (plain JS, no JSX)
 * Tránh lỗi MIME khi deploy lên Cloudflare Workers
 */

const { useState, useEffect, useMemo } = React;

function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "className") el.className = v;
    else if (k === "onClick") el.onclick = v;
    else if (k === "onError") el.onerror = v;
    else if (k.startsWith("data-")) el.setAttribute(k, v);
    else if (k === "src" || k === "alt" || k === "type") el.setAttribute(k, v);
    else el[k] = v;
  });
  children.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return el;
}

// Mock data cho preview local khi chưa deploy
const MOCK_MENU = {
  store_name: "Quán Cà Phê Demo",
  categories: [
    { id: 1, name: "Cà phê", sort_order: 1 },
    { id: 2, name: "Trà sữa", sort_order: 2 },
    { id: 3, name: "Nước ép", sort_order: 3 },
    { id: 4, name: "Bánh ngọt", sort_order: 4 },
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
};

function Header(storeName) {
  return h("header", { className: "sticky top-0 z-10 bg-white shadow-sm border-b border-stone-200" },
    h("div", { className: "max-w-5xl mx-auto px-4 py-4 flex items-center justify-between" },
      h("div", { className: "flex items-center gap-3" },
        h("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold" }, "☕"),
        h("div", {},
          h("h1", { className: "text-lg font-bold text-stone-800" }, storeName),
          h("p", { className: "text-xs text-stone-500" }, "Cloudflare Workers + D1 Demo"),
        ),
      ),
      h("span", { className: "text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium" }, "● Online"),
    ),
  );
}

function CategoryTabs(props) {
  return h("div", { className: "sticky top-[73px] z-10 bg-stone-50 border-b border-stone-200" },
    h("div", { className: "max-w-5xl mx-auto px-4 py-3 overflow-x-auto" },
      h("div", { className: "flex gap-2 min-w-max" },
        h("button", {
          onClick: () => props.onChange(null),
          className: `px-4 py-2 rounded-full text-sm font-medium transition ${
            props.active === null
              ? "bg-stone-900 text-white"
              : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
          }`,
        }, "Tất cả"),
        ...props.categories.map((cat) =>
          h("button", {
            key: cat.id,
            onClick: () => props.onChange(cat.id),
            className: `px-4 py-2 rounded-full text-sm font-medium transition ${
              props.active === cat.id
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`,
          }, cat.name),
        ),
      ),
    ),
  );
}

function ProductCard(props) {
  const p = props.product;
  const img = p.image_url
    ? h("img", {
        src: p.image_url,
        alt: p.name,
        loading: "lazy",
        className: "w-full h-full object-cover",
        onError: (e) => { e.currentTarget.style.display = "none"; },
      })
    : h("div", { className: "w-full h-full flex items-center justify-center text-stone-400 text-4xl" }, "🍽️");

  return h("div", { className: "bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition" },
    h("div", { className: "aspect-[4/3] bg-stone-100 overflow-hidden" }, img),
    h("div", { className: "p-3" },
      h("h3", { className: "font-semibold text-stone-800 text-sm line-clamp-2 mb-1" }, p.name),
      h("div", { className: "flex items-center justify-between mt-2" },
        h("span", { className: "text-orange-600 font-bold text-base" }, formatVND(p.price)),
        h("button", {
          onClick: () => props.onAdd(p),
          className: "w-8 h-8 rounded-full bg-stone-900 hover:bg-orange-600 text-white flex items-center justify-center transition",
          "aria-label": "Thêm vào giỏ",
        }, "+"),
      ),
    ),
  );
}

function Cart(props) {
  const items = props.items;
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const count = items.reduce((s, it) => s + it.qty, 0);

  if (items.length === 0) {
    return h("div", { className: "fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4" },
      h("div", { className: "max-w-5xl mx-auto text-center text-stone-500 text-sm" },
        "Giỏ hàng trống — chọn món để bắt đầu"),
    );
  }

  return h("div", { className: "fixed bottom-0 left-0 right-0 bg-white border-t-2 border-stone-900 shadow-2xl" },
    h("div", { className: "max-w-5xl mx-auto p-4" },
      h("div", { className: "flex items-center justify-between mb-2" },
        h("span", { className: "font-semibold text-stone-800" }, `🛒 Giỏ hàng (${count} món)`),
        h("span", { className: "text-xl font-bold text-orange-600" }, formatVND(total)),
      ),
      h("div", { className: "max-h-32 overflow-y-auto mb-2 space-y-1" },
        ...items.map((it) =>
          h("div", { key: it.id, className: "flex items-center justify-between text-sm py-1" },
            h("span", { className: "flex-1 text-stone-700" }, it.name),
            h("div", { className: "flex items-center gap-2" },
              h("button", {
                onClick: () => props.onUpdate(it.id, it.qty - 1),
                className: "w-6 h-6 rounded bg-stone-100 hover:bg-stone-200",
              }, "−"),
              h("span", { className: "w-6 text-center font-medium" }, String(it.qty)),
              h("button", {
                onClick: () => props.onUpdate(it.id, it.qty + 1),
                className: "w-6 h-6 rounded bg-stone-100 hover:bg-stone-200",
              }, "+"),
            ),
          ),
        ),
      ),
      h("button", {
        onClick: props.onCheckout,
        className: "w-full py-3 bg-stone-900 hover:bg-orange-600 text-white font-semibold rounded-lg transition",
      }, "Đặt hàng"),
    ),
  );
}

function App() {
  const [state, setState] = useState({
    storeName: "Đang tải...",
    categories: [],
    products: [],
    activeCat: null,
    cart: [],
    loading: true,
    error: null,
    usingMock: false,
  });

  const set = (patch) => setState((s) => ({ ...s, ...patch }));

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => {
        if (!r.ok) throw new Error("API lỗi: " + r.status);
        return r.json();
      })
      .then((data) => set({
        storeName: data.store_name || "POS Demo",
        categories: data.categories || [],
        products: data.products || [],
        loading: false,
      }))
      .catch(() => set({
        storeName: MOCK_MENU.store_name + " (preview)",
        categories: MOCK_MENU.categories,
        products: MOCK_MENU.products,
        usingMock: true,
        loading: false,
      }));
  }, []);

  const filtered = useMemo(() => {
    if (state.activeCat === null) return state.products;
    return state.products.filter((p) => p.category_id === state.activeCat);
  }, [state.products, state.activeCat]);

  const addToCart = (product) => {
    setState((s) => {
      const found = s.cart.find((it) => it.id === product.id);
      if (found) {
        return { ...s, cart: s.cart.map((it) => it.id === product.id ? { ...it, qty: it.qty + 1 } : it) };
      }
      return { ...s, cart: [...s.cart, { id: product.id, name: product.name, price: product.price, qty: 1 }] };
    });
  };

  const updateCart = (id, qty) => {
    setState((s) => ({
      ...s,
      cart: qty <= 0 ? s.cart.filter((it) => it.id !== id) : s.cart.map((it) => it.id === id ? { ...it, qty } : it),
    }));
  };

  const checkout = () => {
    const total = state.cart.reduce((s, it) => s + it.price * it.qty, 0);
    alert(`Đặt hàng thành công!\n\n${state.cart.length} món\nTổng: ${formatVND(total)}`);
    set({ cart: [] });
  };

  const root = document.getElementById("root");

  if (state.loading) {
    root.innerHTML = "";
    root.appendChild(h("div", { className: "min-h-screen flex items-center justify-center" },
      h("div", { className: "text-stone-500" }, "Đang tải menu..."),
    ));
    return;
  }

  if (state.error && !state.usingMock) {
    root.innerHTML = "";
    root.appendChild(h("div", { className: "min-h-screen flex items-center justify-center p-4" },
      h("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 max-w-md" },
        h("h2", { className: "font-bold text-red-700 mb-2" }, "Lỗi kết nối"),
        h("p", { className: "text-sm text-red-600 mb-3" }, state.error),
        h("p", { className: "text-xs text-stone-600" },
          "Kiểm tra: đã chạy ", h("code", {}, "wrangler d1 execute"), " chưa? Database_id đã đúng trong wrangler.toml chưa?"),
      ),
    ));
    return;
  }

  // Render UI
  root.innerHTML = "";
  const wrapper = h("div", { className: "min-h-screen pb-40" });

  if (state.usingMock) {
    wrapper.appendChild(h("div", { className: "bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 text-center" },
      "⚠️ Chế độ preview - dữ liệu mẫu. Deploy Worker để dùng D1 thật."));
  }

  wrapper.appendChild(Header(state.storeName));
  wrapper.appendChild(CategoryTabs({
    categories: state.categories,
    active: state.activeCat,
    onChange: (id) => set({ activeCat: id }),
  }));

  const main = h("main", { className: "max-w-5xl mx-auto px-4 py-4" },
    h("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" },
      ...filtered.map((p) => ProductCard({ product: p, onAdd: addToCart })),
    ),
  );

  if (filtered.length === 0) {
    main.appendChild(h("div", { className: "text-center py-12 text-stone-500" }, "Không có sản phẩm nào trong danh mục này"));
  }

  wrapper.appendChild(main);
  wrapper.appendChild(Cart({ items: state.cart, onUpdate: updateCart, onCheckout: checkout }));
  root.appendChild(wrapper);
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
