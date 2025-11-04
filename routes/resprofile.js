const express = require("express");
const multer = require("multer");
const RestaurantProfile = require("../model/RestaurantProfile");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Multer setup for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/rest-profile/:id", authMiddleware, async (req, res) => {
  try {
    const restaurant = await RestaurantProfile.findOne({ restaurantId: req.params.id });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/admin/check-permission/:id", authMiddleware, async (req, res) => {
  try {
      const { id } = req.params;
    const restaurant = await RestaurantProfile.findOne({ restaurantId: id });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ permission: restaurant.permission });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile/:id", authMiddleware, async (req, res) => {
  try {
      const { id } = req.params;
    const updatedProfile = await RestaurantProfile.findOneAndUpdate(
      { restaurantId:id },
      { $set: req.body },
      { new: true }
    );
    if (!updatedProfile) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(updatedProfile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.put("/restaurant/updateFcm/:id", authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const restaurant = await RestaurantProfile.findOneAndUpdate(
      { restaurantId: req.params.id },
      { fcmToken },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json({ fcmToken: restaurant.fcmToken });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.post("/profile/:id/image", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const restaurant = await RestaurantProfile.findOneAndUpdate(
      { restaurantId: req.params.id },
      { image: imageUrl },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({ image: restaurant.image });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;