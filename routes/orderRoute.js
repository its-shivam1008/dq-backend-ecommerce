const express = require("express");
const router = express.Router();
const orderController = require("../controllers/OrderController");
const {authMiddleware} = require("../middleware/authMiddleware");

// 📦 Order Routes
router.post("/create/order",  orderController.createOrder); // authMiddleware, hataya h customer menu se order bnane ke liye customer ke dwara kyuki uske paas token to hoga nhi 
router.get("/all/order", authMiddleware, orderController.getAllOrders);
router.get("/test-connection", orderController.testOrderConnection); // Test endpoint without auth
router.put('/orders/:id/status' , authMiddleware , orderController.updateOrderStatus)
router.post('/orders/active-tables',authMiddleware , orderController.getCombinedOrders);
router.get("/:id", authMiddleware, orderController.getOrderById);
// router.put("/:id", authMiddleware, orderController.updateOrder);
router.delete("/:id", authMiddleware, orderController.deleteOrder);

module.exports = router;