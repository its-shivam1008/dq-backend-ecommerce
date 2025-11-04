const Notification = require("../model/Notification");
const User = require("../model/User");

module.exports = {
  // Create a new notification
  async createNotification(req, res) {
    try {
      const { receiver, message, type = "invitation", restaurantId } = req.body;
      const sender = req.user.id; // From auth middleware

      // Validation
      if (!receiver || !restaurantId) {
        return res.status(400).json({
          success: false,
          message: "Receiver और RestaurantId required हैं"
        });
      }

      // Check if receiver exists (by email if string, by ID if ObjectId)
      let receiverUser;
      if (receiver.includes('@')) {
        // If receiver is an email
        receiverUser = await User.findOne({ email: receiver });
        if (!receiverUser) {
          return res.status(404).json({
            success: false,
            message: "User with this email not found. Please ask them to register first."
          });
        }
      } else {
        // If receiver is an ID
        receiverUser = await User.findById(receiver);
        if (!receiverUser) {
          return res.status(404).json({
            success: false,
            message: "Receiver user नहीं मिला"
          });
        }
      }

      // Check if user is already in the same restaurant
      if (receiverUser.restaurantId && receiverUser.restaurantId.toString() === restaurantId) {
        return res.status(400).json({
          success: false,
          message: "User is already part of this restaurant"
        });
      }

      // Check if there's already a pending invitation
      const existingNotification = await Notification.findOne({
        sender: sender,
        receiver: receiverUser._id,
        restaurantId: restaurantId,
        status: 'pending'
      });

      if (existingNotification) {
        return res.status(400).json({
          success: false,
          message: "Invitation already sent to this user"
        });
      }

      // Check if restaurant exists
      const restaurantExists = await User.findById(restaurantId);
      if (!restaurantExists) {
        return res.status(404).json({
          success: false,
          message: "Restaurant नहीं मिला"
        });
      }

      const notification = new Notification({
        sender,
        receiver: receiverUser._id,
        restaurantId,
        message,
        type,
        status: "pending"
      });

      await notification.save();

      // Populate the response
      await notification.populate([
        { path: 'sender', select: 'username email' },
        { path: 'receiver', select: 'username email' },
        { path: 'restaurantId', select: 'restaurantName' }
      ]);

      res.status(201).json({
        success: true,
        message: "Notification successfully created",
        data: notification
      });

    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get notifications for a specific receiver
  async getNotificationsByReceiver(req, res) {
    try {
      const receiverId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      let query = { receiver: receiverId };
      if (status) {
        query.status = status;
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'username email')
        .populate('restaurantId', 'restaurantName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get notifications sent by a user
  async getNotificationsBySender(req, res) {
    try {
      const senderId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      let query = { sender: senderId };
      if (status) {
        query.status = status;
      }

      const notifications = await Notification.find(query)
        .populate('receiver', 'username email')
        .populate('restaurantId', 'restaurantName')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error("Get sent notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get notifications by restaurant
  async getNotificationsByRestaurant(req, res) {
    try {
      const { restaurantId } = req.params;
      const { status, page = 1, limit = 10 } = req.query;

      let query = { restaurantId };
      if (status) {
        query.status = status;
      }

      const notifications = await Notification.find(query)
        .populate('sender', 'username email')
        .populate('receiver', 'username email')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error("Get restaurant notifications error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Update notification status (accept/reject)
  async updateNotificationStatus(req, res) {
    try {
      const { notificationId } = req.params;
      const { status } = req.body;
      const userId = req.user.id;

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status 'accepted' या 'rejected' होना चाहिए"
        });
      }

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification नहीं मिला"
        });
      }

      // Check if user is the receiver
      if (notification.receiver.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "आप इस notification को update नहीं कर सकते"
        });
      }

      notification.status = status;
      await notification.save();

      // If notification is accepted, update user's restaurantId
      if (status === 'accepted') {
        const receiverUser = await User.findById(notification.receiver);
        if (receiverUser) {
          receiverUser.restaurantId = notification.restaurantId;
          await receiverUser.save();
          console.log(`User ${receiverUser.username} joined restaurant ${notification.restaurantId}`);
        }
      }

      await notification.populate([
        { path: 'sender', select: 'username email' },
        { path: 'receiver', select: 'username email' },
        { path: 'restaurantId', select: 'restaurantName' }
      ]);

      res.status(200).json({
        success: true,
        message: `Notification ${status} successfully`,
        data: notification
      });

    } catch (error) {
      console.error("Update notification status error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification नहीं मिला"
        });
      }

      // Check if user is the receiver
      if (notification.receiver.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "आप इस notification को read नहीं कर सकते"
        });
      }

      notification.isRead = true;
      await notification.save();

      res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification
      });

    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Get unread notification count
  async getUnreadCount(req, res) {
    try {
      const receiverId = req.user.id;
      const count = await Notification.getUnreadCount(receiverId);

      res.status(200).json({
        success: true,
        data: { unreadCount: count }
      });

    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  },

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification नहीं मिला"
        });
      }

      // Check if user is sender or receiver
      if (notification.sender.toString() !== userId && notification.receiver.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "आप इस notification को delete नहीं कर सकते"
        });
      }

      await Notification.findByIdAndDelete(notificationId);

      res.status(200).json({
        success: true,
        message: "Notification deleted successfully"
      });

    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message
      });
    }
  }
};
