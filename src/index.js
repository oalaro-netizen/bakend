import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import passport from "passport";
import connectDB from "./utils/db.js";
import { authenticateToken } from "./middleware/auth.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import Product from "./models/Product.js";
import Cart from "./models/Cart.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// Session middleware for OAuth
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
await connectDB();

// ==========================================
// SAMPLE DATA STORE (In-Memory Database)
// ==========================================
const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin", createdAt: "2026-01-15" },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "user", createdAt: "2026-02-10" },
  { id: 3, name: "Charlie Davis", email: "charlie@example.com", role: "user", createdAt: "2026-03-05" },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "moderator", createdAt: "2026-04-12" }
];

const products = [
  { id: 101, name: "Wireless Mechanical Keyboard", category: "electronics", price: 89.99, inStock: true, stock: 45 },
  { id: 102, name: "Ergonomic Gaming Mouse", category: "electronics", price: 49.99, inStock: true, stock: 80 },
  { id: 103, name: "27-inch 4K Monitor", category: "electronics", price: 349.99, inStock: false, stock: 0 },
  { id: 104, name: "Leather Notebook", category: "stationery", price: 15.50, inStock: true, stock: 120 },
  { id: 105, name: "Gel Ink Pen Set", category: "stationery", price: 9.99, inStock: true, stock: 200 }
];

const posts = [
  { id: 1, title: "Getting Started with Express 5", content: "Learn how to build RESTful APIs with Node.js and Express.", tags: ["nodejs", "express", "backend"], authorId: 1, createdAt: "2026-01-20" },
  { id: 2, title: "Mastering MongoDB & Mongoose", content: "Deep dive into document modeling and aggregation pipelines.", tags: ["mongodb", "database"], authorId: 1, createdAt: "2026-02-14" },
  { id: 3, title: "Building Responsive Web Apps", content: "Best practices for mobile-first frontend design.", tags: ["frontend", "css", "web"], authorId: 2, createdAt: "2026-03-01" }
];

const comments = [
  { id: 1, postId: 1, userId: 2, comment: "Great introduction to Express!", createdAt: "2026-01-21" },
  { id: 2, postId: 1, userId: 3, comment: "Very helpful code examples, thanks.", createdAt: "2026-01-22" },
  { id: 3, postId: 2, userId: 4, comment: "Clear explanation of Mongoose schemas.", createdAt: "2026-02-15" }
];

const categories = [
  { id: 1, name: "electronics", displayName: "Electronics & Gadgets", itemCount: 3 },
  { id: 2, name: "stationery", displayName: "Stationery & Office Supplies", itemCount: 2 },
  { id: 3, name: "books", displayName: "Books & Publications", itemCount: 0 }
];

// ==========================================
// 10 DISTINCT GET REQUESTS / ENDPOINTS
// ==========================================

// 1. GET Root / API Index Endpoint
// URL: http://localhost:8000/
app.get("/", (req, res) => {
  try {
    const responseData = {
      success: true,
      message: "Welcome to the Express Backend API",
      status: "online",
      timestamp: new Date().toISOString(),
      availableEndpoints: [
        "GET /",
        "GET /health",
        "POST /api/users/register",  // Register new user (returns JWT)
        "POST /api/users/login",     // Login user (returns JWT)
        "GET  /api/users",          // List users (PROTECTED - requires JWT)
        "GET  /api/users/:id",      // Get single user (PROTECTED - requires JWT)
        "GET  /api/products",
        "GET  /api/products/:id",
        "GET  /api/posts",
        "GET  /api/posts/:id/comments",
        "GET  /api/categories",
        "GET  /api/stats"          // Protected - requires JWT
      ]
    };
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

// 2. GET Server Health & Status Endpoint
// URL: http://localhost:8000/health
app.get("/health", (req, res) => {
  try {
    const healthStatus = {
      success: true,
      status: "currently running",
      uptime: `${process.uptime().toFixed(2)} seconds`,
      memoryUsage: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      },
      dbState: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    };
    return res.status(200).json(healthStatus);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve health status",
      message: error.message
    });
  }
});

