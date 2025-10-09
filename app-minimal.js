const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

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
