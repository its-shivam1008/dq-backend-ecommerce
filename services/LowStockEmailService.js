const nodemailer = require("nodemailer");
const InventoryStockSettings = require("../model/InventoryStockSettings");
const User = require("../model/User");

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Get low stock items for a restaurant
const getLowStockItems = async (restaurantId) => {
  try {
    // Get threshold setting for the restaurant
    const stockSettings = await InventoryStockSettings.findOne({ restaurantId });
    const threshold = stockSettings?.lowStockThreshold || 10;

    console.log(`🔍 Looking for low stock items with threshold: ${threshold}`);

    // Dynamic import to avoid circular dependency
    const Inventory = require('../model/Inventory');

    // Get all inventory items for the restaurant
    const allInventoryItems = await Inventory.find({ restaurantId });
    console.log(`📦 Found ${allInventoryItems.length} total inventory items`);

    // Analyze each item to determine if it's low stock
    const lowStockItems = [];

    allInventoryItems.forEach(item => {
      let currentQuantity = null;

      // Try different possible quantity fields
      if (item.stock?.quantity !== undefined && item.stock.quantity !== null) {
        currentQuantity = item.stock.quantity;
        console.log(`📊 Item ${item.itemName}: using stock.quantity = ${currentQuantity}`);
      } else if (item.stock?.totalQuantity !== undefined && item.stock.totalQuantity !== null) {
        currentQuantity = item.stock.totalQuantity;
        console.log(`📊 Item ${item.itemName}: using stock.totalQuantity = ${currentQuantity}`);
      } else if (item.quantity !== undefined && item.quantity !== null) {
        currentQuantity = item.quantity;
        console.log(`📊 Item ${item.itemName}: using direct quantity = ${currentQuantity}`);
      } else if (item.suppliers && item.suppliers.length > 0) {
        currentQuantity = item.suppliers.reduce((sum, supplier) => sum + (supplier.quantity || 0), 0);
        console.log(`📊 Item ${item.itemName}: using suppliers total = ${currentQuantity}`);
      }

      // Check if it's low stock
      if (currentQuantity !== null && currentQuantity < threshold) {
        console.log(`🚨 LOW STOCK: ${item.itemName} (${currentQuantity} < ${threshold})`);
        lowStockItems.push({
          ...item.toObject(),
          currentQuantity: currentQuantity
        });
      } else {
        console.log(`✅ OK: ${item.itemName} (${currentQuantity} >= ${threshold})`);
      }
    });

    console.log(`✅ Total low stock items found: ${lowStockItems.length}`);

    return {
      items: lowStockItems,
      threshold: threshold
    };
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }
};

// Get restaurant admin email based on restaurantId
const getRestaurantAdminEmail = async (restaurantId) => {
  try {
    console.log(`🔍 Looking for user with restaurantId: ${restaurantId}`);
    
    // Search for user where _id matches restaurantId (assuming restaurantId is the user's _id)
    let admin = await User.findById(restaurantId);
    
    if (admin && admin.email) {
      console.log(`✅ Found user email: ${admin.email} for restaurantId: ${restaurantId}`);
      return admin.email;
    }
    
    // If not found by _id, try to find by restaurantId field (if it exists)
    admin = await User.findOne({ 
      restaurantId: restaurantId,
      role: 'admin' 
    });
    
    if (admin && admin.email) {
      console.log(`✅ Found admin user email: ${admin.email} for restaurantId: ${restaurantId}`);
      return admin.email;
    }
    
    // If still not found, try to find any admin user (fallback)
    admin = await User.findOne({ 
      role: 'admin' 
    });
    
    if (admin && admin.email) {
      console.log(`⚠️ Using fallback admin email: ${admin.email} for restaurantId: ${restaurantId}`);
      return admin.email;
    }
    
    console.log(`❌ No user email found for restaurantId: ${restaurantId}`);
    return null;
  } catch (error) {
    console.error('Error fetching admin email:', error);
    throw error;
  }
};

