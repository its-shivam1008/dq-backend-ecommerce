const dotenv = require("dotenv");
dotenv.config();

const DBConnect = require("./DB/DBconnect.js");
const reservationController = require("./controllers/ReservationController");

async function testAvailableSlots() {
  try {
    console.log('🔧 Testing getAvailableTimeSlots function directly...\n');
    
    // Connect to database
    if (process.env.MONGO_URL) {
      await DBConnect(process.env.MONGO_URL);
      console.log('✅ Database connected\n');
    }
    
    // Create mock request and response objects
    const req = {
      query: {
        restaurantId: '68e147a53c053e790e0ac135',
        date: '2025-10-11'
      }
    };
    
    const res = {
      json: (data) => {
        console.log('📊 Available slots response:');
        console.log(JSON.stringify(data, null, 2));
        
        // Check if this has table information
        if (data.timeSlots && data.timeSlots.length > 0) {
          console.log('\n✅ Time slots found with table info:');
          data.timeSlots.slice(0, 5).forEach(slot => {
            console.log(`  - ${slot.time}: ${slot.availableTables?.length || 0} available, ${slot.bookedTables?.length || 0} booked`);
            if (slot.bookedTables && slot.bookedTables.length > 0) {
              console.log(`    Booked tables: ${slot.bookedTables.join(', ')}`);
            }
          });
          
          // Check if we have reservations for specific tables T1 and T2
          const bookingsWithT1OrT2 = data.timeSlots.filter(slot => 
            slot.bookedTables && (slot.bookedTables.includes('T1') || slot.bookedTables.includes('T2'))
          );
          
          if (bookingsWithT1OrT2.length > 0) {
            console.log('\n🎯 Found slots with T1 or T2 bookings:');
            bookingsWithT1OrT2.forEach(slot => {
              console.log(`  - ${slot.time}: ${slot.bookedTables.filter(t => t === 'T1' || t === 'T2').join(', ')}`);
            });
          } else {
            console.log('\n❌ No T1 or T2 bookings found in available slots');
          }
        } else {
          console.log('\n⚠️ No time slots returned. This usually means all slots are fully booked or past.');
          console.log('Let me debug this by checking the reservation controller logic...');
        }
        
        process.exit(0);
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error response (${code}):`, data);
          process.exit(1);
        }
      })
    };
    
    // Call the controller function directly
    await reservationController.getAvailableTimeSlots(req, res);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAvailableSlots();