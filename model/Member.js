const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // required: true
  },
  minSpend: {
    type: Number,
    required: true,
  },
  membershipName: {
    type: String,
    required: true,
    trim: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage',
  },
  discount: {
    type: Number,
    required: true,
    min: 0,

  },
  status: {
    type: String,
    enum: ["active", "inactive", "expired"],
    default: "active",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  expirationDate: {
    type: Date,
  },
  visitsCount: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

memberSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.expirationDate < Date.now()) {
    this.status = "expired";
  }
  next();
});

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;