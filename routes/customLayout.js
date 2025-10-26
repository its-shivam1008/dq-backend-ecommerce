const express = require("express");
const RestaurantProfile = require("../model/RestaurantProfile");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Get custom layout for a restaurant (public - so customers can see admin changes)
router.get("/custom-layout/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log('📖 Fetching custom layout for restaurant:', restaurantId);
    
    const restaurant = await RestaurantProfile.findOne({ restaurantID: restaurantId });
    
    if (!restaurant) {
      console.log('⚠️ Restaurant not found:', restaurantId);
      return res.status(404).json({ 
        success: false, 
        message: "Restaurant not found" 
      });
    }
    
    console.log('✅ Custom layout retrieved successfully');
    res.json({ 
      success: true,
      layout: restaurant.customLayout || null 
    });
  } catch (err) {
    console.error('❌ Error fetching custom layout:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  }
});

// Save custom layout (requires authentication)
router.post("/custom-layout/:restaurantId", authMiddleware, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { layout } = req.body;
    
    console.log('💾 Saving custom layout for restaurant:', restaurantId);
    
    if (!layout) {
      return res.status(400).json({ 
        success: false,
        message: "Layout data is required" 
      });
    }
    
    const restaurant = await RestaurantProfile.findOneAndUpdate(
      { restaurantID: restaurantId },
      { 
        customLayout: layout,
        updatedAt: new Date()
      },
      { new: true, upsert: false }
    );
    
    if (!restaurant) {
      console.log('⚠️ Restaurant not found for update:', restaurantId);
      return res.status(404).json({ 
        success: false,
        message: "Restaurant not found" 
      });
    }
    
    console.log('✅ Custom layout saved successfully');
    res.json({ 
      success: true,
      message: "Layout saved successfully",
      layout: restaurant.customLayout 
    });
  } catch (err) {
    console.error('❌ Error saving custom layout:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  }
});

// Verify restaurant admin access
router.get("/admin/verify/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log('🔐 Verifying admin access for restaurant:', restaurantId);
    
    const restaurant = await RestaurantProfile.findOne({ restaurantID: restaurantId });
    
    if (!restaurant) {
      console.log('⚠️ Restaurant not found:', restaurantId);
      return res.status(404).json({ 
        success: false,
        message: "Restaurant not found" 
      });
    }
    
    console.log('✅ Admin verification successful');
    res.json({ 
      success: true,
      restaurant: {
        id: restaurant.restaurantID,
        name: restaurant.restaurantName,
        permission: restaurant.permission
      }
    });
  } catch (err) {
    console.error('❌ Error verifying admin:', err);
    res.status(500).json({ 
      success: false,
      message: "Server error",
      error: err.message 
    });
  }
});

module.exports = router;
