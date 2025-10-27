const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/RestaurantBannerController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Create or update banners
router.post("/", authMiddleware, bannerController.createOrUpdateBanners);

// Get banners by restaurantId
router.get("/:restaurantId", bannerController.getBannersByRestaurant);

// Delete banners by restaurantId
router.delete("/:restaurantId", authMiddleware, bannerController.deleteBanners);

module.exports = router;
