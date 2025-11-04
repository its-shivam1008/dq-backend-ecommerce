const Transaction = require('../model/Transaction');
// const Order = require('../model/Order');
const Customer = require('../model/Customer');
// const Menu = require('../model/Menu');
const mongoose = require('mongoose');

// Helper function to get date range based on period
const getDateRange = (period) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'daily':
      return {
        start: startOfDay,
        end: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      };
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
      };
    case 'yearly':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1)
      };
    default:
      return {
        start: startOfDay,
        end: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
      };
  }
};

// Get all days reports - Updated to fetch transactions by restaurantId
exports.getAllDaysReports = async (req, res) => {
  try {
    const { customerId } = req.params; // This is actually restaurantId from frontend

    const transactions = await Transaction.find({ restaurantId: customerId })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all days reports',
      error: error.message
    });
  }
};

// Simple test endpoint
exports.testEndpoint = async (req, res) => {
  try {
    console.log('Test endpoint called');
    res.json({
      success: true,
      message: 'Test endpoint working',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error.message
    });
  }
};

// Get all transactions (for debugging)
exports.getAllTransactionsDebug = async (req, res) => {
  try {
    console.log('Debug endpoint called');

    // Simple query without populate to avoid any issues
    const allTransactions = await Transaction.find({}).sort({ createdAt: -1 });

    console.log('All transactions in collection:', allTransactions.length);
    console.log('Sample transaction:', allTransactions[0]);

    res.json({
      success: true,
      data: allTransactions
    });
  } catch (error) {
    console.error('getAllTransactionsDebug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all transactions',
      error: error.message
    });
  }
};

// Get all transactions for a restaurant
exports.getAllTransactions = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    console.log('getAllTransactions called with restaurantId:', restaurantId);
    console.log('User from auth middleware:', req.user);

    // First, let's see all transactions in the collection
    const allTransactions = await Transaction.find({});
    console.log('Total transactions in collection:', allTransactions.length);

    if (allTransactions.length > 0) {
      console.log('Sample transaction restaurantId:', allTransactions[0]?.restaurantId);
      console.log('Sample transaction restaurantId type:', typeof allTransactions[0]?.restaurantId);
      console.log('Requested restaurantId type:', typeof restaurantId);
    }

    // For now, let's return ALL transactions to see them all
    const transactions = await Transaction.find({})
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    console.log('Returning all transactions:', transactions.length);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('getAllTransactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message
    });
  }
};

// Get report by type (daily/monthly/yearly)
exports.getReportByType = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { type } = req.query; // daily, monthly, yearly

    const dateRange = getDateRange(type);

    const transactions = await Transaction.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: {
        $gte: dateRange.start,
        $lt: dateRange.end
      }
    }).populate('customerId', 'name email');

    // Calculate summary statistics
    const totalRevenue = transactions.reduce((sum, txn) => sum + txn.total, 0);
    const totalTransactions = transactions.length;
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalRevenue,
          totalTransactions,
          averageOrderValue,
          period: type,
          dateRange
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report by type',
      error: error.message
    });
  }
};

// Get customer report
exports.getCustomerReport = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const customers = await Customer.find({ restaurantId })
      .populate({
        path: 'transactions',
        model: 'Transaction',
        match: { restaurantId: new mongoose.Types.ObjectId(restaurantId) }
      });

    const customerStats = customers.map(customer => {
      const totalSpent = customer.transactions.reduce((sum, txn) => sum + txn.total, 0);
      const totalOrders = customer.transactions.length;

      return {
        ...customer.toObject(),
        totalSpent,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0
      };
    });

    res.json({
      success: true,
      data: customerStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer report',
      error: error.message
    });
  }
};

