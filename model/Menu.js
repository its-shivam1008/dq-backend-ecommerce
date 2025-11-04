const mongoose = require("mongoose");
const menuSchema = new mongoose.Schema(
  {
    menuId: { type: String, required: true },
    itemName: { type: String, required: true, trim: true },
    itemImage: { type: String, default: null },
    price: { type: Number, min: 0, default: 0 },

    sizes: [
      {
        name: { type: String, trim: true },
        label: { type: String, trim: true },
        price: { type: Number, required: true, min: 0 },
        enabled: { type: Boolean, default: true },
      },
    ],

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categoryName: {   // ✅ new field
      type: String,
      required: true,
      trim: true,
    },

    restaurantId: {
      type: String,
      ref: "User",
      required: true
    },

    stock: { type: Number, default: 0, min: 0 },
    status: { type: Number, default: 1, enum: [0, 1] },
    sub_category: { type: String, trim: true },

    stockItems: [
      {
        stockId: { type: String },
        quantity: { type: Number, default: 0, min: 0 }, // inventory stock quantity used
        unit: {
          type: String,
          enum: ["kg", "litre", "gm", "pcs", "mg", "ml"],
        },
        size: { type: String, trim: true }, // size name (half, full, etc.)
        price: { type: Number, min: 0, default: 0 }, // price for this specific size
      },
    ],

    description: { type: String, trim: true },
    preparationTime: { type: Number, min: 0 },
    rewardPoints: { type: Number, default: 0, min: 0 },
    // isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


menuSchema.index({ restaurantId: 1, categoryId: 1 });
menuSchema.index({ restaurantId: 1, itemName: 1 });
menuSchema.index({ status: 1 });

// Virtual for availability check
menuSchema.virtual("isAvailable").get(function () {
  return this.status === 1 && this.stock > 0;
});

// Instance methods
menuSchema.methods.updateStock = function (newStock) {
  this.stock = Math.max(0, newStock);
  return this.save();
};

menuSchema.methods.toggleStatus = function () {
  this.status = this.status === 1 ? 0 : 1;
  return this.save();
};

// Pre-save middleware to clean up sizes and validate data
menuSchema.pre("save", function (next) {
  // Clean up sizes - remove empty ones and ensure proper format
  if (this.sizes && this.sizes.length > 0) {
    this.sizes = this.sizes.filter((size) => {
      const hasName = size.name?.trim() || size.label?.trim();
      const hasValidPrice = typeof size.price === "number" && size.price > 0;
      return hasName && hasValidPrice;
    });

    // Ensure backward compatibility - sync name and label fields
    this.sizes.forEach((size) => {
      if (size.name && !size.label) {
        size.label = size.name;
      } else if (size.label && !size.name) {
        size.name = size.label;
      }
    });
  }

  // Log warning if stock is 0 and status is active
  if (this.stock === 0 && this.status === 1) {
    console.log(`Warning: Item ${this.itemName} stock is 0 but status is active`);
  }

  next();
});

// Static methods
menuSchema.statics.findByRestaurant = function (restaurantId) {
  return this.find({ restaurantId }).populate("categoryId", "categoryName");
};

menuSchema.statics.findActiveItems = function (restaurantId) {
  return this.find({ restaurantId, status: 1 }).populate("categoryId", "categoryName");
};

const Menu = mongoose.model("Menu", menuSchema, "Menu");
module.exports = Menu;