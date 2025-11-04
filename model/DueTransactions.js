const mongoose = require("mongoose");

const dueTransactionSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: function () {
        return this.total; // Initially remaining = total
      },
    },
    customerName: {
      type: String,
    },
    status: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
  },
  {
    timestamps: true,
  }
);

// Update remaining automatically before saving
dueTransactionSchema.pre("save", function (next) {
  this.remainingAmount = this.total - this.paidAmount;
  this.status = this.remainingAmount <= 0 ? "paid" : "unpaid";
  next();
});

const DueTransaction = mongoose.model("DueTransaction", dueTransactionSchema);

module.exports = DueTransaction;



// const mongoose = require("mongoose");

// const dueTransactionSchema = new mongoose.Schema(
//   {
//     customer_id: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Customer",
//     },
//     total: {
//       type: Number,
//     },
//     customerName:{
//       type:String
//     },
//     status: {
//       type: String,
//       enum: ["paid" , "unpaid"],
//     },
//     restaurantId: {
//       type: String,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const DueTransaction = mongoose.model("DueTransaction", dueTransactionSchema);

// module.exports = DueTransaction;