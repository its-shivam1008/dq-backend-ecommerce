const CustomerSettings = require("../model/CustomerSettings");
const mongoose = require('mongoose');
  
  // GET customer settings
  const getCustomerSettings = async (req, res) => {
    try {
      const { restaurantId } = req.query;
      
      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant ID is required'
        });
      }

      const settings = await CustomerSettings.findOne({ restaurantId });
      
      res.status(200).json({
        success: true,
        data: settings || {
          lostCustomerDays: 60,
          highSpenderAmount: 30,
          regularCustomerDays: 30,
        }
      });

    } catch (error) {
      console.error('Error fetching customer settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch customer settings'
      });
    }
  }

  // POST create customer settings
   const createCustomerSettings = async(req, res) => {
    try {
      const { restaurantId, lostCustomerDays, highSpenderAmount, regularCustomerDays } = req.body;
      
      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: 'Restaurant ID is required'
        });
      }

      // Create or update settings (upsert)
      const settings = await CustomerSettings.findOneAndUpdate(
        { restaurantId },
        {
          restaurantId,
          lostCustomerDays,
          highSpenderAmount,
          regularCustomerDays
        },
        { 
          upsert: true,
          new: true
        }
      );
      
      res.status(201).json({
        success: true,
        message: 'Customer settings saved successfully',
        data: settings
      });

    } catch (error) {
      console.error('Error saving customer settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save customer settings'
      });
    }
  }

module.exports = {
    getCustomerSettings,
    createCustomerSettings
};