// Create low stock email template
const createLowStockEmailTemplate = (items, threshold, restaurantName = 'Your Restaurant') => {
  const itemList = items.map(item => {
    // Use the currentQuantity that was calculated in getLowStockItems
    const currentQuantity = item.currentQuantity || 0;

    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.itemName || 'Unknown Item'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${currentQuantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${threshold}</td>
        <td style="padding: 8px; border: 1px solid #ddd; color: red; font-weight: bold;">LOW STOCK</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Low Stock Alert - ${restaurantName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #f8f9fa; padding: 12px; text-align: left; border: 1px solid #ddd; }
        td { padding: 8px; border: 1px solid #ddd; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>🚨 Low Stock Alert - ${restaurantName}</h2>
          <p>This is an automated alert for low inventory stock levels.</p>
        </div>
        
        <div class="alert">
          <strong>⚠️ Alert:</strong> ${items.length} item(s) are running low on stock and need immediate attention.
        </div>

        <h3>Low Stock Items:</h3>
        <table>
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Current Stock</th>
              <th>Threshold</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemList}
          </tbody>
        </table>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4>📋 Recommended Actions:</h4>
          <ul>
            <li>Review and update inventory levels</li>
            <li>Place orders for low stock items</li>
            <li>Check supplier availability</li>
            <li>Update stock settings if needed</li>
          </ul>
        </div>

        <div class="footer">
          <p>This is an automated email from your Restaurant Management System.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send low stock email
const sendLowStockEmail = async (restaurantId) => {
  try {
    console.log(`🔍 Checking low stock for restaurant: ${restaurantId}`);
    
    // Check email configuration first
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ Email configuration missing');
      return { 
        success: false, 
        message: 'Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in environment variables.',
        error: 'EMAIL_CONFIG_MISSING'
      };
    }

    // Get low stock items
    const { items, threshold } = await getLowStockItems(restaurantId);
    
    if (items.length === 0) {
      console.log('✅ No low stock items found');
      return { success: true, message: 'No low stock items found' };
    }

    // Get admin email
    const adminEmail = await getRestaurantAdminEmail(restaurantId);
    if (!adminEmail) {
      console.log('❌ No admin email found for restaurant');
      return { 
        success: false, 
        message: `No admin email found for restaurantId: ${restaurantId}. Please ensure there is a user with this restaurantId and a valid email address.`,
        error: 'NO_ADMIN_EMAIL',
        restaurantId: restaurantId
      };
    }

    console.log(`📧 Preparing to send email to: ${adminEmail}`);
    console.log(`📧 Email configuration - FROM: ${process.env.EMAIL_USER}`);

    // Create email content
    const emailSubject = `🚨 Low Stock Alert - ${items.length} Item(s) Need Attention`;
    const emailHtml = createLowStockEmailTemplate(items, threshold);

    console.log(`📧 Email subject: ${emailSubject}`);
    console.log(`📧 Email HTML length: ${emailHtml.length} characters`);

    // Test email configuration
    const transporter = createTransporter();
    
    // Verify email configuration
    try {
      console.log('🔍 Verifying email configuration...');
      await transporter.verify();
      console.log('✅ Email configuration verified successfully');
    } catch (verifyError) {
      console.error('❌ Email configuration verification failed:', verifyError);
      return { 
        success: false, 
        message: 'Email configuration verification failed. Please check EMAIL_USER and EMAIL_PASS.',
        error: 'EMAIL_VERIFY_FAILED',
        details: verifyError.message
      };
    }

    // Send email
    console.log(`📤 Sending email to: ${adminEmail}`);
    const emailResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: emailSubject,
      html: emailHtml
    });

    console.log(`✅ Low stock email sent successfully to ${adminEmail}`);
    console.log('📧 Email result:', {
      messageId: emailResult.messageId,
      response: emailResult.response,
      accepted: emailResult.accepted,
      rejected: emailResult.rejected
    });
    
    return { 
      success: true, 
      message: `Email sent to ${adminEmail} for ${items.length} low stock items`,
      itemsCount: items.length,
      emailResult: emailResult
    };

  } catch (error) {
    console.error('❌ Error sending low stock email:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      response: error.response
    });
    
    return { 
      success: false, 
      message: `Failed to send email: ${error.message}`,
      error: 'EMAIL_SEND_FAILED',
      details: error.message
    };
  }
};

// Send low stock emails for all restaurants
const sendLowStockEmailsForAllRestaurants = async () => {
  try {
    console.log('🔄 Starting low stock check for all restaurants...');
    
    // Get all restaurants with stock settings
    const stockSettings = await InventoryStockSettings.find({});
    
    if (stockSettings.length === 0) {
      console.log('ℹ️ No stock settings found for any restaurant');
      return { success: true, message: 'No restaurants with stock settings found' };
    }

    const results = [];
    
    for (const setting of stockSettings) {
      try {
        const result = await sendLowStockEmail(setting.restaurantId);
        results.push({
          restaurantId: setting.restaurantId,
          ...result
        });
      } catch (error) {
        console.error(`❌ Error checking restaurant ${setting.restaurantId}:`, error);
        results.push({
          restaurantId: setting.restaurantId,
          success: false,
          message: error.message
        });
      }
    }

    console.log('✅ Low stock check completed for all restaurants');
    return { 
      success: true, 
      message: 'Low stock check completed',
      results: results
    };

  } catch (error) {
    console.error('❌ Error in low stock check for all restaurants:', error);
    throw error;
  }
};

module.exports = {
  sendLowStockEmail,
  sendLowStockEmailsForAllRestaurants,
  getLowStockItems
};
