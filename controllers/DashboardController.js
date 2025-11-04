// Updated backend controller functions to match frontend expectations

const Transaction = require('../model/Transaction');
const Order = require('../model/Order');
const mongoose = require('mongoose');

// Helper function to get date ranges
const getDateRanges = () => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  
  // Weekly range (last 7 days)
  const startOfWeek = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Monthly range
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    today: { start: startOfDay, end: endOfDay },
    weekly: { start: startOfWeek, end: endOfDay },
    monthly: { start: startOfMonth, end: endOfMonth }
  };
};

// 1. Overall Report - This should match the route /reports/:restaurantId
const getOverallReport = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const dateRanges = getDateRanges();

    // Get transaction stats for each period
    const periods = ['today', 'weekly', 'monthly'];
    const report = {};

    for (const period of periods) {
      const { start, end } = dateRanges[period];
      
      // Get orders for this period
      const orders = await Order.find({
        restaurantId: new mongoose.Types.ObjectId(restaurantId),
        createdAt: { $gte: start, $lt: end }
      });

      // Calculate collection (total subtotal from orders)
      const totalCollection = orders.reduce((sum, order) => sum + (order.subtotal || 0), 0);

      // Calculate total invoices (orders with invoiceGenerated: true)
      const totalInvoices = orders.filter(order => order.invoiceGenerated === true).length;

      // Calculate completed orders (orders with paymentStatus: 'completed' or 'paid')
      const completedOrders = orders.filter(order => 
        order.paymentStatus === 'completed' || order.paymentStatus === 'paid'
      ).length;

      // Calculate rejected orders (orders with paymentStatus: 'rejected' or 'cancelled')
      const rejectedOrders = orders.filter(order => 
        order.paymentStatus === 'rejected' || order.paymentStatus === 'cancelled'
      ).length;

      // Set the exact property names your frontend expects
      const periodCapitalized = period.charAt(0).toUpperCase() + period.slice(1);
      
      report[`${period}Collection`] = totalCollection;
      report[`totalInvoice${periodCapitalized}`] = totalInvoices;
      report[`totalCompleteOrder${periodCapitalized}`] = completedOrders;
      report[`totalRejectOrder${periodCapitalized}`] = rejectedOrders;
    }

    console.log('Overall Report Data:', report);
    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Error in getOverallReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overall report',
      error: error.message
    });
  }
};

// 2. Chart Data - This should match the route /dashboard/chart-data
const getDashboardChartData = async (req, res) => {
  try {
    const { year, restaurantId } = req.query;
    
    if (!year || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Year and restaurantId are required'
      });
    }

    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year) + 1, 0, 1);
    
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: startOfYear,
            $lt: endOfYear
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalRevenue: { $sum: '$subtotal' },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Create labels for all 12 months
    const monthLabels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const revenueData = new Array(12).fill(0);
    const orderData = new Array(12).fill(0);
    
    monthlyStats.forEach(stat => {
      const monthIndex = stat._id - 1;
      revenueData[monthIndex] = stat.totalRevenue;
      orderData[monthIndex] = stat.totalOrders;
    });
    
    res.json({
      success: true,
      labels: monthLabels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: revenueData,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          fill: false
        },
        {
          label: 'Orders',
          data: orderData,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          fill: false
        }
      ]
    });
  } catch (error) {
    console.error('Error in getDashboardChartData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard chart data',
      error: error.message
    });
  }
};

// 3. Weekly Chart Data - This should match the route /dashboard/weekly-chart-data
const getWeeklyChartData = async (req, res) => {
  try {
    const { year, restaurantId } = req.query;
    
    if (!year || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Year and restaurantId are required'
      });
    }

    const startOfYear = new Date(parseInt(year), 0, 1);
    const endOfYear = new Date(parseInt(year) + 1, 0, 1);
    
    // Get monthly data for pie chart (weeks are too granular for pie chart)
    const monthlyStats = await Order.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: {
            $gte: startOfYear,
            $lt: endOfYear
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalRevenue: { $sum: '$subtotal' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
    ];

    const datasets = monthlyStats
      .filter(stat => stat.totalRevenue > 0) // Only include months with data
      .map((stat, index) => ({
        label: monthNames[stat._id - 1],
        data: [stat.totalRevenue],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length],
        borderWidth: 1
      }));
    
    res.json({
      success: true,
      datasets: datasets
    });
  } catch (error) {
    console.error('Error in getWeeklyChartData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly chart data',
      error: error.message
    });
  }
};

// 4. Payment Type Report - This should match the route /getReportPaymentType  
const getPaymentTypeReport = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.body;
    
    if (!restaurantId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId, startDate, and endDate are required'
      });
    }

    const transactions = await Transaction.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });
    
    // Group by payment type
    const paymentStats = {};
    transactions.forEach(txn => {
      const paymentType = txn.type || 'Unknown';
      if (!paymentStats[paymentType]) {
        paymentStats[paymentType] = {
          payment_type: paymentType,
          total_count: 0,
          total_amount: 0
        };
      }
      paymentStats[paymentType].total_count++;
      paymentStats[paymentType].total_amount += (txn.total || 0);
    });
    
    res.json({
      success: true,
      data: Object.values(paymentStats)
    });
  } catch (error) {
    console.error('Error in getPaymentTypeReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment type report',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  getOverallReport,
  getDashboardChartData,
  getWeeklyChartData,
  getPaymentTypeReport
};