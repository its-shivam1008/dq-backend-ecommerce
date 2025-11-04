const express = require("express");
const router = express.Router();
const DeliveryController = require("../controllers/DeliveryController");
const {authMiddleware} = require("../middleware/authMiddleware");

// ✅ CRUD Routes for Delivery
router.post("/", authMiddleware, DeliveryController.createDelivery);
router.get("/", authMiddleware, DeliveryController.getDeliveries);

router.get('/' , DeliveryController.)
router.get("/:id", authMiddleware, DeliveryController.getDeliveryById);
router.put("/:id", authMiddleware, DeliveryController.updateDelivery);
router.delete("/:id", authMiddleware, DeliveryController.deleteDelivery);

module.exports = router;