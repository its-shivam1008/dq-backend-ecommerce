const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    rawItems: [
      {
        type: String,
        trim: true,
      },
    ],
    restaurantId: {
      type: String,
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.virtual("inventories", {
  ref: "Inventory",
  localField: "_id",
  foreignField: "supplierId",
});

// ✅ Fix: Use `mongoose.models` check
const Supplier =
  mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);

module.exports = Supplier;



// const mongoose = require("mongoose");
// const supplierSchema = new mongoose.Schema(
//   {
//     supplierName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       lowercase: true,
//       match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
//     },
//     phoneNumber: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     rawItem: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     restaurantId: {
//       type: String,
//     },
//     inventoryId: {
//       type:mongoose.Schema.Types.ObjectId,
//       ref: "Inventory"
//     }
//   },
//   {
//     timestamps: true,
//   }
// );

// supplierSchema.virtual("inventories", {
//   ref: "Inventory",
//   localField: "_id",
//   foreignField: "supplierId",
// });

// const Supplier = mongoose.model("Supplier", supplierSchema);

// module.exports = Supplier;