// Get table report
exports.getTableReport = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.query;

    const transactions = await Transaction.find({
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    });

    // Group by table number
    const tableStats = {};
    transactions.forEach(txn => {
      const tableNumber = txn.tableNumber;
      if (!tableStats[tableNumber]) {
        tableStats[tableNumber] = {
          tableNumber,
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0
        };
      }
      tableStats[tableNumber].totalOrders++;
      tableStats[tableNumber].totalRevenue += txn.total;
    });

    // Calculate average order value
    Object.values(tableStats).forEach(table => {
      table.averageOrderValue = table.totalOrders > 0 ? table.totalRevenue / table.totalOrders : 0;
    });

    res.json({
      success: true,
      data: Object.values(tableStats)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch table report',
      error: error.message
    });
  }
};

// Get transaction count by date
exports.getTransactionCountByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    // Validation
    if (!startDate || !endDate || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: startDate, endDate, and restaurantId are required'
      });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    // Handle restaurantId - it can be either a string or ObjectId
    let restaurantQuery;
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      // If it's a valid ObjectId, use it as is
      restaurantQuery = new mongoose.Types.ObjectId(restaurantId);
    } else {
      // If it's a string, use it directly (for string restaurantId)
      restaurantQuery = restaurantId;
    }

    const query = {
      restaurantId: restaurantQuery,
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    console.log('Query:', JSON.stringify(query, null, 2));

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    console.log(`Found ${transactions.length} transactions for restaurant ${restaurantId}`);

    // Group by date
    const dailyStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          transactionCount: 0,
          totalRevenue: 0,
          transactions: []
        };
      }
      dailyStats[date].transactionCount++;
      dailyStats[date].totalRevenue += txn.total || 0;
      dailyStats[date].transactions.push({
        _id: txn._id,
        tableNumber: txn.tableNumber,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        payment_type: txn.type,
        total: txn.total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        created_at: txn.createdAt
      });
    });

    const result = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getTransactionCountByDate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction count by date',
      error: error.message
    });
  }
};

// Get tax collected by date
exports.getTaxCollectedByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    // Group by date
    const dailyTaxStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      if (!dailyTaxStats[date]) {
        dailyTaxStats[date] = {
          date,
          totalTax: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      dailyTaxStats[date].totalTax += txn.taxAmount || 0;
      dailyTaxStats[date].transactionCount++;
      dailyTaxStats[date].transactions.push({
        _id: txn._id,
        tableNumber: txn.tableNumber,
        userId: txn.customerId?.name || txn.username || 'Unknown',
        type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    res.json({
      success: true,
      data: Object.values(dailyTaxStats).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax collected by date',
      error: error.message
    });
  }
};

// Get table usage by date
exports.getTableUsageByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    // Group by date and table
    const tableUsageStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      const tableNumber = txn.tableNumber;
      const key = `${date}-${tableNumber}`;

      if (!tableUsageStats[key]) {
        tableUsageStats[key] = {
          date,
          tableNumber,
          usageCount: 0,
          totalRevenue: 0,
          transactions: []
        };
      }
      tableUsageStats[key].usageCount++;
      tableUsageStats[key].totalRevenue += txn.total;
      tableUsageStats[key].transactions.push({
        _id: txn._id,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        payment_type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    // Group by date for frontend compatibility
    const groupedByDate = {};
    Object.values(tableUsageStats).forEach(stat => {
      if (!groupedByDate[stat.date]) {
        groupedByDate[stat.date] = {
          date: stat.date,
          tables: []
        };
      }
      groupedByDate[stat.date].tables.push({
        tableNumber: stat.tableNumber,
        transactionCount: stat.usageCount,
        totalRevenue: stat.totalRevenue,
        transactions: stat.transactions
      });
    });

    res.json({
      success: true,
      data: Object.values(groupedByDate).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch table usage by date',
      error: error.message
    });
  }
};

// Get payment type report
exports.getPaymentTypeReport = async (req, res) => {
  try {
    const { restaurantId, startDate, endDate } = req.body;

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
      const paymentType = txn.type;
      if (!paymentStats[paymentType]) {
        paymentStats[paymentType] = {
          paymentType,
          totalCount: 0,
          totalAmount: 0
        };
      }
      paymentStats[paymentType].totalCount++;
      paymentStats[paymentType].totalAmount += txn.total;
    });

    res.json({
      success: true,
      data: Object.values(paymentStats)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment type report',
      error: error.message
    });
  }
};