// 3. Authentication & User Routes (MongoDB / Mongoose)
// Mount user routes at /api/users
// The /api/users router contains:
//   - POST /api/users/register -> Register a new user (returns JWT token)
//   - POST /api/users/login    -> Login user (returns JWT token)
//   - GET  /api/users          -> List users (PROTECTED - requires JWT)
//   - GET  /api/users/:id      -> Get single user (PROTECTED - requires JWT)
app.use("/api/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);

// 5. GET All Products (replaced by MongoDB-backed routes in /api/products)
// Legacy in-memory endpoints removed - use MongoDB-backed /api/products routes

// Helper to seed sample products if none exist
async function seedProducts() {
  const count = await Product.countDocuments();
  if (count === 0) {
    const sampleProducts = [
      { name: "Wireless Mechanical Keyboard", category: "Electronics", description: "Premium mechanical keyboard with RGB backlighting", price: 89.99, stock: 45 },
      { name: "Ergonomic Gaming Mouse", category: "Electronics", description: "High-precision gaming mouse with adjustable DPI", price: 49.99, stock: 80 },
      { name: "27-inch 4K Monitor", category: "Electronics", description: "Ultra HD monitor with HDR support", price: 349.99, stock: 0 },
      { name: "Leather Notebook", category: "Stationery", description: "Genuine leather-bound notebook for daily use", price: 15.50, stock: 120 },
      { name: "Gel Ink Pen Set", category: "Stationery", description: "Set of 10 gel ink pens in assorted colors", price: 9.99, stock: 200 }
    ];
    // Assign placeholder images for seed products
    for (const p of sampleProducts) {
      p.image = "https://placehold.co/800x800/38bdf8/ffffff?text=" + encodeURIComponent(p.name.split(' ').slice(0,2).join('+'));
    }
    await Product.insertMany(sampleProducts);
    console.log("✅ Seed products added to MongoDB");
  }
}
seedProducts().catch((err) => console.error("Seed error:", err));

// 7. GET All Posts (supports query filter: ?tag=nodejs)
// URL: http://localhost:8000/api/posts
// URL with query: http://localhost:8000/api/posts?tag=nodejs
app.get("/api/posts", (req, res) => {
  try {
    const { tag, search } = req.query;
    let result = [...posts];

    // Filter by tag
    if (tag) {
      result = result.filter(p => p.tags.includes(tag.toLowerCase()));
    }

    // Keyword search in title or content
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(keyword) ||
        p.content.toLowerCase().includes(keyword)
      );
    }

    const responseData = {
      success: true,
      count: result.length,
      total: posts.length,
      data: result
    };
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

// 8. GET Comments for a Specific Post
// URL: http://localhost:8000/api/posts/1/comments
app.get("/api/posts/:id/comments", (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);

    // Validate ID format
    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: "Post ID parameter must be a valid number"
      });
    }

    // Verify parent post exists
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: `Post with ID ${postId} was not found`
      });
    }

    const postComments = comments.filter(c => c.postId === postId);

    const responseData = {
      success: true,
      postId: postId,
      postTitle: post.title,
      count: postComments.length,
      comments: postComments
    };
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

// 9. GET Categories List
// URL: http://localhost:8000/api/categories
app.get("/api/categories", (req, res) => {
  try {
    const responseData = {
      success: true,
      count: categories.length,
      data: categories
    };
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    });
  }
});

// 10. GET Application Stats & Analytics Dashboard (PROTECTED - requires JWT)
// URL: http://localhost:8000/api/stats
app.get("/api/stats", authenticateToken, (req, res) => {
  try {
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers: users.length,
        totalProducts: products.length,
        totalPosts: posts.length,
        totalComments: comments.length,
        totalCategories: categories.length,
        serverUptime: `${process.uptime().toFixed(2)} seconds`,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development"
      }
    };
    return res.status(200).json(responseData);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message
    }); 
  }
});

// ==========================================
// OTHER ROUTES & ERROR HANDLING
// ==========================================


// 404 Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route Not Found",
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
