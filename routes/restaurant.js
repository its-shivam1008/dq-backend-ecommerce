const express = require('express');
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const upload = require('../middleware/upload');

const {
    getAllRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    deleteRestaurant,
    updateRestaurantStatus,
    getRestaurantsByCity,
    getRestaurantsByCuisine,
    searchRestaurants,
    toggleRestaurantStatus,
    getRestaurantStats,
    switchRestaurant
} = require('../controllers/RestaurantController');

// Restaurant statistics
router.get('/stats', authMiddleware, getRestaurantStats);

// Search, filter
router.get('/search/:searchTerm', authMiddleware, searchRestaurants);
router.get('/city/:city', authMiddleware, getRestaurantsByCity);
router.get('/cuisine/:cuisine', authMiddleware, getRestaurantsByCuisine);

// CRUD operations
router.get('/all/restaurants', authMiddleware, getAllRestaurants);
router.get('/:id', authMiddleware, getRestaurantById);
router.post('/create/restaurants/', authMiddleware, upload.single('restaurantImage'), createRestaurant);
router.put('/restaurants/update/:id', authMiddleware, upload.single('restaurantImage'), updateRestaurant);
router.delete('/restaurants/delete/:id', authMiddleware, deleteRestaurant);

// Status updates
router.patch('/restaurants/:id/status', authMiddleware, updateRestaurantStatus);
router.patch('/restaurants/:id/toggle-status', authMiddleware, toggleRestaurantStatus);

// Switch restaurant
router.post('/switch-restaurant', authMiddleware, switchRestaurant);

module.exports = router;
