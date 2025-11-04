const { sendLowStockEmail, getLowStockItems } = require('../services/LowStockEmailService');
const { triggerLowStockCheck, getCronJobStatus } = require('../services/CronJobService');
const { generateResponse } = require('../utils/responseHelper');
const { checkRestaurantLowStock } = require('../services/AutoEmailService');

// Helper functions for responses
const successResponse = (message, data) => generateResponse(true, message, data);
const errorResponse = (message, statusCode) => generateResponse(false, message, null, { statusCode });

// Manual trigger for low stock check
const triggerLowStockCheckManual = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (restaurantId) {
      // Check specific restaurant
      const result = await sendLowStockEmail(restaurantId);
      res.json(successResponse('Low stock check completed for restaurant', result));
    } else {
      // Check all restaurants
      const result = await triggerLowStockCheck();
      res.json(successResponse('Low stock check completed for all restaurants', result));
    }

  } catch (error) {
    // console.error('Error in manual low stock check:', error);
    res.status(500).json(errorResponse('Failed to trigger low stock check', 500));
  }
};

// Get low stock items for a restaurant
const getLowStockItemsForRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    const result = await getLowStockItems(restaurantId);
    res.json(successResponse('Low stock items retrieved successfully', result));

  } catch (error) {
    // console.error('Error fetching low stock items:', error);
    res.status(500).json(errorResponse('Failed to fetch low stock items', 500));
  }
};

// Get cron job status
const getCronJobStatusController = async (req, res) => {
  try {
    const status = getCronJobStatus();
    res.json(successResponse('Cron job status retrieved successfully', status));
  } catch (error) {
    // console.error('Error getting cron job status:', error);
    res.status(500).json(errorResponse('Failed to get cron job status', 500));
  }
};

// Debug endpoint to check system status
const debugSystemStatus = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    // console.log(`🔍 Debugging system for restaurant: ${restaurantId}`);

    // Dynamic import to avoid circular dependency
    const Inventory = require('../model/Inventory');

    // Check inventory stock settings
    const stockSettings = await InventoryStockSettings.findOne({ restaurantId });
    // console.log('📊 Stock settings:', stockSettings);
    
    // Check inventory items
    const inventoryItems = await Inventory.find({ restaurantId }).limit(10);
    // console.log(`📦 Found ${inventoryItems.length} inventory items`);
    
    // Check admin users
    const adminUsers = await User.find({ role: 'admin' }).limit(3);
    // console.log(`👥 Found ${adminUsers.length} admin users`);
    
    // Get threshold
    const threshold = stockSettings?.lowStockThreshold || 10;
    // console.log(`🎯 Threshold set to: ${threshold}`);

    // Detailed analysis of each inventory item
    const detailedInventory = inventoryItems.map(item => {
      const analysis = {
        itemName: item.itemName,
        unit: item.unit,
        stock: item.stock,
        suppliers: item.suppliers,
        // Try to extract quantity from different possible fields
        possibleQuantities: {
          stockQuantity: item.stock?.quantity,
          stockTotalQuantity: item.stock?.totalQuantity,
          directQuantity: item.quantity,
          suppliersQuantity: item.suppliers?.reduce((sum, s) => sum + (s.quantity || 0), 0)
        },
        // Determine which quantity to use
        usedQuantity: null,
        isLowStock: false
      };

      // Determine the actual quantity to use
      if (item.stock?.quantity !== undefined && item.stock.quantity !== null) {
        analysis.usedQuantity = item.stock.quantity;
      } else if (item.stock?.totalQuantity !== undefined && item.stock.totalQuantity !== null) {
        analysis.usedQuantity = item.stock.totalQuantity;
      } else if (item.quantity !== undefined && item.quantity !== null) {
        analysis.usedQuantity = item.quantity;
      } else if (item.suppliers && item.suppliers.length > 0) {
        analysis.usedQuantity = item.suppliers.reduce((sum, supplier) => sum + (supplier.quantity || 0), 0);
      }

      // Check if it's low stock
      if (analysis.usedQuantity !== null && analysis.usedQuantity < threshold) {
        analysis.isLowStock = true;
      }

      return analysis;
    });

    // Find low stock items using the analysis
    const lowStockItems = detailedInventory.filter(item => item.isLowStock);

    // console.log(`🚨 Found ${lowStockItems.length} low stock items`);

    res.json(successResponse('Debug information retrieved successfully', {
      restaurantId,
      stockSettings: stockSettings || 'No stock settings found',
      threshold,
      inventoryCount: inventoryItems.length,
      detailedInventory,
      lowStockCount: lowStockItems.length,
      lowStockItems: lowStockItems.map(item => ({
        itemName: item.itemName,
        usedQuantity: item.usedQuantity,
        threshold: threshold,
        unit: item.unit,
        isLowStock: item.isLowStock
      })),
      adminUsers: adminUsers.map(user => ({
        email: user.email,
        role: user.role,
        username: user.username
      }))
    }));

  } catch (error) {
    // console.error('Error in debug system status:', error);
    res.status(500).json(errorResponse('Failed to get debug information', 500));
  }
};

