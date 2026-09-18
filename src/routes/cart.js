import express from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function getUserId(req) {
  return req.user.userId || req.user.id || req.user._id;
}

router.get("/", authenticateToken, async (req, res) => {
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

router.patch("/:id", authenticateToken, async (req, res) => {
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

router.delete("/:id", authenticateToken, async (req, res) => {
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

export default router;
