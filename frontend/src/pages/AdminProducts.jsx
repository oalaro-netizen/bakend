import React, { useState, useEffect } from "react";
import { request } from "../services/api";
import { formatNaira } from "../utils/currency";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", category: "", stock: "", image: "" });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await request("/api/products");
      setProducts(data.data || []);
    } catch (err) {
      console.error("Failed to load:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("description", form.description);
      fd.append("price", form.price);
      fd.append("category", form.category);
      fd.append("stock", form.stock);
      if (imageFile) fd.append("image", imageFile);

      if (editing) {
        fd.append("_method", "PATCH");
        await request(`/api/products/${editing._id}`, {
          method: "PATCH",
          body: fd,
        });
      } else {
        await request("/api/products", { method: "POST", body: fd });
      }
      setShowForm(false);
      setEditing(null);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await request(`/api/products/${id}`, { method: "DELETE" });
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description, price: p.price, category: p.category, stock: p.stock, image: p.image });
    setShowForm(true);
  };

  return (
    <div className="admin-products">
      <h2>Admin Products</h2>
      <button onClick={() => { setShowForm(true); setEditing(null); }}>Create Product</button>

      {showForm && (
        <form onSubmit={handleSubmit} className="product-form">
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required />
          <input type="number" step="0.01" placeholder="Price (NGN)" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} required />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})} required />
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
          <button type="submit">{editing ? "Update" : "Create"}</button>
          <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        </form>
      )}

      <div className="admin-table">
        <table>
          <thead>
            <tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td><img src={p.image} alt="" width="40" /></td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{formatNaira(p.price)}</td>
                <td>{p.stock}</td>
                <td>
                  <button onClick={() => handleEdit(p)}>Edit</button>
                  <button onClick={() => handleDelete(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}