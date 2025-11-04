
const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      // required: true,
    },
    floorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Floor",
      required: true,
    },
    tableNumber: {
      type: String,
      trim: true,
      required: true,
    },
    qrImage: {
      type: String, // Cloudinary URL or base64
      trim: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate tables on the same floor in the same restaurant
qrCodeSchema.index(
  { restaurantId: 1, floorId: 1, tableNumber: 1 },
  { unique: true }
);

const QrCode = mongoose.model("QrCode", qrCodeSchema);
module.exports = QrCode;


// const mongoose = require("mongoose");

// const qrCodeSchema = new mongoose.Schema(
//   {
//     restaurantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Restaurant", // ✅ Better: reference the Restaurant collection
//       required: true,
//     },
//     tableNumber: {
//       type: String,
//       trim: true,
//       required: true,
//     },
//     qrImage: {
//       type: String, // base64 or Cloudinary URL
//       trim: true,
//       required: true,
//     },
//     qrCodeUrl: {
//       type: String,
//       default: null,
//       trim: true,
//     },
//   },
//   {
//     timestamps: true, // adds createdAt & updatedAt
//   }
// );

// const QrCode = mongoose.model("QrCode", qrCodeSchema);

// module.exports = QrCode;