import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import { authenticateToken } from "../middleware/auth.js";
import { upload } from "../utils/cloudinary.js";

const router = express.Router();

function isAdmin(user) {
  return user && (user.role === "admin" || user.username === "admin");
}

function getUserId(req) {
  return req.user.userId || req.user.id || req.user._id;
}

// NOTE: "/cart" routes MUST be registered before "/:id" routes,
// otherwise GET /api/products/cart would match the "/:id" handler.

// GET /api/products - public list with pagination/search/filter/sort
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search, sort } = req.query;
    const query = {};
    if (category) query.category = new RegExp(category, "i");
    if (search) query.name = new RegExp(search, "i");

    const sortObj = {};
    if (sort === "priceAsc") sortObj.price = 1;
    else if (sort === "priceDesc") sortObj.price = -1;
    else sortObj.createdAt = -1;

    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 12));
    const safePage = Math.max(1, Number(page) || 1);

    const products = await Product.find(query)
      .sort(sortObj)
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit);

    const total = await Product.countDocuments(query);
    res.json({
      success: true,
      count: products.length,
      total,
      page: safePage,
      limit: safeLimit,
      data: products,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch products" });
  }
});

// GET /api/cart - get current user's cart
router.get("/cart", authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: getUserId(req) }).populate(
      "items.product",
      "name price image category stock"
    );
    if (!cart) return res.json({ success: true, data: { items: [] } });
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch cart" });
  }
});

// PATCH /api/cart/:id - update cart item quantity with server-side stock validation
router.patch("/cart/:id", authenticateToken, async (req, res) => {
  try {
    const qty = Number.parseInt(req.body.quantity, 10);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be a positive integer" });
    }
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const item = cart.items.find((i) => i.product.toString() === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Cart item not found" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (qty > product.stock) {
      return res.status(400).json({ success: false, message: "Requested quantity exceeds available stock" });
    }

    item.quantity = qty;
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update cart" });
  }
});

// DELETE /api/cart/:id - remove item from cart
router.delete("/cart/:id", authenticateToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: getUserId(req) });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter((i) => i.product.toString() !== req.params.id);
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update cart" });
  }
});

// GET /api/products/:id - public single product
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch product" });
  }
});

// POST /api/products - admin only with image upload
router.post("/", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: "Admin only" });
    const { name, description, price, category, stock } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "Image is required" });

    const product = new Product({
      name,
      description,
      price: Number(price),
      category,
      stock: Number(stock),
      image: req.file.secure_url || req.file.path,
    });
    await product.save();
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to create product" });
  }
});

// PATCH /api/products/:id - admin only
router.patch("/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: "Admin only" });
    const updates = { ...req.body };
    if (req.file) updates.image = req.file.secure_url || req.file.path;
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Failed to update product" });
  }
});

// DELETE /api/products/:id - admin only
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ success: false, message: "Admin only" });
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

// POST /api/products/:id/cart - add/update with server-side stock validation
router.post("/:id/cart", authenticateToken, async (req, res) => {
  try {
    const qty = Number.parseInt(req.body.quantity, 10) || 1;
    if (qty < 1) return res.status(400).json({ success: false, message: "Quantity must be at least 1" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    if (product.stock < 1) {
      return res.status(400).json({ success: false, message: "Product is out of stock" });
    }
    if (qty > product.stock) {
      return res.status(400).json({ success: false, message: "Requested quantity exceeds available stock" });
    }

    const userId = getUserId(req);
    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });

    const existing = cart.items.find((i) => i.product.toString() === req.params.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > product.stock) {
        return res.status(400).json({ success: false, message: "Cart quantity exceeds available stock" });
      }
      existing.quantity = newQty;
    } else {
      cart.items.push({ product: req.params.id, quantity: qty });
    }
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to add to cart" });
  }
});

export default router;
