export const { clearError, setCurrentPage } = floorSlice.actions;
export default floorSlice.reducer;
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getTables,
  createTable,
  createMultipleTables,
  updateTable,
  deleteTable,
} = require('../controllers/tableController');

// All routes require authentication
router.use(authenticate);

// Get all tables for a restaurant
router.get('/restaurants/:restaurantId/tables', authorize(['admin', 'manager', 'staff']), getTables);

// Create a single table
router.post('/restaurants/:restaurantId/tables', authorize(['admin', 'manager']), createTable);

// Create multiple tables
router.post('/restaurants/:restaurantId/tables/bulk', authorize(['admin', 'manager']), createMultipleTables);

// Update table
router.put('/restaurants/:restaurantId/tables/:id', authorize(['admin', 'manager']), updateTable);

// Delete table
router.delete('/restaurants/:restaurantId/tables/:id', authorize(['admin', 'manager']), deleteTable);

module.exports = router;
