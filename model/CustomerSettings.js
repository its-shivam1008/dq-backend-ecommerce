const mongoose = require("mongoose");

const customerSettingsSchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
        unique: true
    },
    lostCustomerDays: {
        type: Number,
        default: 60,
        min: 1,
        max: 365
    },
    highSpenderAmount: {
        type: Number,
        required: true,
        default: 1000,
        min: [1, "Value must be at least 1"],
        max: [365, "Value cannot exceed 365"]
    },
    regularCustomerDays: {
        type: Number,
        default: 30,
        min: 1,
        max: 365
    }
}, {
    timestamps: true
});

const CustomerSettings = mongoose.model("CustomerSettings", customerSettingsSchema);
module.exports = CustomerSettings;
