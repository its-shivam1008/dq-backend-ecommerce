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

async function fixDataReferences() {
  try {
    console.log('Starting data reference fix script...');

    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`Processing user: ${user.username} (ID: ${user._id})`);
      const targetId = user.restaurantId || user._id;
      console.log(`  Target ID for data: ${targetId}\n`);

      // Fix Inventory
      const inventoryResult = await Inventory.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  📦 Fixed ${inventoryResult.modifiedCount} inventory items`);

      // Fix Transactions
      const transactionResult = await Transaction.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  💰 Fixed ${transactionResult.modifiedCount} transactions`);

      // Fix Customers
      const customerResult = await Customer.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  👤 Fixed ${customerResult.modifiedCount} customers`);

      // Fix Orders
      const orderResult = await Order.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  🍽️ Fixed ${orderResult.modifiedCount} orders`);

      // Fix Reservations
      const reservationResult = await Reservation.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  📅 Fixed ${reservationResult.modifiedCount} reservations`);

      // Fix Categories
      const categoryResult = await Category.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  📂 Fixed ${categoryResult.modifiedCount} categories`);

      // Fix Menu Items
      const menuResult = await Menu.updateMany(
        { restaurantId: user._id },
        { $set: { restaurantId: targetId } }
      );
      console.log(`  🍽️ Fixed ${menuResult.modifiedCount} menu items`);

      console.log('');
    }

    console.log('✅ Data references fixed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Data reference fix script error:', error);
    process.exit(1);
  }
}

fixDataReferences();
