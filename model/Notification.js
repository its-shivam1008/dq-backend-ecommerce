const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["invitation", "request", "update", "alert"],
      default: "invitation",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for better query performance
notificationSchema.index({ receiver: 1, status: 1 });
notificationSchema.index({ sender: 1 });
notificationSchema.index({ restaurantId: 1 });

// Instance Methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

notificationSchema.methods.updateStatus = function(status) {
  this.status = status;
  return this.save();
};

// Static Methods
notificationSchema.statics.getNotificationsByReceiver = function(receiverId) {
  return this.find({ receiver: receiverId })
    .populate('sender', 'username email')
    .populate('restaurantId', 'restaurantName')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.getNotificationsBySender = function(senderId) {
  return this.find({ sender: senderId })
    .populate('receiver', 'username email')
    .populate('restaurantId', 'restaurantName')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.getNotificationsByRestaurant = function(restaurantId) {
  return this.find({ restaurantId: restaurantId })
    .populate('sender', 'username email')
    .populate('receiver', 'username email')
    .sort({ createdAt: -1 });
};

notificationSchema.statics.getUnreadCount = function(receiverId) {
  return this.countDocuments({ receiver: receiverId, isRead: false });
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
