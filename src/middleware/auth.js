import jwt from "jsonwebtoken";

/**
 * JWT Authentication Middleware
 * Verifies a JWT token from the Authorization header
 * 
 * Expected header format: Authorization: Bearer <token>
 * 
 * On success, attaches decoded payload to `req.user`
 */
export function authenticateToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  // If no token, reject
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Missing authorization token",
      message: "Authentication required"
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Invalid or expired token
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        message: "The authentication token has expired"
      });
    }
    return res.status(401).json({
      success: false,
      error: "Invalid token",
      message: "The authentication token is invalid"
    });
  }
}

/**
 * Optional: Get current user info (without strict validation)
 * Useful for admin-only routes where we trust the caller
 */
export function getCurrentUser(req, res, next) {
  if (req.user) {
    next();
  } else {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required"
    });
  }
}
