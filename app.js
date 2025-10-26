const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const DBConnect = require("./DB/DBconnect.js");
const authRouter = require("./routes/auth.js");
const transactionRoutes = require("./routes/transactionRoute.js");
const userProfileRoutes = require("./routes/userProfileRoute.js");
const category = require('./routes/category.js');
const customer = require('./routes/CustomerRoute.js')
const supplier = require('./routes/supplierRoute.js')
const inventory = require('./routes/inventoryRoute.js')
const reservation = require('./routes/reservationRoute.js')
const menu = require('./routes/menu.js')
const subcategory = require('./routes/subcategory.js')
const qr = require('./routes/QrRoutes.js')
const due = require('./routes/due.js')
const devlieryTiming = require('./routes/deliverymanagement.js')
const banner = require('./routes/banner.js')
const order = require('./routes/orderRoute.js')
const path = require("path");
const report = require('./routes/reportRoute.js')
const coupen = require('./routes/CoupenRoute.js')
const customLayout = require('./routes/customLayout.js')
// require('./cron/reportCron');

dotenv.config();

function createApp() {
  const app = express();

  // CORS configuration
  const allowedOrigins = [
    'https://act-ecommerce-restaurent.vercel.app',
    'https://act-resto-backend.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl or server-to-server)
      if (!origin) return callback(null, true);
      // Allow all Vercel preview deployments and configured origins
      if (origin && (origin.includes('.vercel.app') || allowedOrigins.includes(origin))) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
    credentials: true,
    optionsSuccessStatus: 204,
  };

  // Middleware
  app.use(cors(corsOptions));
  // Explicitly handle preflight for all routes
  app.options('*', cors(corsOptions));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // DB connection - only connect if MONGO_URL is provided
  if (process.env.MONGO_URL) {
    DBConnect(process.env.MONGO_URL);
  } else {
    console.log("⚠️ MONGO_URL not provided - running without database connection");
  }

  // Default route - serve a simple welcome message
  app.get("/", (req, res) => {
    res.json({
      message: "🍽️ DQ Backend Ecommerce API is Running Successfully!",
      status: "OK",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/health",
        api: "All your existing API routes are available"
      }
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

  // Routes
  app.use("/", authRouter);
  
  // IMPORTANT: Reservation routes must come BEFORE inventory routes
  // to prevent /:id route conflict with /available-slots
  app.use(reservation);
  
  // Other routes
  app.use(category);
  app.use(customer);
  app.use(supplier);
  app.use(subcategory);
  app.use(inventory); // This has /:id route that catches everything
  app.use(menu);
  app.use(qr);
  app.use(due);
  app.use(devlieryTiming);
  app.use(transactionRoutes);
  app.use(userProfileRoutes);
  app.use(order);
  app.use(banner);
  app.use(report);
  app.use(coupen);
  app.use(customLayout);

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