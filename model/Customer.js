const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    membershipName: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    birthday: Date,
    anniversary: Date,
    corporate: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: Number,
      default: 0,
      min: 0,
    },
    customerType: {
      type: String,
      enum: ["FirstTimer", "Corporate", "Regular", "Lost Customer", "High Spender"],
      default: "FirstTimer",
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    earnedPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardCustomerPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    rewardByAdminPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReward: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Pre-save hook to update totalReward before saving
customerSchema.pre("save", function (next) {
  // Calculate totalReward before saving
  if (this.isModified('rewardCustomerPoints') || this.isModified('rewardByAdminPoints') || !this.totalReward) {
    const customerPoints = Number(this.rewardCustomerPoints) || 0;
    const adminPoints = Number(this.rewardByAdminPoints) || 0;
    this.totalReward = customerPoints + adminPoints;
  }

  // Auto-assign customerType when frequency or totalSpent change
  if (this.isModified('frequency') || this.isModified('totalSpent')) {
    if (this.frequency === 0) {
      this.customerType = "FirstTimer";
    } else if (this.totalSpent > 500) {
      this.customerType = "High Spender";
    } else if (this.frequency >= 10) {
      this.customerType = "Regular";
    } else if (this.frequency >= 1 && this.frequency <= 3) {
      this.customerType = "Lost Customer";
    }
  }

  next();
});

customerSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (
    update.rewardCustomerPoints !== undefined ||
    update.rewardByAdminPoints !== undefined
  ) {
    const customerPoints = Number(update.rewardCustomerPoints ?? 0);
    const adminPoints = Number(update.rewardByAdminPoints ?? 0);
    update.totalReward = customerPoints + adminPoints;
  }

  // Auto-assign customerType when frequency or totalSpent change
  if (update.frequency !== undefined || update.totalSpent !== undefined) {
    if (update.frequency === 0) {
      update.customerType = "FirstTimer";
    } else if (update.totalSpent > 500) {
      update.customerType = "High Spender";
    } else if (update.frequency >= 10) {
      update.customerType = "Regular";
    } else if (update.frequency >= 1 && update.frequency <= 3) {
      update.customerType = "Lost Customer";
    }
  }

  this.setUpdate(update);
  next();
});

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;