// Test low stock with specific threshold
const testLowStockWithThreshold = async (req, res) => {
  try {
    const { restaurantId, testThreshold } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    const threshold = parseInt(testThreshold) || 10;
    console.log(`🧪 Testing low stock with threshold: ${threshold}`);

    // Dynamic import to avoid circular dependency
    const Inventory = require('../model/Inventory');

    // Get all inventory items
    const allInventoryItems = await Inventory.find({ restaurantId });
    // console.log(`📦 Found ${allInventoryItems.length} total inventory items`);

    // Analyze each item
    const analysisResults = allInventoryItems.map(item => {
      let currentQuantity = null;
      let quantitySource = 'none';

      // Try different possible quantity fields
      if (item.stock?.quantity !== undefined && item.stock.quantity !== null) {
        currentQuantity = item.stock.quantity;
        quantitySource = 'stock.quantity';
      } else if (item.stock?.totalQuantity !== undefined && item.stock.totalQuantity !== null) {
        currentQuantity = item.stock.totalQuantity;
        quantitySource = 'stock.totalQuantity';
      } else if (item.quantity !== undefined && item.quantity !== null) {
        currentQuantity = item.quantity;
        quantitySource = 'direct.quantity';
      } else if (item.suppliers && item.suppliers.length > 0) {
        currentQuantity = item.suppliers.reduce((sum, supplier) => sum + (supplier.quantity || 0), 0);
        quantitySource = 'suppliers.total';
      }

      const isLowStock = currentQuantity !== null && currentQuantity < threshold;

      return {
        itemName: item.itemName,
        currentQuantity,
        quantitySource,
        threshold,
        isLowStock,
        comparison: currentQuantity !== null ? `${currentQuantity} < ${threshold}` : 'No quantity found'
      };
    });

    const lowStockItems = analysisResults.filter(item => item.isLowStock);

    res.json(successResponse('Low stock test completed successfully', {
      threshold,
      totalItems: allInventoryItems.length,
      lowStockCount: lowStockItems.length,
      analysisResults,
      lowStockItems
    }));

  } catch (error) {
    console.error('Error in low stock test:', error);
    res.status(500).json(errorResponse('Failed to test low stock', 500));
  }
};

// Manual trigger for auto email check
const triggerAutoEmailCheck = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    // console.log(`🔍 Manual auto email check triggered for restaurant: ${restaurantId}`);

    // Trigger the auto email check
    await checkRestaurantLowStock(restaurantId);

    res.json(successResponse('Auto email check completed successfully', {
      restaurantId,
      message: 'Low stock check completed. Email sent if any items are low stock.'
    }));

  } catch (error) {
    console.error('Error in manual auto email check:', error);
    res.status(500).json(errorResponse('Failed to trigger auto email check', 500));
  }
};

// Immediate email test for all restaurants
const triggerImmediateEmailTest = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    // console.log('🚀 Triggering immediate email test for all restaurants...');

    // Import the function dynamically
    const { sendLowStockEmailsForAllRestaurants } = require('../services/LowStockEmailService');
    
    // Trigger immediate email check
    const result = await sendLowStockEmailsForAllRestaurants();

    res.json(successResponse('Immediate email test completed successfully', {
      result,
      message: 'Email test completed for all restaurants. Check console for details.'
    }));

  } catch (error) {
    console.error('Error in immediate email test:', error);
    res.status(500).json(errorResponse('Failed to trigger immediate email test', 500));
  }
};

