const express = require("express");
const router = express.Router();
const NotificationController = require("../controllers/NotificationController");
const { authMiddleware } = require('../middleware/authMiddleware');

// Create notification
router.post("/create", authMiddleware, NotificationController.createNotification);

// Get notifications for current user (receiver)
router.get("/my-notifications", authMiddleware, NotificationController.getNotificationsByReceiver);

// Get notifications sent by current user (sender)
router.get("/sent-notifications", authMiddleware, NotificationController.getNotificationsBySender);

// Get notifications by restaurant
router.get("/restaurant/:restaurantId", authMiddleware, NotificationController.getNotificationsByRestaurant);

// Update notification status (accept/reject)
router.put("/:notificationId/status", authMiddleware, NotificationController.updateNotificationStatus);

// Mark notification as read
router.put("/:notificationId/read", authMiddleware, NotificationController.markAsRead);

// Get unread notification count
router.get("/unread-count", authMiddleware, NotificationController.getUnreadCount);

// Delete notification
router.delete("/:notificationId", authMiddleware, NotificationController.deleteNotification);

module.exports = router;
