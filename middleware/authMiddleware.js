const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require('../model/User');
dotenv.config();

// Public/read-only endpoints that do not require auth
const isPublicRequest = (req) => {
  if (req.method !== 'GET') return false;
  const p = req.path || req.url || '';
  return (
    p.startsWith('/menu/allmenues') || // allow menu listing
    p === '/categories' ||             // allow categories listing
    p.startsWith('/public/') ||        // explicit public APIs
    p.startsWith('/custom-layout')     // custom layout endpoints are public
  );
};

const authMiddleware = (req, res, next) => {
  try {
    if (isPublicRequest(req)) return next();

    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: "Token expired" });
        }
        return res.status(403).json({ message: "Invalid token" });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      req.user = user;
      req.userId = user.restaurantId;
      req.actualUserId = user._id;
      next();
    });
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ message: "Server error in authMiddleware" });
  }
};

// Optional auth: set req.user if valid token is present; otherwise continue
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", async (err, decoded) => {
      if (err) return next();
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.userId = user.restaurantId;
        req.actualUserId = user._id;
      }
      next();
    });
  } catch (e) {
    return next();
  }
};

module.exports = { authMiddleware, optionalAuthMiddleware };
