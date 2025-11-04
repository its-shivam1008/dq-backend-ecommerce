// routes/dashboard.js or your main routes file

const express = require('express');
const router = express.Router();
const {
  getOverallReport,
  getDashboardChartData,
  getWeeklyChartData,
  getPaymentTypeReport
} = require('../controllers/DashboardController');

// Import proper authentication middleware
const { authMiddleware } = require('../middleware/authMiddleware');

// Routes that match your frontend calls
router.get('/reports/:restaurantId', authMiddleware, getOverallReport);
router.get('/dashboard/chart-data', authMiddleware, getDashboardChartData);
router.get('/dashboard/weekly-chart-data', authMiddleware, getWeeklyChartData);
router.post('/getReportPaymentType', authMiddleware, getPaymentTypeReport);

module.exports = router;