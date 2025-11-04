const sendLowStockAlerts = require('./LowStockEmailService');
const InventoryStockSettings = require('../model/InventoryStockSettings');
const User = require('../model/User');

// Track last checked quantities to detect changes
const lastQuantities = new Map();

// Check if an item has become low stock
const checkItemLowStock = async (item, restaurantId) => {
  try {
    // Get threshold for the restaurant
    const stockSettings = await InventoryStockSettings.findOne({ restaurantId });
    const threshold = stockSettings?.lowStockThreshold || 10;

    // Get current quantity
    let currentQuantity = null;
    if (item.stock?.quantity !== undefined && item.stock.quantity !== null) {
      currentQuantity = item.stock.quantity;
    } else if (item.stock?.totalQuantity !== undefined && item.stock.totalQuantity !== null) {
      currentQuantity = item.stock.totalQuantity;
    } else if (item.quantity !== undefined && item.quantity !== null) {
      currentQuantity = item.quantity;
    } else if (item.suppliers && item.suppliers.length > 0) {
      currentQuantity = item.suppliers.reduce((sum, supplier) => sum + (supplier.quantity || 0), 0);
    }

    if (currentQuantity === null) {
      return false; // No quantity found
    }

    // Check if it's low stock
    const isLowStock = currentQuantity < threshold;
    
    // Get previous quantity for this item
    const itemKey = `${restaurantId}_${item._id}`;
    const previousQuantity = lastQuantities.get(itemKey);
    
    // Update the stored quantity
    lastQuantities.set(itemKey, currentQuantity);

    // Check if this is a new low stock situation
    // (either wasn't low stock before, or quantity decreased)
    const wasLowStockBefore = previousQuantity !== undefined && previousQuantity < threshold;
    const isNewLowStock = isLowStock && (!wasLowStockBefore || currentQuantity < previousQuantity);

    if (isNewLowStock) {
      console.log(`🚨 NEW LOW STOCK ALERT: ${item.itemName} (${currentQuantity} < ${threshold})`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking item low stock:', error);
    return false;
  }
};

// Check all items for a restaurant and send email if any are low stock
const checkRestaurantLowStock = async (restaurantId) => {
  try {
    console.log(`🔍 Checking low stock for restaurant: ${restaurantId}`);

    // Dynamic import to avoid circular dependency
    const Inventory = require('../model/Inventory');

    // Get all inventory items for the restaurant
    const inventoryItems = await Inventory.find({ restaurantId });
    
    if (inventoryItems.length === 0) {
      console.log('📦 No inventory items found for restaurant');
      return;
    }

    console.log(`📦 Found ${inventoryItems.length} inventory items for restaurant: ${restaurantId}`);

    // Check each item for low stock
    const lowStockItems = [];
    for (const item of inventoryItems) {
      const isLowStock = await checkItemLowStock(item, restaurantId);
      if (isLowStock) {
        lowStockItems.push(item);
      }
    }

    console.log(`🚨 Found ${lowStockItems.length} low stock items for restaurant: ${restaurantId}`);

    // If there are low stock items, send email
    if (lowStockItems.length > 0) {
      console.log(`📧 Sending low stock email for ${lowStockItems.length} items to restaurant: ${restaurantId}`);
      const emailResult = await sendLowStockAlerts(restaurantId);
      console.log('📧 Email result:', emailResult);
    } else {
      console.log('✅ No low stock items found for restaurant:', restaurantId);
    }

  } catch (error) {
    console.error('Error checking restaurant low stock:', error);
  }
};

// Check all restaurants for low stock
const checkAllRestaurantsLowStock = async () => {
  try {
    console.log('🔄 Starting automatic low stock check for all restaurants...');

    // Dynamic import to avoid circular dependency
    const Inventory = require('../model/Inventory');

    // Get all unique restaurant IDs from inventory
    const restaurantIds = await Inventory.distinct('restaurantId');
    
    if (restaurantIds.length === 0) {
      console.log('📦 No restaurants found with inventory');
      return;
    }

    console.log(`🏪 Found ${restaurantIds.length} restaurants with inventory`);

    // Check each restaurant
    for (const restaurantId of restaurantIds) {
      await checkRestaurantLowStock(restaurantId);
    }

    console.log('✅ Automatic low stock check completed for all restaurants');

  } catch (error) {
    console.error('Error in automatic low stock check:', error);
  }
};

// Initialize the service
const initializeAutoEmailService = () => {
  console.log('🚀 Auto Email Service initialized');
  
  // Set up periodic checks (every 5 minutes)
  setInterval(async () => {
    console.log('⏰ Running periodic low stock check...');
    await checkAllRestaurantsLowStock();
  }, 5 * 60 * 1000); // 5 minutes

  console.log('⏰ Auto Email Service: Periodic checks every 5 minutes');
};

module.exports = {
  checkRestaurantLowStock,
  checkAllRestaurantsLowStock,
  initializeAutoEmailService
};
