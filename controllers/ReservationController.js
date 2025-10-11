const Reservation = require("../model/Reservation");
// 📌 Create Reservation
exports.createReservation = async (req, res) => {
  try {
    const { restaurantId,
      customerId,
      startTime,
      endTime,
      customerName,
      tableNumber,
      advance,
      payment,
      notes,} = req.body;

    const reservation = new Reservation({
      restaurantId,
      customerId,
      customerName,
      startTime,
      endTime,
      tableNumber,
      advance,
      payment,
      notes,
    });

    await reservation.save();
    res.status(201).json({ message: "Reservation created successfully", reservation });
  } catch (err) {
    console.log("Error" , err)
    res.status(500).json({ message: "Error creating reservation", error: err.message });
  }
};

// 📌 Get all reservations (Admin/Manager)
exports.getAllReservations = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Fetch reservations for a restaurant and enrich with customer details if present
    const reservations = await Reservation.find({ restaurantId })
      .populate('customerId', 'name phoneNumber email address')
      .exec();

    // Transform data to match frontend expectations
    // Frontend expects: { reservations: [{ id, customerName, customerEmail, customerPhone, date, time, guests, specialRequests, orderItems, totalAmount, paymentMethod, status, createdAt, updatedAt }] }
    const transformedReservations = reservations.map((reservation) => {
      const start = new Date(reservation.startTime);
      const yyyy = String(start.getFullYear());
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      const hh = String(start.getHours()).padStart(2, '0');
      const mi = String(start.getMinutes()).padStart(2, '0');

      const date = `${yyyy}-${mm}-${dd}`;
      const time = `${hh}:${mi}`;

      const payment = Number(reservation.payment || 0);
      const advance = Number(reservation.advance || 0);

      return {
        id: reservation._id,
        customerName: reservation.customerName || reservation.customerId?.name || 'N/A',
        customerEmail: reservation.customerId?.email || null,
        customerPhone: reservation.customerId?.phoneNumber || null,
        date,
        time,
        guests: 2,
        specialRequests: reservation.notes || '',
        orderItems: [],
        totalAmount: payment + advance,
        paymentMethod: advance > 0 ? 'advance' : payment > 0 ? 'paid' : 'unpaid',
        status: 'pending',
        createdAt: reservation.createdAt,
        updatedAt: reservation.updatedAt,
      };
    });

    res.json({ reservations: transformedReservations });
  } catch (err) {
    console.log(err, "reservation err");
    res.status(500).json({
      message: "Error fetching reservations",
      error: err.message,
    });
  }
};
// 📌 Get reservations by Restaurant
exports.getReservationsByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const reservations = await Reservation.findById({ restaurantId })

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: "Error fetching restaurant reservations", error: err.message });
  }
};

// 📌 Get reservations by User
exports.getReservationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reservations = await Reservation.find({ userId })
      .populate("restaurantId", "restName");

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user reservations", error: err.message });
  }
};

// 📌 Update reservation (change date/time/guests)
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByIdAndUpdate(id, req.body, { new: true });

    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    res.json({ message: "Reservation updated successfully", reservation });
  } catch (err) {
    res.status(500).json({ message: "Error updating reservation", error: err.message });
  }
};

// 📌 Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findByIdAndDelete(id);

    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    res.json({ message: "Reservation cancelled successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error cancelling reservation", error: err.message });
  }
};

// 📌 Get available time slots for a specific date
exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { restaurantId, date } = req.query;
    
    if (!restaurantId || !date) {
      return res.status(400).json({ message: "restaurantId and date are required" });
    }

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

    const existingReservations = await Reservation.find({
      restaurantId,
      startTime: {
        $gte: startOfDay,
        $lte: endOfDay
      }
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
    
    const availableSlots = allTimeSlots.filter(slot => {
      // If it's today, filter out past time slots
      if (isToday) {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = new Date();
        slotTime.setHours(hours, minutes, 0, 0);
        
        if (slotTime <= now) {
          return false; // Past time slot
        }
      }
      
      // Check if slot is booked
      return !bookedSlots.has(slot);
    });

    // Get table information for each available slot
    const slotsWithTables = availableSlots.map(slot => {
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
        available: true,
        availableTables: availableTables,
        bookedTables: bookedTables
      };
    });

    res.json({
      date,
      restaurantId,
      timeSlots: slotsWithTables,
      totalSlots: allTimeSlots.length,
      availableSlots: availableSlots.length,
      bookedSlots: bookedSlots.size
    });

  } catch (err) {
    console.error("Error fetching available time slots:", err);
    res.status(500).json({ message: "Error fetching available time slots", error: err.message });
  }
};