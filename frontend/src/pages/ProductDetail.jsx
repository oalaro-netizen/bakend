import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { formatNaira } from "../utils/currency";
import { request } from "../services/api";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await request(`/api/products/${id}`);
      setProduct(data.data);
      setQuantity(1);
    } catch (err) {
      setError(err.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (delta) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= product.stock) {
      setQuantity(newQty);
    }
  };

  const handleAddToCart = async () => {
    if (!product || product.stock === 0) return;
    setAdding(true);
    try {
      await addToCart(product, quantity);
      alert(`Added ${quantity} of ${product.name} to cart`);
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="main-content">Loading product...</div>;
  if (error) return <div className="main-content error-state">Error: {error}</div>;
  if (!product) return <div className="main-content">Product not found</div>;

  const isOutOfStock = product.stock === 0;

  return (
    <div className="product-detail">
      <div className="detail-image">
        <img src={product.image} alt={product.name} />
      </div>
      <div className="detail-info">
        <h2>{product.name}</h2>
        <span className="category">{product.category}</span>
        <p className="description">{product.description}</p>
        <div className="detail-price">{formatNaira(product.price)}</div>
        <div className="stock-indicator">
          {isOutOfStock ? "Out of Stock" : `${product.stock} available`}
        </div>
        {!isOutOfStock && (
          <div className="quantity-selector">
            <button onClick={() => handleQuantityChange(-1)} disabled={quantity <= 1}>-</button>
            <span>{quantity}</span>
            <button onClick={() => handleQuantityChange(1)} disabled={quantity >= product.stock}>+</button>
          </div>
        )}
        <button
          className="add-to-cart-btn"
          disabled={isOutOfStock || adding}
          onClick={handleAddToCart}
        >
          {adding ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}