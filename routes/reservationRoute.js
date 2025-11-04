const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/ReservationController");
const {authMiddleware, optionalAuthMiddleware} = require("../middleware/authMiddleware");
const Reservation = require("../model/Reservation");
const Table = require("../model/Table");

// --- Timezone helpers (Asia/Kolkata, UTC+5:30) ---
const IST_OFFSET_MIN = 330; // minutes
const MS_PER_MIN = 60 * 1000;

function parseYMD(str) {
  // Expect YYYY-MM-DD; fallback to today's IST date if missing/invalid
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
}

function utcMsForIstStartOfDay({ y, m, d }) {
  // 00:00 IST equals previous day 18:30 UTC
  return Date.UTC(y, m - 1, d) - IST_OFFSET_MIN * MS_PER_MIN;
}

function utcMsForIst({ y, m, d }, hh, mm) {
  // Convert an IST wall time (hh:mm) to UTC ms for the same calendar date in IST
  const totalMin = hh * 60 + mm;
  const utcTotalMin = totalMin - IST_OFFSET_MIN;
  const baseUtc = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  return baseUtc + utcTotalMin * MS_PER_MIN;
}

function nowIstMs() {
  return Date.now() + IST_OFFSET_MIN * MS_PER_MIN;
}

function formatHHMM(hh, mm) {
  const h = String(hh).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${h}:${m}`;
}

// Public: Get available slots for a date (fallback to default tables if none in DB)
router.get('/available-slots', async (req, res) => {
  try {
    const { restaurantId, date } = req.query;
    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }

    // Determine target day in IST
    const todayIst = new Date(nowIstMs());
    const todayParts = { y: todayIst.getUTCFullYear(), m: todayIst.getUTCMonth() + 1, d: todayIst.getUTCDate() };
    const parts = parseYMD(date) || todayParts;

    // Compute IST day window in UTC for DB query
    const dayStartUTCms = utcMsForIstStartOfDay(parts);
    const dayEndUTCms = utcMsForIstStartOfDay({ y: parts.y, m: parts.m, d: parts.d + 1 }) - 1;
    const dayStartUTC = new Date(dayStartUTCms);
    const dayEndUTC = new Date(dayEndUTCms);

    // Fetch reservations overlapping the day in UTC (which corresponds to IST day)
    const reservations = await Reservation.find({
      restaurantId,
      startTime: { $lte: dayEndUTC },
      endTime: { $gte: dayStartUTC }
    }).lean();

    // Determine table catalog (from DB or fallback)
    let allTables = [];
    try {
      const byString = await Table.find({ restaurantId }).select('tableNumber').lean();
      if (byString && byString.length) {
        allTables = byString.map(t => t.tableNumber);
      }
    } catch {}
    if (allTables.length === 0) {
      // Fallback to T1..T20
      allTables = Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
    }

    // Generate 30-min slots from 10:00 to 22:00 IST
    const slots = [];
    const startHour = 10; // 10 AM IST
    const endHour = 22;   // 10 PM IST (exclusive of 22:30)
    for (let hh = startHour; hh <= endHour; hh++) {
      for (const mm of [0, 30]) {
        if (hh === endHour && mm === 30) continue; // end at 22:00
        const slotLabel = formatHHMM(hh, mm); // IST label
        const slotStartUTC = new Date(utcMsForIst(parts, hh, mm));
        const slotEndUTC = new Date(slotStartUTC.getTime() + 30 * 60 * 1000);

        // Overlap if reservation intersects slot window
        const overlapping = reservations.filter(r => new Date(r.startTime) < slotEndUTC && new Date(r.endTime) > slotStartUTC);
        const booked = new Set(overlapping.map(r => r.tableNumber).filter(Boolean));
        const available = allTables.filter(tn => !booked.has(tn));

        // Determine "past" relative to IST clock
        const slotEndIstMs = slotEndUTC.getTime() + IST_OFFSET_MIN * MS_PER_MIN;
        const past = slotEndIstMs <= nowIstMs();

        slots.push({
          time: slotLabel,
          isPast: past,
          available: available.length > 0,
          availableTables: available,
          bookedTables: Array.from(booked)
        });
      }
    }

    const totalSlots = slots.length;
    const availableSlots = slots.filter(s => s.available).length;
    const bookedSlots = totalSlots - availableSlots;

    return res.json({ 
      success: true, 
      date: `${parts.y}-${String(parts.m).padStart(2,'0')}-${String(parts.d).padStart(2,'0')}`, 
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
