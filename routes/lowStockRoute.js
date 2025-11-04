const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  triggerLowStockCheckManual,
  getLowStockItemsForRestaurant,
  getCronJobStatusController,
  debugSystemStatus,
  testLowStockWithThreshold,
  triggerAutoEmailCheck,
  triggerImmediateEmailTest,
  debugUserEmailLookup,
  testEmailToUser
} = require("../controllers/LowStockController");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET low stock items for a restaurant
router.get("/items", getLowStockItemsForRestaurant);

// POST trigger manual low stock check
router.post("/check", triggerLowStockCheckManual);

// GET cron job status
router.get("/status", getCronJobStatusController);

// GET debug system status
router.get("/debug", debugSystemStatus);

// GET test low stock with specific threshold
router.get("/test", testLowStockWithThreshold);

// POST trigger auto email check
router.post("/auto-check", triggerAutoEmailCheck);

// POST trigger immediate email test for all restaurants
router.post("/immediate-test", triggerImmediateEmailTest);

// GET debug user email lookup
router.get("/debug-user-email", debugUserEmailLookup);

// POST test email to specific user
router.post("/test-email-to-user", testEmailToUser);

module.exports = router;
