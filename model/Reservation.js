const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      ref:"User",
      // required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Make optional in case customer is not registered
    },
    customerName: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      default: '',
    },
    payment: {
      type: Number,
      default: 0,
      min: 0, // Ensure non-negative values
    },
    advance: {
      type: Number,
      default: 0,
      min: 0, // Ensure non-negative values
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add validation to ensure endTime is after startTime
reservationSchema.pre('save', function(next) {
  if (this.startTime >= this.endTime) {
    next(new Error('End time must be after start time'));
  } else {
    next();
  }
});

// Add index for better query performance
reservationSchema.index({ restaurantId: 1, startTime: 1 });

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;