/**
 * POS Demo - React Frontend
 * Component-based, gọi /api/menu từ Worker
 */

const { useState, useEffect, useMemo } = React;

function formatVND(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + " đ";
}

function Header({ storeName }) {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
            ☕
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-800">{storeName}</h1>
            <p className="text-xs text-stone-500">Cloudflare Workers + D1 Demo</p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
          ● Online
        </span>
      </div>
    </header>
  );
}

function CategoryTabs({ categories, active, onChange }) {
  return (
    <div className="sticky top-[73px] z-10 bg-stone-50 border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => onChange(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              active === null
                ? "bg-stone-900 text-white"
                : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                active === cat.id
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, onAdd }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden hover:shadow-md transition">
      <div className="aspect-[4/3] bg-stone-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-4xl">
            🍽️
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-stone-800 text-sm line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-orange-600 font-bold text-base">
            {formatVND(product.price)}
          </span>
          <button
            onClick={() => onAdd(product)}
            className="w-8 h-8 rounded-full bg-stone-900 hover:bg-orange-600 text-white flex items-center justify-center transition"
            aria-label="Thêm vào giỏ"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function Cart({ items, onUpdate, onCheckout }) {
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const count = items.reduce((sum, it) => sum + it.qty, 0);

  if (items.length === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4">
        <div className="max-w-5xl mx-auto text-center text-stone-500 text-sm">
          Giỏ hàng trống — chọn món để bắt đầu
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-stone-900 shadow-2xl">
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-stone-800">
            🛒 Giỏ hàng ({count} món)
          </span>
          <span className="text-xl font-bold text-orange-600">
            {formatVND(total)}
          </span>
        </div>
        <div className="max-h-32 overflow-y-auto mb-2 space-y-1">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between text-sm py-1"
            >
              <span className="flex-1 text-stone-700">{it.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdate(it.id, it.qty - 1)}
                  className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200"
                >
                  −
                </button>
                <span className="w-6 text-center font-medium">{it.qty}</span>
                <button
                  onClick={() => onUpdate(it.id, it.qty + 1)}
                  className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3 bg-stone-900 hover:bg-orange-600 text-white font-semibold rounded-lg transition"
        >
          Đặt hàng
        </button>
      </div>
    </div>
  );
}

// Mock data để preview local khi chưa deploy Worker.
// Khi deploy lên Cloudflare, /api/menu sẽ trả về dữ liệu thật từ D1.
const MOCK_MENU = {
  store_name: "Quán Cà Phê Demo",
  categories: [
    { id: 1, name: "Cà phê", sort_order: 1 },
    { id: 2, name: "Trà sữa", sort_order: 2 },
    { id: 3, name: "Nước ép", sort_order: 3 },
    { id: 4, name: "Bánh ngọt", sort_order: 4 },
  ],
  products: [
    { id: 1, category_id: 1, name: "Cà phê đen", price: 25000, image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400", available: 1 },
    { id: 2, category_id: 1, name: "Cà phê sữa đá", price: 30000, image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", available: 1 },
    { id: 3, category_id: 1, name: "Bạc xỉu", price: 35000, image_url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400", available: 1 },
    { id: 4, category_id: 2, name: "Trà sữa trân châu", price: 45000, image_url: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400", available: 1 },
    { id: 5, category_id: 2, name: "Trà đào cam sả", price: 40000, image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400", available: 1 },
    { id: 6, category_id: 3, name: "Nước ép cam", price: 35000, image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400", available: 1 },
    { id: 7, category_id: 3, name: "Sinh tố bơ", price: 45000, image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400", available: 1 },
    { id: 8, category_id: 4, name: "Bánh croissant", price: 25000, image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", available: 1 },
  ],
};

function App() {
  const [storeName, setStoreName] = useState("Đang tải...");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => {
        if (!r.ok) throw new Error("API lỗi: " + r.status);
        return r.json();
      })
      .then((data) => {
        setStoreName(data.store_name || "POS Demo");
        setCategories(data.categories || []);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback sang mock data khi chưa deploy / chạy local không có Worker
        setStoreName(MOCK_MENU.store_name + " (preview)");
        setCategories(MOCK_MENU.categories);
        setProducts(MOCK_MENU.products);
        setUsingMock(true);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    if (activeCat === null) return products;
    return products.filter((p) => p.category_id === activeCat);
  }, [products, activeCat]);

  const addToCart = (product) => {
    setCart((prev) => {
      const found = prev.find((it) => it.id === product.id);
      if (found) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, qty: it.qty + 1 } : it
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const updateCart = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((it) => it.id !== id));
    } else {
      setCart((prev) => prev.map((it) => (it.id === id ? { ...it, qty } : it)));
    }
  };

  const checkout = () => {
    const total = cart.reduce((sum, it) => sum + it.price * it.qty, 0);
    alert(
      `Đặt hàng thành công!\n\n${cart.length} món\nTổng: ${formatVND(total)}`
    );
    setCart([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500">Đang tải menu...</div>
      </div>
    );
  }

  if (error && !usingMock) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="font-bold text-red-700 mb-2">Lỗi kết nối</h2>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <p className="text-xs text-stone-600">
            Kiểm tra: đã chạy <code>wrangler d1 execute</code> chưa? Database_id đã đúng trong wrangler.toml chưa?
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40">
      {usingMock && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-2 text-center">
          ⚠️ Chế độ preview - dữ liệu mẫu. Deploy Worker để dùng D1 thật.
        </div>
      )}
      <Header storeName={storeName} />
      <CategoryTabs
        categories={categories}
        active={activeCat}
        onChange={setActiveCat}
      />
      <main className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addToCart} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-stone-500">
            Không có sản phẩm nào trong danh mục này
          </div>
        )}
      </main>
      <Cart items={cart} onUpdate={updateCart} onCheckout={checkout} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
