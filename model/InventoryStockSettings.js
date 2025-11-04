const mongoose = require('mongoose');

const inventoryStockSettingsSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    unique: true
  },
  lowStockThreshold: {
    type: Number,
    required: true,
    default: 10,
    min: [1, "Threshold must be at least 1"],
    max: [1000, "Threshold cannot exceed 1000"]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for restaurant queries
inventoryStockSettingsSchema.index({ restaurantId: 1 }, { unique: true });

const InventoryStockSettings = mongoose.model("InventoryStockSettings", inventoryStockSettingsSchema);
module.exports = InventoryStockSettings;