// Debug user email lookup
const debugUserEmailLookup = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    // console.log(`🔍 Debugging user email lookup for restaurantId: ${restaurantId}`);

    // Dynamic import to avoid circular dependency
    const User = require('../model/User');

    // Try different methods to find user
    const searchResults = {
      restaurantId: restaurantId,
      searches: []
    };

    // Method 1: Find by _id (assuming restaurantId is user's _id)
    try {
      const userById = await User.findById(restaurantId);
      searchResults.searches.push({
        method: 'findById',
        found: !!userById,
        user: userById ? {
          _id: userById._id,
          email: userById.email,
          username: userById.username,
          role: userById.role
        } : null
      });
    } catch (error) {
      searchResults.searches.push({
        method: 'findById',
        error: error.message
      });
    }

    // Method 2: Find by restaurantId field
    try {
      const userByRestaurantId = await User.findOne({ restaurantId: restaurantId });
      searchResults.searches.push({
        method: 'findOne by restaurantId field',
        found: !!userByRestaurantId,
        user: userByRestaurantId ? {
          _id: userByRestaurantId._id,
          email: userByRestaurantId.email,
          username: userByRestaurantId.username,
          role: userByRestaurantId.role
        } : null
      });
    } catch (error) {
      searchResults.searches.push({
        method: 'findOne by restaurantId field',
        error: error.message
      });
    }

    // Method 3: Find any admin user
    try {
      const adminUser = await User.findOne({ role: 'admin' });
      searchResults.searches.push({
        method: 'findOne admin user',
        found: !!adminUser,
        user: adminUser ? {
          _id: adminUser._id,
          email: adminUser.email,
          username: adminUser.username,
          role: adminUser.role
        } : null
      });
    } catch (error) {
      searchResults.searches.push({
        method: 'findOne admin user',
        error: error.message
      });
    }

    res.json(successResponse('User email lookup debug completed', searchResults));

  } catch (error) {
    console.error('Error in user email lookup debug:', error);
    res.status(500).json(errorResponse('Failed to debug user email lookup', 500));
  }
};

// Test email sending to specific user
const testEmailToUser = async (req, res) => {
  try {
    // console.log('🧪 Test email endpoint called');
    // console.log('Request query:', req.query);
    // console.log('Request user:', req.user);

    const { restaurantId } = req.query;
    const userId = req.userId;
    
    if (!userId) {
      // console.log('❌ User not authenticated');
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!restaurantId) {
      // console.log('❌ Restaurant ID is required');
      return res.status(400).json(errorResponse('Restaurant ID is required', 400));
    }

    // console.log(`🧪 Testing email sending to user with restaurantId: ${restaurantId}`);

    // Dynamic import to avoid circular dependency
    const User = require('../model/User');
    const nodemailer = require('nodemailer');
    
    console.log('📦 Nodemailer imported:', typeof nodemailer);
    console.log('📦 Nodemailer.createTransporter:', typeof nodemailer.createTransporter);

    // Find user by restaurantId
    console.log('🔍 Looking for user with restaurantId:', restaurantId);
    const user = await User.findById(restaurantId);
    
    if (!user) {
      console.log('❌ User not found with restaurantId:', restaurantId);
      return res.status(400).json(errorResponse('User not found with restaurantId: ' + restaurantId, 400));
    }

    if (!user.email) {
      console.log('❌ User found but no email address');
      return res.status(400).json(errorResponse('User found but no email address', 400));
    }

    console.log(`📧 Found user: ${user.username} (${user.email})`);

    // Check email configuration
    console.log('🔍 Checking email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Not set');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Not set');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ Email configuration missing');
      return res.status(400).json(errorResponse('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS.', 400));
    }

    // Create test email
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Test Email - Low Stock System</h2>
            <p>This is a test email to verify the email system is working correctly.</p>
          </div>
          <p><strong>Recipient:</strong> ${user.username} (${user.email})</p>
          <p><strong>Restaurant ID:</strong> ${restaurantId}</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p>If you receive this email, the low stock notification system is working correctly!</p>
        </div>
      </body>
      </html>
    `;

    // Create transporter
    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify configuration
    try {
      console.log('🔍 Verifying email configuration...');
      await transporter.verify();
      console.log('✅ Email configuration verified');
    } catch (verifyError) {
      console.error('❌ Email configuration verification failed:', verifyError);
      return res.status(400).json(errorResponse('Email configuration verification failed: ' + verifyError.message, 400));
    }

    // Send test email
    try {
      console.log(`📤 Sending test email to: ${user.email}`);
      const emailResult = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: '✅ Test Email - Low Stock System',
        html: testEmailHtml
      });

      console.log('📧 Test email sent successfully:', {
        messageId: emailResult.messageId,
        to: user.email,
        response: emailResult.response
      });

      res.json(successResponse('Test email sent successfully', {
        recipient: user.email,
        username: user.username,
        messageId: emailResult.messageId,
        response: emailResult.response
      }));
    } catch (emailError) {
      console.error('❌ Error sending email:', emailError);
      return res.status(500).json(errorResponse('Failed to send email: ' + emailError.message, 500));
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json(errorResponse('Failed to send test email: ' + error.message, 500));
  }
};

module.exports = {
  triggerLowStockCheckManual,
  getLowStockItemsForRestaurant,
  getCronJobStatusController,
  debugSystemStatus,
  testLowStockWithThreshold,
  triggerAutoEmailCheck,
  triggerImmediateEmailTest,
  debugUserEmailLookup,
  testEmailToUser
};
