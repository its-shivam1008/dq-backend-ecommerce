const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/ReservationController");
const {authMiddleware, optionalAuthMiddleware} = require("../middleware/authMiddleware");
const Reservation = require("../model/Reservation");
const Table = require("../model/Table");

// Public: Get available slots for a date (fallback to default tables if none in DB)
router.get('/available-slots', async (req, res) => {
  try {
    const { restaurantId, date } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }
    const targetDate = date ? new Date(date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    // Normalize to start of day in local time
    const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Fetch reservations for the day
    const reservations = await Reservation.find({
      restaurantId,
      startTime: { $lte: dayEnd },
      endTime: { $gte: dayStart }
    }).lean();

    // Determine table catalog (from DB or fallback)
    let allTables = [];
    try {
      // restaurantId type may vary; attempt both string and ObjectId queries
      const byString = await Table.find({ restaurantId }).select('tableNumber').lean();
      if (byString && byString.length) {
        allTables = byString.map(t => t.tableNumber);
      }
    } catch {}
    if (allTables.length === 0) {
      // Fallback to T1..T20
      allTables = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
    }

    // Generate 30-min slots from 18:00 to 21:00 (7 slots)
    const slotTimes = ["18:00","18:30","19:00","19:30","20:00","20:30","21:00"];

    const now = new Date();
    const slots = slotTimes.map(t => {
      const [hh, mm] = t.split(':').map(Number);
      const slotStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hh, mm, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
      // Overlap if reservation intersects slot window
      const overlapping = reservations.filter(r => new Date(r.startTime) < slotEnd && new Date(r.endTime) > slotStart);
      const booked = new Set(overlapping.map(r => r.tableNumber).filter(Boolean));
      const available = allTables.filter(tn => !booked.has(tn));
      return {
        time: t,
        isPast: slotEnd <= now,
        available: available.length > 0,
        availableTables: available,
        bookedTables: Array.from(booked)
      };
    });

    const totalSlots = slots.length;
    const availableSlots = slots.filter(s => s.available).length;
    const bookedSlots = totalSlots - availableSlots;

    return res.json({ 
      success: true, 
      date: dayStart.toISOString().slice(0,10), 
      totalSlots,
      availableSlots,
      bookedSlots,
      timeSlots: slots 
    });
  } catch (err) {
    console.error('❌ Error computing available slots:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create reservation (public - optional auth)
router.post("/add", optionalAuthMiddleware, reservationController.createReservation);

router.get("/all", authMiddleware, reservationController.getAllReservations);
router.get("/debug/all", authMiddleware, reservationController.getAllReservations);

// Debug route to get all reservations
// router.get("/debug/all", reservationController.getAllReservationsDebug);

// Get reservations by restaurant
// router.get("/restaurant/:restaurantId", authMiddleware, reservationController.getReservationsByRestaurant);

// Get reservations by user
// router.get("/user/:userId", authMiddleware, reservationController.getReservationsByUser);

// Update reservation
router.put("/:id", authMiddleware, reservationController.updateReservation);

// Cancel reservation
router.delete("/:id", authMiddleware, reservationController.cancelReservation);

module.exports = router;