// Get dashboard statistics report
exports.getDashboardStatisticsReport = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Today's stats
    const todayStats = await Transaction.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    // This month's stats
    const monthStats = await Transaction.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    // This year's stats
    const yearStats = await Transaction.aggregate([
      {
        $match: {
          restaurantId: new mongoose.Types.ObjectId(restaurantId),
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalTransactions: { $sum: 1 },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        today: todayStats[0] || { totalRevenue: 0, totalTransactions: 0, averageOrderValue: 0 },
        month: monthStats[0] || { totalRevenue: 0, totalTransactions: 0, averageOrderValue: 0 },
        year: yearStats[0] || { totalRevenue: 0, totalTransactions: 0, averageOrderValue: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics report',
      error: error.message
    });
  }
};

// Get discount usage by date
exports.getDiscountUsageByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;
    console.log('Received params:', { startDate, endDate, restaurantId });

    const query = {
      createdAt: {
        $gte: new Date(startDate + 'T00:00:00Z'),
        $lte: new Date(endDate + 'T23:59:59Z')
      },
      discount: { $gt: 0 }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    console.log('Query:', JSON.stringify(query, null, 2));
    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });
    console.log('Transactions found:', transactions.length);
    if (transactions.length > 0) {
      console.log('Sample transaction:', transactions[0]);
    }

    const dailyDiscountStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      if (!dailyDiscountStats[date]) {
        dailyDiscountStats[date] = {
          date,
          discountCount: 0,
          totalDiscount: 0,
          totalTransactions: 0,
          transactions: []
        };
      }
      dailyDiscountStats[date].discountCount++;
      dailyDiscountStats[date].totalDiscount += txn.discount || 0; // Fixed to use discount
      dailyDiscountStats[date].totalTransactions++;
      dailyDiscountStats[date].transactions.push({
        _id: txn._id,
        tableNumber: txn.tableNumber,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        payment_type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    const result = Object.values(dailyDiscountStats).sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log('Daily Discount Stats:', dailyDiscountStats);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.log('Error in getDiscountUsageByDate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discount usage by date',
      error: error.message
    });
  }
};

// Get average order value by date
exports.getAverageOrderValueByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    // Group by date
    const dailyAvgStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      if (!dailyAvgStats[date]) {
        dailyAvgStats[date] = {
          date,
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          transactions: []
        };
      }
      dailyAvgStats[date].totalRevenue += txn.total;
      dailyAvgStats[date].totalOrders++;
      dailyAvgStats[date].transactions.push({
        _id: txn._id,
        tableNumber: txn.tableNumber,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        payment_type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    // Calculate average order value
    Object.values(dailyAvgStats).forEach(stat => {
      stat.averageOrderValue = stat.totalOrders > 0 ? stat.totalRevenue / stat.totalOrders : 0;
    });

    res.json({
      success: true,
      data: Object.values(dailyAvgStats).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch average order value by date',
      error: error.message
    });
  }
};

// Get transactions by payment type
exports.getTransactionsByPaymentType = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    // Group by date and payment type
    const paymentTypeStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      const paymentType = txn.type;

      if (!paymentTypeStats[date]) {
        paymentTypeStats[date] = {
          date,
          paymentTypes: {}
        };
      }

      if (!paymentTypeStats[date].paymentTypes[paymentType]) {
        paymentTypeStats[date].paymentTypes[paymentType] = {
          paymentType,
          transactionCount: 0,
          totalAmount: 0,
          transactions: []
        };
      }

      paymentTypeStats[date].paymentTypes[paymentType].transactionCount++;
      paymentTypeStats[date].paymentTypes[paymentType].totalAmount += txn.total;
      paymentTypeStats[date].paymentTypes[paymentType].transactions.push({
        _id: txn._id,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        tableNumber: txn.tableNumber,
        payment_type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    // Convert to array format
    const result = Object.keys(paymentTypeStats).map(date => ({
      date,
      paymentTypes: Object.values(paymentTypeStats[date].paymentTypes)
    }));

    res.json({
      success: true,
      data: result.sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions by payment type',
      error: error.message
    });
  }
};

