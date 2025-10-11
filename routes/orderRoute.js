const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController");
const {authMiddleware} = require("../middleware/authMiddleware");

// 📦 Order Routes
router.post("/create/order", orderController.createOrder); // No auth required for customer orders
router.get("/all/order", authMiddleware, orderController.getAllOrders);
router.put('/orders/:id/status' , authMiddleware , orderController.updateOrderStatus)
router.post('/orders/active-tables',authMiddleware , orderController.getCombinedOrders);
router.get("/orders/:id", authMiddleware, orderController.getOrderById); // Added /orders prefix to avoid conflicts
// router.put("/:id", authMiddleware, orderController.updateOrder);
router.delete("/orders/:id", authMiddleware, orderController.deleteOrder); // Added /orders prefix to avoid conflicts

module.exports = router;
