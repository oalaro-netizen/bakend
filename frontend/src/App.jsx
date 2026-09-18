import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import ProductGrid from "./components/ProductGrid";
import ProductDetail from "./pages/ProductDetail";
import AdminProducts from "./pages/AdminProducts";
import CartProvider, { useCart } from "./context/CartContext";
import { request } from "./services/api";
import "./index.css";

function AppContent() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

function Navbar() {
  const { itemCount } = useCart();
  return (
    <header className="site-header">
      <h1>🛍️ Bakend - E-Commerce Platform</h1>
      <nav>
        <Link to="/" className="nav-link">Products</Link>
        <Link to="/admin/products" className="nav-link">Admin Products</Link>
        <Link to="/cart" className="nav-link">Cart ({itemCount})</Link>
      </nav>
    </header>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const data = await request("/api/categories");
      const names = (data.data || []).map((c) => c.name);
      const known = ["Electronics", "Fashion", "Shoes", "Beauty", "Home", "Accessories"];
      const all = [...new Set([...known, ...names])];
      setCategories(all);
    } catch {
      setCategories(["Electronics", "Fashion", "Shoes", "Beauty", "Home", "Accessories"]);
    }
  }, []);

  const loadProducts = useCallback(
    async (pageNum, search, category) => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.set("page", pageNum);
        params.set("limit", "12");
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        const data = await request(`/api/products?${params.toString()}`);
        setProducts((prev) => (pageNum === 1 ? data.data : [...prev, ...data.data]));
        setTotal(data.total || data.count || 0);
        setHasMore(data.data.length > 0 && pageNum * 12 < (data.total || data.count || 0));
        setPage(pageNum);
      } catch (err) {
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCategories();
    loadProducts(1, "", "");
  }, [loadCategories, loadProducts]);

  const handleSearch = (term) => {
    setSearchTerm(term);
    loadProducts(1, term, filterCategory);
  };

  const handleFilter = (category) => {
    setFilterCategory(category);
    loadProducts(1, searchTerm, category);
  };

  const handleLoadMore = () => {
    loadProducts(page + 1, searchTerm, filterCategory);
  };

  return (
    <div className="main-content">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <select value={filterCategory} onChange={(e) => handleFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading && <div>Loading products...</div>}
      {error && <div className="error-state">Error: {error}</div>}
      {!loading && !error && products.length === 0 && (
        <div className="empty-state">No products found.</div>
      )}
      {!loading && !error && products.length > 0 && (
        <>
          <p className="results-info">
            Showing {products.length} of {total} products
          </p>
          <ProductGrid products={products} onLoadMore={hasMore ? handleLoadMore : null} />
        </>
      )}
    </div>
  );
}

function ProductDetailPage() {
  return <ProductDetailWithCart />;
}

function ProductDetailWithCart() {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleAddToCart = async (product, quantity) => {
    try {
      await addToCart(product, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="main-content">
      <ProductDetail onAddToCart={handleAddToCart} />
      {added && <div className="success-message">Added to cart successfully!</div>}
    </div>
  );
}

const App = () => (
  <div className="app">
    <AppContent />
  </div>
);

export default App;
