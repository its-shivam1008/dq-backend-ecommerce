const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage'
    },
    
    discountValue: {
      type: Number,
      required: true,
      min: 0
    },
    
    expiryDate: {
      type: Date,
      required: true,
    },
    
    isActive: {
      type: Boolean,
      default: true
    },
    
    usageCount: {
      type: Number,
      default: 0
    },
    
    maxUsage: {
      type: Number,
      default: null 
    },
    
    minOrderValue: {
      type: Number,
      default: 0
    },
    
    maxDiscountAmount: {
      type: Number,
      default: null
    },
    
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ expiryDate: 1 });
couponSchema.index({ restaurantId: 1, isActive: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if coupon is active
  if (!this.isActive) {
    return { valid: false, message: 'Coupon is not active' };
  }
  
  // Check if coupon is expired
  if (this.expiryDate < now) {
    return { valid: false, message: 'Coupon has expired' };
  }
  
  // Check usage limit
  if (this.maxUsage && this.usageCount >= this.maxUsage) {
    return { valid: false, message: 'Coupon usage limit exceeded' };
  }
  
  return { valid: true, message: 'Coupon is valid' };
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function(orderTotal) {
  // Check minimum order value
  if (orderTotal < this.minOrderValue) {
    return {
      applicable: false,
      message: `Minimum order value of ₹${this.minOrderValue} required`,
      discountAmount: 0
    };
  }
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (orderTotal * this.discountValue) / 100;
    
    // Apply maximum discount limit if set
    if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
      discountAmount = this.maxDiscountAmount;
    }
  } else if (this.discountType === 'fixed') {
    discountAmount = this.discountValue;
    
    // Don't allow discount to exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }
  }
  
  return {
    applicable: true,
    discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    message: `Discount of ₹${discountAmount.toFixed(2)} applied`
  };
};

// Pre-save middleware to ensure code is uppercase
couponSchema.pre('save', function(next) {
  if (this.code) {
    this.code = this.code.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Coupon', couponSchema);