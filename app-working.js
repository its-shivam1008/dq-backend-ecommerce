const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const DBConnect = require("./DB/DBconnect.js");

dotenv.config();

function createApp() {
  const app = express();

  // CORS configuration
  app.use(cors({
    origin: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
  }));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // DB connection - only connect if MONGO_URL is provided
  if (process.env.MONGO_URL) {
    DBConnect(process.env.MONGO_URL);
  } else {
    console.log("⚠️ MONGO_URL not provided - running without database connection");
  }

  // Default route - serve a comprehensive welcome message
  app.get("/", (req, res) => {
    res.json({
      message: "🍽️ DQ Backend Ecommerce API is Running Successfully!",
      status: "OK",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        authentication: "/signin, /signup (or /api/auth/*)",
        categories: "/api/categories",
        menu: "/api/menu",
        orders: "/api/orders",
        customers: "/api/customers",
        suppliers: "/api/suppliers",
        inventory: "/api/inventory",
        reservations: "/api/reservations",
        subcategories: "/api/subcategories",
        qr_codes: "/api/qr",
        due_transactions: "/api/due",
        banners: "/api/banners",
        reports: "/api/reports",
        coupons: "/api/coupons"
      },
      note: "Both old routes (like /signin) and new API routes (like /api/auth/*) are supported for backward compatibility"
    });
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      message: "DQ Backend Ecommerce API is running successfully",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Add auth routes first (most important for login)
  try {
    const authRouter = require("./routes/auth.js");
    console.log("✅ Auth routes loaded successfully");
    // Add backward-compatible routes for frontend (this will handle /signin)
    app.use("/", authRouter);
    // Add API-prefixed routes
    app.use("/api/auth", authRouter);
  } catch (error) {
    console.log("❌ Auth routes not loaded:", error.message);
  }

  try {
    const category = require('./routes/category.js');
    // Mount under /api to produce /api/categories, /api/category/:id, etc.
    app.use("/api", category);
    // Backward-compatible routes (e.g., /categories)
    app.use("/", category);
  } catch (error) {
    console.log("Category routes not loaded:", error.message);
  }

  try {
    const menu = require('./routes/menu.js');
    // Mount under /api to produce /api/menu/add, /api/menu/allmenues, etc.
    app.use("/api", menu);
    // Backward-compatible routes (e.g., /menu/add)
    app.use("/", menu);
  } catch (error) {
    console.log("Menu routes not loaded:", error.message);
  }

  try {
    const order = require('./routes/orderRoute.js');
    // Mount under /api to produce /api/create/order, etc.
    app.use("/api", order);
    // Backward-compatible routes
    app.use("/", order);
  } catch (error) {
    console.log("Order routes not loaded:", error.message);
  }

  // Add other essential routes for backward compatibility
  try {
    const customer = require('./routes/CustomerRoute.js');
    app.use("/", customer);
  } catch (error) {
    console.log("Customer routes not loaded:", error.message);
  }

  try {
    const supplier = require('./routes/supplierRoute.js');
    app.use("/", supplier);
  } catch (error) {
    console.log("Supplier routes not loaded:", error.message);
  }

  try {
    const inventory = require('./routes/inventoryRoute.js');
    app.use("/", inventory);
  } catch (error) {
    console.log("Inventory routes not loaded:", error.message);
  }

  try {
    const reservation = require('./routes/reservationRoute.js');
    app.use("/", reservation);
  } catch (error) {
    console.log("Reservation routes not loaded:", error.message);
  }

  // Error handling middleware (must be last)
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: "Something went wrong"
    });
  });

  return app;
}

module.exports = createApp;
