const mongoose = require('mongoose');

const KeyboardShortcutSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    action: {
        type: String,
        required: true,
        unique: true,
    },
    keys: [
        {
            combination: {
                type: [String], // e.g. ["Ctrl", "Shift", "S"]
                required: true,
                validate: {
                    validator: function (v) {
                        return v.length > 0;
                    },
                    message: props => `${props.value} must contain at least one key!`
                }
            },
            description: {
                type: String,
                default: ''
            }
        }
    ],
    isActive:{
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('KeyboardShortcut', KeyboardShortcutSchema);
