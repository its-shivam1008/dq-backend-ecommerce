// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const { sendMessage, getSavedMessage } = require("../controllers/CustomerController");
const { authMiddleware } = require("../middleware/authMiddleware");

// POST - Send message to all customers and save to DB
router.post("/", authMiddleware, sendMessage);

// GET - Get saved message for restaurant
router.get("/", authMiddleware, getSavedMessage);

module.exports = router;
