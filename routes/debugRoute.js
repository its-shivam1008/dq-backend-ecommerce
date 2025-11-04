const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../model/User');
const Inventory = require('../model/Inventory');
const Transaction = require('../model/Transaction');
const Customer = require('../model/Customer');
const Category = require('../model/Category');
const Menu = require('../model/Menu');

// Debug route to check user data
router.get('/debug-user', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    // Get data counts for this user using restaurantId
    const inventoryCount = await Inventory.countDocuments({ restaurantId: req.userId });
    const transactionCount = await Transaction.countDocuments({ restaurantId: req.userId });
    const customerCount = await Customer.countDocuments({ restaurantId: req.userId });
    const categoryCount = await Category.countDocuments({ restaurantId: req.userId, isDeleted: false });
    const menuCount = await Menu.countDocuments({ restaurantId: req.userId });

    // Also check data linked to user's _id (old references)
    const oldInventoryCount = await Inventory.countDocuments({ restaurantId: currentUser._id });
    const oldTransactionCount = await Transaction.countDocuments({ restaurantId: currentUser._id });
    const oldCustomerCount = await Customer.countDocuments({ restaurantId: currentUser._id });
    const oldCategoryCount = await Category.countDocuments({ restaurantId: currentUser._id, isDeleted: false });
    const oldMenuCount = await Menu.countDocuments({ restaurantId: currentUser._id });

    res.json({
      success: true,
      user: {
        _id: currentUser._id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        restaurantId: currentUser.restaurantId,
        reqUserId: req.userId
      },
      dataCounts: {
        // New data (using restaurantId)
        inventory: inventoryCount,
        transactions: transactionCount,
        customers: customerCount,
        categories: categoryCount,
        menuItems: menuCount,
        // Old data (using _id)
        oldInventory: oldInventoryCount,
        oldTransactions: oldTransactionCount,
        oldCustomers: oldCustomerCount,
        oldCategories: oldCategoryCount,
        oldMenuItems: oldMenuCount
      },
      debug: {
        userRestaurantId: currentUser.restaurantId?.toString(),
        reqUserId: req.userId?.toString(),
        areEqual: currentUser.restaurantId?.toString() === req.userId?.toString(),
        hasOldData: oldInventoryCount > 0 || oldTransactionCount > 0 || oldCustomerCount > 0 || oldCategoryCount > 0 || oldMenuCount > 0
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

module.exports = router;
