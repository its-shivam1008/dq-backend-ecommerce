const mongoose = require('mongoose');
const User = require('../model/User');

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

async function updateUserRestaurantId() {
  try {
    console.log('Starting user restaurantId update script...');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);

    for (const user of users) {
      console.log(`Processing user: ${user.username} (ID: ${user._id})`);
      
      // Set restaurantId to user's own _id if not already set
      if (!user.restaurantId) {
        user.restaurantId = user._id;
        await user.save();
        console.log(`  ✅ Set restaurantId to ${user._id}`);
      } else {
        console.log(`  ⚠️  restaurantId already set to ${user.restaurantId}`);
      }
    }

    console.log('\n✅ User restaurantId update completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ User restaurantId update script error:', error);
    process.exit(1);
  }
}

updateUserRestaurantId();
