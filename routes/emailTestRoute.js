const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  testEmailConfiguration,
  sendTestEmail
} = require("../controllers/EmailTestController");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET test email configuration
router.get("/config", testEmailConfiguration);

// POST send test email
router.post("/send", sendTestEmail);

module.exports = router;
