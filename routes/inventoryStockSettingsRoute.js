const express = require("express");
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getInventoryStockSettings,
  createOrUpdateInventoryStockSettings
} = require("../controllers/InventoryStockSettingsController");

// Apply authentication middleware to all routes
router.use(authMiddleware);

// GET inventory stock settings
router.get("/", getInventoryStockSettings);

// POST create/update inventory stock settings
router.post("/", createOrUpdateInventoryStockSettings);

module.exports = router;
