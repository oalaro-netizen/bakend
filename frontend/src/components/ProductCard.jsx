import React from "react";
import { Link } from "react-router-dom";
import { formatNaira } from "../utils/currency";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product }) {
  const isOutOfStock = product.stock === 0;
  const { addToCart } = useCart();
  const [adding, setAdding] = React.useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setAdding(true);
    try {
      await addToCart(product, 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="product-card">
      <Link to={`/products/${product._id}`} className="product-card-link">
        <img src={product.image} alt={product.name} />
        <h3>{product.name}</h3>
        <span className="category">{product.category}</span>
        <strong>{formatNaira(product.price)}</strong>
        {isOutOfStock ? (
          <span className="stock out">Out of Stock</span>
        ) : (
          <span className="stock in">{product.stock} available</span>
        )}
      </Link>
      <button
        className="add-btn"
        disabled={isOutOfStock || adding}
        onClick={handleAddToCart}
      >
        {adding ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  );
}