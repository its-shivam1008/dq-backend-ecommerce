const mongoose = require("mongoose");

const wasteMaterialSchema = new mongoose.Schema(
    {
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Inventory", // Reference to inventory model
            required: true,
        },
        stockName: {
            type: String,
            required: true,
            trim: true,
        },
        wasteQuantity: {
            type: Number,
            required: true,
            min: 0,
        },
        restaurantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        unit: {
            type: String,
            enum: ["kg", "ltr", "pcs", "gm","ml", "other"],
            default: "pcs",
        },
        note: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("WasteMaterial", wasteMaterialSchema);