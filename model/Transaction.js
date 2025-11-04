const mongoose = require('mongoose');


const isSaleTransaction = function () {
  return !['CashIn', 'CashOut'].includes(this.type);
};
const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tableNumber: {
      type: String,
      required: function () { return isSaleTransaction.call(this); },
    },

    // Transaction status
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    // restaurantId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'User',
    //   required: true,
    // },
    // tableNumber: {
    //   type: String,
    //   required: true,
    // },

    // Transaction status
    // status: {
    //   type: String,
    //   enum: ['pending', 'completed', 'cancelled'],
    //   default: 'pending',
    // },

    // Items purchased
    // items: [
    //   {
    //     itemId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: 'Menu',
    //       required: true,
    //     },
    //     itemName: {
    //       type: String,
    //       required: true,
    //     },
    //     price: {
    //       type: Number,
    //       required: true,
    //     },
    //     quantity: {
    //       type: Number,
    //       required: true,
    //       min: 1,
    //     },
    //     selectedSubcategoryId: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: 'SubCategory',
    //       default: null,
    //     },
    //     subtotal: {
    //       type: Number,
    //       required: true,
    //     },
    //   },
    // ],
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Menu',
          required: true,
        },
        itemName: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        selectedSubcategoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SubCategory',
          default: null,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    // sub_total: {
    //   type: Number,
    //   required: true,
    // },
    tax: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    systemCharge: {
      type: Number,
      default: 0,
    },
    sub_total: {
      type: Number,
      // Make this required only if it's a sale transaction
      required: function () { return isSaleTransaction.call(this); },
    },
    // ... (tax, discount, etc. fields remain the same) ...
    total: {
      type: Number,
      required: true,
    },
    // total: {
    //   type: Number,
    //   required: true,
    // },

    // Payment details
    type: {
      type: String,
      enum: ['Cash', 'Online', 'Card', 'Split', 'CashIn', 'CashOut','bank_in', 'bank_out'],
      required: true,
    },

    // Additional notes
    notes: {
      type: String,
      default: '',
    },
    // soft deletion 
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletionRemark: {
      type: String,
      default: "",
    },
    // timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);
transactionSchema.pre('save', function (next) {
  // ... (pre-save hook code remains exactly the same) ...
  // Generate unique transaction ID if missing
  if (!this.transactionId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.transactionId = `TXN${timestamp}${random}`;
  }

  // Only perform calculations if items exist (for sale transactions)
  if (this.items && this.items.length > 0 ) {
    // Recalculate item subtotals
    this.items.forEach((item) => {
      item.subtotal = item.price * item.quantity;
    });

    // Calculate sub_total
    // this.sub_total = this.items.reduce((sum, item) => sum + item.subtotal, 0);

    // // Tax & Discount amounts
    // this.taxAmount = (this.sub_total * this.tax) / 100;
    // this.discountAmount = (this.sub_total * this.discount) / 100;

    // // Final total for sales
    // this.total =
    //   this.sub_total + this.taxAmount +this.systemCharge - this.discountAmount - this.roundOff;
  }

  next();
});
// 🔹 Pre-save hook
// transactionSchema.pre('save', function (next) {
//   // Generate unique transaction ID if missing
//   if (!this.transactionId) {
//     const timestamp = Date.now().toString().slice(-8);
//     const random = Math.random().toString(36).substr(2, 4).toUpperCase();
//     this.transactionId = `TXN${timestamp}${random}`;
//   }

//   // Recalculate item subtotals
//   this.items.forEach((item) => {
//     item.subtotal = item.price * item.quantity;
//   });

//   // Calculate sub_total
//   this.sub_total = this.items.reduce((sum, item) => sum + item.subtotal, 0);

//   // Tax & Discount amounts
//   this.taxAmount = (this.sub_total * this.tax) / 100;
//   this.discountAmount = (this.sub_total * this.discount) / 100;

//   // Final total
//   this.total =
//     this.sub_total + this.taxAmount - this.discountAmount + this.roundOff;

//   next();
// });

module.exports = mongoose.model('Transaction', transactionSchema);