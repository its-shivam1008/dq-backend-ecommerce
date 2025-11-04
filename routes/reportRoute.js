const express = require('express');
const router = express.Router();
const ReportsController = require('../controllers/ReportsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes are protected with authentication middleware

// Get all days reports
router.get('/daily/:customerId', authMiddleware, ReportsController.getAllDaysReports);

// Get all transactions for a restaurant
router.get('/transactions/:restaurantId', authMiddleware, ReportsController.getAllTransactions);

// Debug endpoints removed - using main endpoint for debugging

// Get report by type (daily/monthly/yearly)
router.get('/getReportByType/:restaurantId', authMiddleware, ReportsController.getReportByType);

// Get customer report
router.get('/customer-report/:restaurantId', authMiddleware, ReportsController.getCustomerReport);

// Get table report
router.get('/report-by-table', authMiddleware, ReportsController.getTableReport);

// Get transaction count by date
router.get('/report/transactionCountByDate', authMiddleware, ReportsController.getTransactionCountByDate);

// Get tax collected by date
router.get('/taxCollectedByDate', authMiddleware, ReportsController.getTaxCollectedByDate);

// Get table usage by date
router.get('/report/tableUsageByDate', authMiddleware, ReportsController.getTableUsageByDate);

// Get payment type report
router.post('/getReportPaymentType', authMiddleware, ReportsController.getPaymentTypeReport);

// Dashboard statistics report moved to dashboardRoute.js

// Get discount usage by date
// router.get('/discountUsageByDate', authMiddleware, ReportsController.getDiscountUsageByDate);
router.get('/report/discountUsageByDate', (req, res, next) => {
  console.log("👉 Hit /discountUsageByDate route");
  next();
}, authMiddleware, ReportsController.getDiscountUsageByDate);


// Get average order value by date
router.get('/report/averageOrderValueByDate', authMiddleware, ReportsController.getAverageOrderValueByDate);

// Get transactions by payment type
router.get('/transactionsByPaymentType', authMiddleware, ReportsController.getTransactionsByPaymentType);

// Get total revenue by date
router.get('/reports/totalRevenueByDate', authMiddleware, ReportsController.getTotalRevenueByDate);

// Get most ordered dishes
router.get('/mostOrderDishes', authMiddleware, ReportsController.getMostOrderedDishes);

// Get dashboard chart data (yearly)
router.get('/dashboard/chart-data', authMiddleware, ReportsController.getDashboardChartData);

// Get weekly chart data
router.get('/dashboard/weekly-chart-data', authMiddleware, ReportsController.getWeeklyChartData);

module.exports = router;