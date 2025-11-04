const mongoose = require("mongoose");

// -------------------------
// Subschema: Operating Hours
// -------------------------
const operatingHoursSchema = new mongoose.Schema(
  {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
  },
  { _id: false }
);

// -------------------------
// Main Schema: User Profile + Restaurant Details
// -------------------------
const userProfileSchema = new mongoose.Schema(
  {
    // ---------- USER DETAILS ----------
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    profileImage: {
      type: String,
      default: "https://pbs.twimg.com/media/EbNX_erVcAUlwIx.jpg:large",
    },
    firstName: { type: String, trim: true, required: true, default: "First Name" },
    lastName: { type: String, trim: true, required: true, default: "Last Name" },
    email: { type: String, trim: true, lowercase: true, required: true },
    phoneNumber: { type: String, required: true, default: "Not provided" },
    address: { type: String, required: true, default: "Not provided" },
    city: { type: String, trim: true, default: "Not provided" },
    pinCode: { type: String, required: true, default: "Not provided" },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
      required: true,
    },
    identity: { type: String, required: true, default: "Not provided" },
    identityNumber: { type: String, default: "Not provided" },
    fcm: { type: String, required: true, default: "Not provided" },
    permission: { type: String },

    // ---------- SOCIAL LINKS ----------
    facebook: { type: String, required: true, default: "Not provided" },
    instagram: { type: String, required: true, default: "Not provided" },
    whatsapp: { type: String, required: true, default: "Not provided" },

    // ---------- RESTAURANT DETAILS ----------
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurantName: {
      type: String,
      default: "Not provided",
      trim: true
    },
    ownerName: {
      type: String,
      default: "Not provided",
      trim: true
    },
    // cuisine: { type: String, trim: true },
    description: {
      type: String,
      default: "Not provided",
      trim: true
    },
    restaurantImage: {
      type: String,
      default: "../public/rest2.png"
    },
    features: [String],
    operatingHours: {
      type: operatingHoursSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// -------------------------
// Instance Methods
// -------------------------
userProfileSchema.methods.toggleStatus = async function () {
  this.status = this.status === "active" ? "inactive" : "active";
  return this.save();
};

userProfileSchema.methods.updateRating = async function (newRating) {
  this.totalReviews += 1;
  this.rating = ((this.rating * (this.totalReviews - 1)) + newRating) / this.totalReviews;
  return this.save();
};

// -------------------------
// Static Methods
// -------------------------
userProfileSchema.statics.getRestaurantsByCity = function (city) {
  return this.find({ city: new RegExp(city, "i"), status: "active" });
};

userProfileSchema.statics.searchRestaurants = function (searchTerm) {
  return this.find({
    $or: [
      { restaurantName: new RegExp(searchTerm, "i") },
      { cuisine: new RegExp(searchTerm, "i") },
      { city: new RegExp(searchTerm, "i") },
    ],
    status: "active",
  });
};

// -------------------------
const UserProfile = mongoose.model("UserProfile", userProfileSchema, "UserProfile");
module.exports = UserProfile;



// const mongoose = require("mongoose");
// const userProfileSchema = new mongoose.Schema(
//   {
//     profileImage: {
//       type: String,
//       default: "https://pbs.twimg.com/media/EbNX_erVcAUlwIx.jpg:large",
//     },
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     firstName: {
//       type: String,
//       trim: true,
//       default: "First Name",
//       required: true,
//     },
//     lastName: {
//       type: String,
//       trim: true,
//       default: "Last Name",
//       required: true,
//     },
//     email: {
//       type: String,
//       trim: true,
//       lowercase: true,
//     },
//     address: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     phoneNumber: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     pinCode: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     restName: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     restaurantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     gender: {
//       type: String,
//       enum: ["male", "female", "other"],
//       default: "male",
//       required: true,
//     },
//     identity: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     fcm: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     permission: {
//       type: String,
//     },
//     identityNumber: {
//       type: String,
//       default: "Not provided",
//     },
//     facebook: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     instagram: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//     whatsapp: {
//       type: String,
//       default: "Not provided",
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const UserProfile = mongoose.model("UserProfile", userProfileSchema, "UserProfile");

// module.exports = UserProfile;