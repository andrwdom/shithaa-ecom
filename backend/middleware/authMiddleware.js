// backend/middleware/authMiddleware.js

import jwt from "jsonwebtoken";

export default function authMiddleware(req, res, next) {
  try {
    // Try token from Authorization header
    const authHeader = req.headers["authorization"];
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // Or fallback to cookie
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    // 🔑 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultSecret");

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error("AuthMiddleware error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
}
