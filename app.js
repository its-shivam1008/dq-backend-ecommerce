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
// require('./cron/reportCron');

dotenv.config();

function createApp() {
  const app = express();

  // CORS configuration
  const allowedOrigins = [
    'https://act-ecommerce-restaurent.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_ORIGIN,
  ].filter(Boolean);

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
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

  // DB connection
  DBConnect(process.env.MONGO_URL);

  // Default route - serve the landing page
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
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
  app.use(category);
  app.use(customer);
  app.use(supplier);
  app.use(subcategory);
  app.use(reservation);
  app.use(inventory);
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

  return app;
}

module.exports = createApp;