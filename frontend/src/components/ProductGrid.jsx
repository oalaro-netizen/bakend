import React from "react";
import ProductCard from "./ProductCard";

export default function ProductGrid({ products, onLoadMore }) {
  return (
    <>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
      {onLoadMore && (
        <button className="load-more" onClick={onLoadMore}>
          Load More
        </button>
      )}
    </>
  );
}