const dotenv = require("dotenv");
dotenv.config();

const DBConnect = require("./DB/DBconnect.js");
const Reservation = require("./model/Reservation");

async function getDebugTimeSlots(restaurantId, date) {
  try {
    // Generate all possible 30-minute time slots from 9 AM to 10 PM
    const generateTimeSlots = () => {
      const slots = [];
      for (let hour = 9; hour < 22; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      return slots;
    };

    const allTimeSlots = generateTimeSlots();
    
    // Get existing reservations for the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`🔍 Searching for reservations between:`);
    console.log(`  Start: ${startOfDay.toISOString()} (${startOfDay})`);
    console.log(`  End: ${endOfDay.toISOString()} (${endOfDay})`);

    const existingReservations = await Reservation.find({
      restaurantId,
      startTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    console.log(`📋 Found ${existingReservations.length} reservations for ${date}:`);
    existingReservations.forEach(res => {
      console.log(`  - ${res.customerName} at table ${res.tableNumber}: ${res.startTime} to ${res.endTime}`);
    });

    // Create a map of booked time slots
    const bookedSlots = new Set();
    existingReservations.forEach(reservation => {
      const startTime = new Date(reservation.startTime);
      const endTime = new Date(reservation.endTime);
      
      // Add all 30-minute slots that overlap with this reservation
      const currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        bookedSlots.add(timeString);
        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    });

    // Filter out past time slots for today
    const now = new Date();
    const isToday = date === now.toISOString().split('T')[0];
    
    const allSlotsWithStatus = allTimeSlots.map(slot => {
      // If it's today, filter out past time slots
      let isPastSlot = false;
      if (isToday) {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        isPastSlot = slotTime <= now;
      }
      
      const [hours, minutes] = slot.split(':').map(Number);
      const slotStart = new Date(date);
      slotStart.setHours(hours, minutes, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      // Find reservations that overlap with this time slot
      const overlappingReservations = existingReservations.filter(reservation => {
        const resStart = new Date(reservation.startTime);
        const resEnd = new Date(reservation.endTime);
        
        return (slotStart < resEnd && slotEnd > resStart);
      });

      // Get booked table numbers
      const bookedTables = overlappingReservations.map(res => res.tableNumber).filter(Boolean);
      
      // Generate available table numbers (assuming tables T1-T20)
      const allTables = Array.from({length: 20}, (_, i) => `T${i + 1}`);
      const availableTables = allTables.filter(table => !bookedTables.includes(table));

      return {
        time: slot,
        available: availableTables.length > 0 && !isPastSlot,
        availableTables: availableTables,
        bookedTables: bookedTables,
        isPast: isPastSlot,
        overlappingReservations: overlappingReservations.length
      };
    });

    return {
      date,
      restaurantId,
      timeSlots: allSlotsWithStatus, // Return ALL slots
      totalSlots: allTimeSlots.length,
      availableSlots: allSlotsWithStatus.filter(s => s.available).length,
      bookedSlots: allSlotsWithStatus.filter(s => s.bookedTables.length > 0).length,
      debug: true
    };

  } catch (err) {
    console.error("Error fetching debug time slots:", err);
    throw err;
  }
}

async function testDebugSlots() {
  try {
    console.log('🔧 Testing debug slots function...\n');
    
    // Connect to database
    if (process.env.MONGO_URL) {
      await DBConnect(process.env.MONGO_URL);
      console.log('✅ Database connected\n');
    }
    
    const restaurantId = '68e147a53c053e790e0ac135';
    const date = '2025-10-11'; // Date that has reservations
    
    const result = await getDebugTimeSlots(restaurantId, date);
    
    console.log('\n📊 Debug slots response:');
    console.log(`Total slots: ${result.totalSlots}, Available: ${result.availableSlots}, Booked: ${result.bookedSlots}\n`);
    
    // Show slots with bookings
    const slotsWithBookings = result.timeSlots.filter(slot => slot.bookedTables.length > 0);
    if (slotsWithBookings.length > 0) {
      console.log('🎯 Slots with bookings:');
      slotsWithBookings.forEach(slot => {
        console.log(`  - ${slot.time}: Booked tables ${slot.bookedTables.join(', ')} (${slot.overlappingReservations} reservations)`);
      });
    }
    
    // Show specific T1/T2 bookings
    const t1t2Bookings = result.timeSlots.filter(slot => 
      slot.bookedTables.some(table => table === 'T1' || table === 'T2')
    );
    
    if (t1t2Bookings.length > 0) {
      console.log('\n✅ Found T1/T2 bookings:');
      t1t2Bookings.forEach(slot => {
        const relevantTables = slot.bookedTables.filter(t => t === 'T1' || t === 'T2');
        console.log(`  - ${slot.time}: ${relevantTables.join(', ')}`);
      });
    } else {
      console.log('\n❌ No T1/T2 bookings found');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDebugSlots();