const mongoose = require('mongoose');
const User = require('../model/User');
const Inventory = require('../model/Inventory');
const Transaction = require('../model/Transaction');
const Customer = require('../model/Customer');
const Order = require('../model/Order');
const Reservation = require('../model/Reservation');
const Category = require('../model/Category');
const Menu = require('../model/Menu');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function debugDataAccess() {
  try {
    // Get all users
    const users = await User.find({}, { _id: 1, username: 1, email: 1, restaurantId: 1, role: 1 });
    console.log('👥 USERS:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) | _id: ${user._id} | restaurantId: ${user.restaurantId}`);
    });
    console.log('\n--- DATA COUNTS PER USER (using restaurantId) ---');

    for (const user of users) {
      const userId = user.restaurantId || user._id;

      console.log(`📊 DATA FOR USER: ${user.username}`);
      console.log(`  Using ID: ${userId}`);

      // Check each data type
      const inventoryCount = await Inventory.countDocuments({ restaurantId: userId });
      const transactionCount = await Transaction.countDocuments({ restaurantId: userId });
      const customerCount = await Customer.countDocuments({ restaurantId: userId });
      const orderCount = await Order.countDocuments({ restaurantId: userId });
      const reservationCount = await Reservation.countDocuments({ restaurantId: userId });
      const categoryCount = await Category.countDocuments({ restaurantId: userId, isDeleted: false });
      const menuCount = await Menu.countDocuments({ restaurantId: userId });

      console.log(`  📦 Inventory: ${inventoryCount}`);
      console.log(`  💰 Transactions: ${transactionCount}`);
      console.log(`  👤 Customers: ${customerCount}`);
      console.log(`  🍽️ Orders: ${orderCount}`);
      console.log(`  📅 Reservations: ${reservationCount}`);
      console.log(`  📂 Categories: ${categoryCount}`);
      console.log(`  🍽️ Menu Items: ${menuCount}`);
      console.log('');
    }

    // Check for data with old _id references
    console.log('🔍 CHECKING FOR OLD DATA REFERENCES:');

    for (const user of users) {
      const oldInventoryCount = await Inventory.countDocuments({ restaurantId: user._id });
      const oldTransactionCount = await Transaction.countDocuments({ restaurantId: user._id });
      const oldCustomerCount = await Customer.countDocuments({ restaurantId: user._id });
      const oldCategoryCount = await Category.countDocuments({ restaurantId: user._id, isDeleted: false });
      const oldMenuCount = await Menu.countDocuments({ restaurantId: user._id });

      if (oldInventoryCount > 0 || oldTransactionCount > 0 || oldCustomerCount > 0 || oldCategoryCount > 0 || oldMenuCount > 0) {
        console.log(`⚠️  User ${user.username} has data linked to their _id instead of restaurantId:`);
        console.log(`    Old Inventory: ${oldInventoryCount}`);
        console.log(`    Old Transactions: ${oldTransactionCount}`);
        console.log(`    Old Customers: ${oldCustomerCount}`);
        console.log(`    Old Categories: ${oldCategoryCount}`);
        console.log(`    Old Menu Items: ${oldMenuCount}`);
        console.log('');
      }
    }

    console.log('✅ Debug complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Debug script error:', error);
    process.exit(1);
  }
}

debugDataAccess();
