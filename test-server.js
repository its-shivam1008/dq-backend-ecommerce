const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const DBConnect = require("./DB/DBconnect.js");

console.log('Starting minimal test server...');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB connection
if (process.env.MONGO_URL) {
  DBConnect(process.env.MONGO_URL);
} else {
  console.log("⚠️ MONGO_URL not provided - running without database connection");
}

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Test server is running", status: "OK" });
});

// Add reservation routes - TEST ONLY
try {
  console.log('Loading reservation routes...');
  const reservation = require('./routes/reservationRoute.js');
  app.use('/api', reservation); // Mount under /api prefix
  console.log('✅ Reservation routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading reservation routes:', error.message);
  console.error('Stack:', error.stack);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server is running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/`);
  console.log(`📍 Reservation routes: http://localhost:${PORT}/api/available-slots`);
});