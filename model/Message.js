// model/Message.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  restaurantId: {
    type: String,
    required: true,
    unique: true
  },
  message: {
    type: String,
    required: true
  },
  couponId: {  
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
