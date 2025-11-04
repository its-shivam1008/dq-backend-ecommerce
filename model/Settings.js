const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
  systemName: {
    type: String,
    required: true,
    trim: true
  },
  chargeOfSystem: {
    type: String,
    required: true,
    trim: true
  },
  willOccupy: {
    type: Boolean,
    required: true,
    default: false
  },
  color: { 
    type: String, 
    default: '#ff0000',
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

// Index for restaurant queries (non-unique to allow multiple systems per restaurant)
settingsSchema.index({ restaurantId: 1 }, { unique: false })

module.exports = mongoose.model('Settings', settingsSchema)