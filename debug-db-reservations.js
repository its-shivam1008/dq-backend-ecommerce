const dotenv = require("dotenv");
dotenv.config();

const DBConnect = require("./DB/DBconnect.js");
const Reservation = require("./model/Reservation");

async function debugReservations() {
  try {
    console.log('🔧 Debugging database reservations...\n');
    
    // Connect to database
    if (process.env.MONGO_URL) {
      await DBConnect(process.env.MONGO_URL);
      console.log('✅ Database connected\n');
    }
    
    const restaurantId = '68e147a53c053e790e0ac135';
    const date = '2025-01-11';
    
    // 1. Get ALL reservations for this restaurant
    console.log('📋 ALL reservations for restaurant:');
    const allReservations = await Reservation.find({ restaurantId });
    console.log(`Found ${allReservations.length} total reservations`);
    
    allReservations.forEach((res, index) => {
      console.log(`  ${index + 1}. ID: ${res._id}`);
      console.log(`     Customer: ${res.customerName}`);
      console.log(`     Table: ${res.tableNumber}`);
      console.log(`     Start: ${res.startTime}`);
      console.log(`     End: ${res.endTime}`);
      console.log(`     Date created: ${res.createdAt}`);
      console.log('');
    });
    
    // 2. Get reservations for the specific date using the controller logic
    console.log(`📅 Reservations for ${date} using controller logic:`);
    
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log(`Start of day: ${startOfDay}`);
    console.log(`End of day: ${endOfDay}`);
    
    const dateReservations = await Reservation.find({
      restaurantId,
      startTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    
    console.log(`Found ${dateReservations.length} reservations for ${date}`);
    
    if (dateReservations.length === 0) {
      console.log('❌ No reservations found for this date!');
      console.log('This explains why all tables appear available.');
    } else {
      dateReservations.forEach((res, index) => {
        console.log(`  ${index + 1}. Table ${res.tableNumber}: ${res.customerName}`);
        console.log(`     Time: ${res.startTime} to ${res.endTime}`);
        console.log('');
      });
    }
    
    // 3. Check if there are reservations with different date formats
    console.log('🔍 Checking for date format issues...');
    
    // Check reservations that might be stored with different time zones or formats
    const allDates = allReservations.map(res => ({
      id: res._id,
      startTime: res.startTime,
      localDate: new Date(res.startTime).toLocaleDateString(),
      utcDate: new Date(res.startTime).toISOString().split('T')[0],
      tableNumber: res.tableNumber
    }));
    
    console.log('All reservation dates:');
    allDates.forEach(item => {
      console.log(`  - ${item.tableNumber}: ${item.startTime} (local: ${item.localDate}, UTC: ${item.utcDate})`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

debugReservations();