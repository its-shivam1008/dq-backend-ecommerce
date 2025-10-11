const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/ReservationController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Create reservation
router.post("/reservations/add", reservationController.createReservation); // No auth required for customer reservations

// Get available time slots for a specific date
router.get("/available-slots", reservationController.getAvailableTimeSlots);

// Get all reservations (Admin/Manager only)
router.get("/AllByRestaurantId/:restaurantId", reservationController.getAllReservations);

// Get reservations by restaurant
// router.get("/restaurant/:restaurantId", authMiddleware, reservationController.getReservationsByRestaurant);

// Get reservations by user
router.get("/user/:userId", authMiddleware, reservationController.getReservationsByUser);

// Update reservation
router.put("/:id", authMiddleware, reservationController.updateReservation);

// Cancel reservation
router.delete("/:id", authMiddleware, reservationController.cancelReservation);

module.exports = router;
