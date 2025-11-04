const mongoose = require("mongoose");

const floorSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String, // "Ground Floor", "1st Floor"
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);



const Floor = mongoose.model("Floor", floorSchema);

module.exports = Floor;
