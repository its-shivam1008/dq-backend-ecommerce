const mongoose = require('mongoose');
const User = require('../model/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL || 'mongodb+srv://nileshgoyal624_db_user:nilesh774@cluster0.t0sg444.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/dqdashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function checkDatabase() {
  try {
    console.log('Checking database...');
    
    // Check if users exist
    const userCount = await User.countDocuments();
    console.log(`Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await User.find({}, { _id: 1, username: 1, email: 1, restaurantId: 1, role: 1 });
      console.log('\nUsers found:');
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.role}) | _id: ${user._id} | restaurantId: ${user.restaurantId || 'NOT SET'}`);
      });
    } else {
      console.log('No users found in database!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database check error:', error);
    process.exit(1);
  }
}

checkDatabase();
