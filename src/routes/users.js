import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";
import User from "../models/user.js";

const router = express.Router();

// @route   POST /api/users/login
// @desc    Login user and generate JWT token (stored in localStorage by client)
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Please provide email and password",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "No user found with that email",
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
        message: "Incorrect password",
      });
    }

    // Generate JWT token (expires in 1 hour as per .env setting)
    const token = jwt.sign(
      { userId: user._id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      note: "Store the token in localStorage and send it in Authorization: Bearer <token> header for protected routes",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// @route   GET /api/users
// @desc    Get all users from MongoDB (protected route - requires JWT token)
// @access  Private
router.get("/", authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get a single user by MongoDB ID
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Not Found",
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// @route   POST /api/users
// @desc    Create a new user with hashed password in MongoDB
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate that all required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Please provide username, email, and password",
      });
    }

    // Check if a user with the same email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const duplicateField =
        existingUser.email.toLowerCase() === email.toLowerCase()
          ? "email"
          : "username";
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message: `A user with that ${duplicateField} already exists`,
      });
    }

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    const savedUser = await newUser.save();

    // Generate JWT token for the new user
    const token = jwt.sign(
      { userId: savedUser._id, username: savedUser.username, email: savedUser.email, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // Return response without the password
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      token: token,
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      },
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        messages,
      });
    }

    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(400).json({
        success: false,
        error: "Duplicate Field Error",
        message: `A user with that ${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
});     

export default router; 
