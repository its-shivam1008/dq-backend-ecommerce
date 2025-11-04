const mongoose = require('mongoose');

// Simple Operating Hours Schema
const operatingHoursSchema = new mongoose.Schema({
  monday: {
    open: String,
    close: String,
    isOpen: {
      type: Boolean, default: true
    }
  },
  tuesday: {
    open: String, close: String,
    isOpen: {
      type: Boolean,
      default: true
    }
  },
  wednesday: {
    open: String,
    close: String,
    isOpen: { type: Boolean, default: true }
  },
  thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
  friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
  saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
  sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
}, { _id: false });

// Simplified Restaurant Schema
const restaurantSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // restaurantId:{
  //   type:String
  // },
  restaurantName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  email:
  {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  cuisine: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  restaurantImage:
  {
    type:
      String,
    trim: true
  },
  features: [String],
  operatingHours: {
    type: operatingHoursSchema,
    default: () => ({})
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Instance Methods
restaurantSchema.methods.toggleStatus = async function () {
  this.status = this.status === 'active' ? 'inactive' : 'active';
  return this.save();
};

restaurantSchema.methods.updateRating = async function (newRating) {
  this.totalReviews += 1;
  this.rating = ((this.rating * (this.totalReviews - 1)) + newRating) / this.totalReviews;
  return this.save();
};

// Static Methods
restaurantSchema.statics.getRestaurantsByCity = function (city) {
  return this.find({ city: new RegExp(city, 'i'), status: 'active' });
};

restaurantSchema.statics.searchRestaurants = function (searchTerm) {
  return this.find({
    $or: [
      { restaurantName: new RegExp(searchTerm, 'i') },
      { cuisine: new RegExp(searchTerm, 'i') },
      { city: new RegExp(searchTerm, 'i') },
    ],
    status: 'active'
  });
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;
