const InventoryStockSettings = require("../model/InventoryStockSettings");
const { generateResponse } = require('../utils/responseHelper');

// Helper functions for responses
const successResponse = (message, data) => generateResponse(true, message, data);
const errorResponse = (message, statusCode) => generateResponse(false, message, null, { statusCode });

// GET inventory stock settings
const getInventoryStockSettings = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    const settings = await InventoryStockSettings.findOne({ restaurantId });
    
    res.status(200).json({
      success: true,
      data: settings || {
        lowStockThreshold: 10,
        restaurantId: restaurantId
      }
    });

  } catch (error) {
    console.error('Error fetching inventory stock settings:', error);
    res.status(500).json(errorResponse('Failed to fetch inventory stock settings', 500));
  }
};

// POST create/update inventory stock settings
const createOrUpdateInventoryStockSettings = async (req, res) => {
  try {
    const { restaurantId, lowStockThreshold } = req.body;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }
    
    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    if (!lowStockThreshold || lowStockThreshold < 1 || lowStockThreshold > 1000) {
      return res.status(400).json(errorResponse('Low stock threshold must be between 1 and 1000', 400));
    }

    // Create or update settings (upsert)
    const settings = await InventoryStockSettings.findOneAndUpdate(
      { restaurantId },
      {
        restaurantId,
        lowStockThreshold,
        createdBy: userId,
        updatedBy: userId
      },
      { 
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Inventory stock settings saved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error saving inventory stock settings:', error);
    res.status(500).json(errorResponse('Failed to save inventory stock settings', 500));
  }
};

module.exports = {
  getInventoryStockSettings,
  createOrUpdateInventoryStockSettings
};
