import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function token() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, { headers, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const cartReducer = (state, action) => {
  switch (action.type) {
    case "SET_CART":
      return action.cart;
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.product._id === action.item.product._id || i.product === action.item.product);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product._id === action.item.product._id || i.product === action.item.product
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items.map((i) =>
          i.product._id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      };
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.product._id !== action.productId) };
    case "CLEAR":
      return { ...state, items: [] };
    default:
      return state;
  }
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    fetchCart();
  }, []);

  async function fetchCart() {
    try {
      const data = await request("/api/cart");
      dispatch({ type: "SET_CART", cart: data.data || data });
    } catch {
      // no cart yet
    }
  }

  async function addToCart(product, quantity = 1) {
    const data = await request(`/api/products/${product._id}/cart`, {
      method: "POST",
      body: JSON.stringify({ quantity }),
    });
    dispatch({ type: "SET_CART", cart: data.data || data });
    return data;
  }

  async function updateCartQuantity(productId, quantity) {
    const data = await request(`/api/cart/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    dispatch({ type: "SET_CART", cart: data.data || data });
    return data;
  }

  async function removeFromCart(productId) {
    const data = await request(`/api/cart/${productId}`, { method: "DELETE" });
    dispatch({ type: "SET_CART", cart: data.data || data });
    return data;
  }

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const total = state.items.reduce((sum, i) => sum + (i.product.price || 0) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart: state, addToCart, updateCartQuantity, removeFromCart, itemCount, total, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

export { request };