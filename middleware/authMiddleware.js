const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require('../model/User');
dotenv.config();

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: "Invalid token" });
      }

      // ✅ decoded.id comes from login/signup
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      req.user = user;
      req.userId = user._id;  
      next();
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error in authMiddleware" });
  }
};

// Optional auth middleware - allows requests without token but attaches user if present
const optionalAuthMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, but that's okay - continue without user
      req.user = null;
      req.userId = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, async (err, decoded) => {
      if (err) {
        // Invalid token, but that's okay - continue without user
        req.user = null;
        req.userId = null;
        return next();
      }

      // Try to attach user if token is valid
      try {
        const user = await User.findById(decoded.id);
        req.user = user || null;
        req.userId = user?._id || null;
      } catch (e) {
        req.user = null;
        req.userId = null;
      }
      
      next();
    });
  } catch (err) {
    console.error(err);
    // Even on error, continue without user
    req.user = null;
    req.userId = null;
    next();
  }
};

module.exports = { authMiddleware, optionalAuthMiddleware };
