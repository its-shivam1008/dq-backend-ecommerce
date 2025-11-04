const mongoose = require('mongoose')

const taxSchema = new mongoose.Schema({
  taxName: {
    type: String,
    required: true,
    trim: true
  },
  taxCharge: {
    type: String,
    required: true,
    trim: true
  },
  taxType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurants',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
})

// Index for restaurant queries (non-unique to allow multiple taxes per restaurant)
taxSchema.index({ restaurantId: 1 }, { unique: false })

module.exports = mongoose.model('Tax', taxSchema)