// Get total revenue by date
exports.getTotalRevenueByDate = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    // Group by date
    const dailyRevenueStats = {};
    transactions.forEach(txn => {
      const date = txn.createdAt.toISOString().split('T')[0];
      if (!dailyRevenueStats[date]) {
        dailyRevenueStats[date] = {
          date,
          totalRevenue: 0,
          transactionCount: 0,
          transactions: []
        };
      }
      dailyRevenueStats[date].totalRevenue += txn.total;
      dailyRevenueStats[date].transactionCount++;
      dailyRevenueStats[date].transactions.push({
        _id: txn._id,
        user_id: txn.customerId?.name || txn.username || 'Unknown',
        tableNumber: txn.tableNumber,
        payment_type: txn.type,
        sub_total: txn.sub_total || 0,
        discount: txn.discount || 0,
        tax: txn.taxAmount || 0,
        total: txn.total,
        note: txn.notes || '',
        created_at: txn.createdAt
      });
    });

    res.json({
      success: true,
      data: Object.values(dailyRevenueStats).sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch total revenue by date',
      error: error.message
    });
  }
};

// Get most ordered dishes
exports.getMostOrderedDishes = async (req, res) => {
  try {
    const { startDate, endDate, restaurantId } = req.query;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (restaurantId) {
      if (mongoose.Types.ObjectId.isValid(restaurantId)) {
        query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
      } else {
        query.restaurantId = restaurantId;
      }
    }

    const transactions = await Transaction.find(query);

    // Count dish orders
    const dishStats = {};
    transactions.forEach(txn => {
      txn.items.forEach(item => {
        const dishName = item.itemName;
        if (!dishStats[dishName]) {
          dishStats[dishName] = {
            dishName,
            totalOrders: 0,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        dishStats[dishName].totalOrders++;
        dishStats[dishName].totalQuantity += item.quantity;
        dishStats[dishName].totalRevenue += item.subtotal;
      });
    });

    // Sort by total orders
    const sortedDishes = Object.values(dishStats)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10); // Top 10

    res.json({
      success: true,
      data: sortedDishes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch most ordered dishes',
      error: error.message
    });
  }
};

// Get dashboard chart data (yearly)
exports.getDashboardChartData = async (req, res) => {
  try {
    const { year, restaurantId } = req.query;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const monthlyStats = await Transaction.aggregate([
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
          totalRevenue: { $sum: '$total' },
          totalTransactions: { $sum: 1 }
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
    const transactionData = new Array(12).fill(0);

    monthlyStats.forEach(stat => {
      const monthIndex = stat._id - 1;
      revenueData[monthIndex] = stat.totalRevenue;
      transactionData[monthIndex] = stat.totalTransactions;
    });

    res.json({
      success: true,
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            backgroundColor: '#36a2eb',
            borderColor: '#36a2eb'
          },
          {
            label: 'Transactions',
            data: transactionData,
            backgroundColor: '#4bc0c0',
            borderColor: '#4bc0c0'
          }
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard chart data',
      error: error.message
    });
  }
};

// Get weekly chart data
exports.getWeeklyChartData = async (req, res) => {
  try {
    const { year, restaurantId } = req.query;

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const weeklyStats = await Transaction.aggregate([
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
          _id: { $week: '$createdAt' },
          totalRevenue: { $sum: '$total' },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        datasets: weeklyStats.map(stat => ({
          label: `Week ${stat._id}`,
          data: [stat.totalRevenue],
          backgroundColor: `hsl(${stat._id * 30}, 70%, 50%)`,
          borderColor: `hsl(${stat._id * 30}, 70%, 50%)`
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly chart data',
      error: error.message
    });
  }
};