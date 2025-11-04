const express = require("express");
const mongoose = require('mongoose')
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
const floor = require('./routes/floorRoute.js')
const due = require('./routes/due.js')
const devlieryTiming = require('./routes/deliverymanagement.js')
const banner = require('./routes/banner.js')
const order = require('./routes/orderRoute.js')
const path = require("path");
const report = require('./routes/reportRoute.js')
const dashboard = require('./routes/dashboardRoute.js')
const coupen = require('./routes/CoupenRoute.js')
const uploadRoute = require("./routes/uploadRoute.js");
const restaurant = require('./routes/restaurant.js')
const loginActivity = require('./routes/loginActivity.js')
const settingsRoute = require('./routes/settingsRoute.js')
const taxRoute = require('./routes/taxRoute.js')
const memberRoute = require('./routes/memberRoutes.js')
const customerSettingsRoutes = require('./routes/customerSettings.js');
const Message = require('./routes/Message.js');
const inventoryStockSettingsRoutes = require('./routes/inventoryStockSettingsRoute.js');
const lowStockRoutes = require('./routes/lowStockRoute.js');
const emailTestRoutes = require('./routes/emailTestRoute.js');
const debugRoute = require('./routes/debugRoute.js');
const customLayoutRoutes = require('./routes/customLayout.js');
const { startCronJobs } = require('./services/CronJobService');
const { initializeAutoEmailService } = require('./services/AutoEmailService');
const Waste = require('./routes/WasteRoute.js')
const notificationRoute = require('./routes/notificationRoute.js')
const shortcutRoute = require('./routes/keyboardshortcutRoute.js')
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const allowedOrigins = [
  'https://dq-rms.vercel.app',
  'https://act-ecommerce-restaurent.vercel.app',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
};

// In non-production, allow all origins to prevent crashes during local/dev usage
if (process.env.NODE_ENV === 'production') {
  app.use(cors(corsOptions));
  // Explicitly handle preflight in production
  app.options('/(.*)', cors(corsOptions));
} else {
  app.use(cors({ origin: true, credentials: true }));
  app.options('/(.*)', cors({ origin: true, credentials: true }));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// DB connection
// DBConnect("mongodb+srv://nileshgoyal624_db_user:nilesh774@cluster0.t0sg444.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/dqdashboard");
DBConnect(process.env.MONGO_URL)
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB Atlas");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected");
});
// Default route
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Routes
app.use("/", authRouter);
// Expose reservation routes at root to avoid frontend routing issues
app.use(reservation);
app.use("/reservations", reservation)
app.use(Waste)
app.use(category)
app.use(customer)
app.use(supplier)
app.use(subcategory)
app.use(inventory)
app.use(memberRoute)
app.use(menu);
app.use(qr)
app.use(due)
app.use(floor)
app.use(devlieryTiming)
app.use(transactionRoutes);
app.use(userProfileRoutes);
app.use(order)
app.use(banner)
app.use(report)
app.use("/api/restaurant", restaurant)
app.use(dashboard)
app.use("/api/coupon", coupen)
app.use("/api/login-activity", loginActivity)
app.use("/api/settings", settingsRoute)
app.use("/api/tax", taxRoute)
app.use("/api/customer-settings", customerSettingsRoutes);
app.use("/api/send-message", Message);
app.use("/api/inventory-stock-settings", inventoryStockSettingsRoutes);
app.use("/api/low-stock", lowStockRoutes);
app.use("/api/email-test", emailTestRoutes);
app.use("/api/debug", debugRoute);
app.use("/api/notifications", notificationRoute);
app.use(customLayoutRoutes);
app.use(uploadRoute);
app.use(shortcutRoute);
// Start cron jobs
startCronJobs();

// Initialize auto email service
initializeAutoEmailService();

// 1. COMMENT this (for prod)
app.listen(PORT, () => {
  console.log(`🚀 Server started at http://localhost:${PORT}`);
});

// UNcomment this (for prod)
// module.exports = app;
