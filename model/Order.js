const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  selectedSubcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null
  },
  subtotal: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    items: {
      type: [orderItemSchema], // Updated to use the detailed item schema
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Order must contain at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"],
      default: "pending"
    },
    deliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      default: null
    },

    // New fields for KOT integration
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tableNumber: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true
    },
    customerAddress: {
      type: String,
      default: '',
      trim: true
    },
    orderType: {
      type: String,
      enum: ['dine-in', 'takeaway', 'delivery', 'KOT'],
      default: 'dine-in'
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    kotGenerated: {
      type: Boolean,
      default: false
    },
    invoiceGenerated: {
      type: Boolean,
      default: false
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'completed', 'refunded'],
      default: 'pending'
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

// Indexes for better performance
orderSchema.index({ restaurantId: 1, createdAt: -1 });
orderSchema.index({ tableNumber: 1, status: 1 });
orderSchema.index({ customerId: 1 });
orderSchema.index({ status: 1 });

orderSchema.pre("save", async function (next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.orderId = `ORD-${timestamp}${random}`; // e.g. ORD-458721ABCD
  }
  
  // Auto-populate customerAddress from customer collection if not already set
  if (this.customerId && !this.customerAddress) {
    try {
      const Customer = mongoose.model('Customer');
      const customer = await Customer.findById(this.customerId);
      if (customer && customer.address) {
        this.customerAddress = customer.address;
      }
    } catch (error) {
      console.error('Error populating customer address:', error);
    }
  }
  
  next();
});

// Post-save hook to update customer's totalSpent when order is completed
orderSchema.post("save", async function (doc) {
  // Only update if order is completed/served and has customerId
  if (doc.customerId && (doc.status === 'completed' || doc.status === 'served')) {
    try {
      const Customer = mongoose.model('Customer');
      const Order = mongoose.model('Order');
      
      // Calculate total spent from all completed/served orders for this customer
      const orders = await Order.find({ 
        customerId: doc.customerId,
        status: { $in: ['completed', 'served'] }
      });

      const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      // Update customer's totalSpent
      await Customer.findByIdAndUpdate(
        doc.customerId,
        { totalSpent },
        { new: true }
      );

      console.log(`Updated total spent for customer ${doc.customerId}: ₹${totalSpent}`);
    } catch (error) {
      console.error('Error updating customer total spent:', error);
    }
  }
});


// Check if the model is already compiled, if not create it
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;