const mongoose = require('mongoose');

const restaurantProfileSchema = new mongoose.Schema({
  // Personal Details
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '-'],
    default: '-',
  },

  // Restaurant Details
  restaurantName: {
    type: String,
    required: true,
    trim: true,
  },
  restaurantID: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    type: String,
    default: '-',
  },
  pinCode: {
    type: String,
    default: '-',
  },

  // Identity Details
  identityType: {
    type: String,
    default: '-',
  },
  identityNumber: {
    type: String,
    default: '-',
  },

  // Contact Details
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  phoneNumber: {
    type: String,
    default: '-',
  },

  // Profile Photo
  profilePhoto: {
    type: String, 
    default: '', 
  },

  // Custom Layout for Admin UI Builder
  customLayout: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Admin Permission
  permission: {
    type: String,
    enum: ['admin', 'user', 'manager'],
    default: 'user',
  },
}, { timestamps: true });

module.exports = mongoose.model('RestaurantProfile', restaurantProfileSchema);
