// backend/middleware/authMiddleware.js
export const authMiddleware = (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // TODO: Replace with actual JWT verification
    req.user = { id: "dummyUserId" };
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
