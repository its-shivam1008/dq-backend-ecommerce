const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logintime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    logouttime: {
      type: Date,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "logged_out"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index for better query performance
loginActivitySchema.index({ userId: 1, logintime: -1 });
loginActivitySchema.index({ status: 1 });

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema, "LoginActivity");
module.exports = LoginActivity;
