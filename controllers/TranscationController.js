const Transaction = require("../model/Transaction");
const User = require("../model/User");
const mongoose = require('mongoose');

// Create Cash In or Cash Out Transaction

exports.createCashTransaction = async (req, res) => {
  try {
    const { restaurantId, userId, username, total, type, notes } = req.body;

    // Basic validation
    if (!restaurantId || !userId || !total || !type) {
      return res.status(400).json({ success: false, message: "Missing required fields: restaurantId, userId, total, type" });
    }

    if (type !== 'CashIn' && type !== 'CashOut' && type !== 'bank_in' && type !== 'bank_out') {
      return res.status(400).json({ success: false, message: "Invalid transaction type for cash transaction." });
    }

    // Create a transaction that satisfies the schema for CashIn/CashOut
    const newTransaction = new Transaction({
      restaurantId,
      userId,
      username,
      total: Number(total),
      type, // 'CashIn' or 'CashOut'
      notes: notes,

      // Provide default/empty values for fields required by sales but not by cash transactions
      tableNumber: 'N/A',
      items: [],
      sub_total: 0,
      tax: 0,
      discount: 0,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // The pre-save hook will generate transactionId and handle calculations
    const savedTransaction = await newTransaction.save();

    // Return the full transaction object, consistent with createTransaction
    res.status(201).json({
      success: true,
      message: `${type} transaction created successfully`,
      transaction: savedTransaction, // Send the full object back
    });
  } catch (error) {
    console.error("Error creating cash transaction:", error.message);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};


exports.getDailyCashBalance = async (req, res) => {
  try {
    const { restaurantId, date } = req.params;

    if (!restaurantId || !date) {
      return res.status(400).json({ message: "Restaurant ID and date are required" });
    }

    const startOfDay = new Date(date) //.toISOString();
    // startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date() //.toISOString();
    // endOfDay.setHours(23, 59, 59, 999);

    const matchQuery = {
      // 👇 2. Convert the string ID to an ObjectId
      restaurantId: new mongoose.Types.ObjectId(restaurantId),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    };

    // The rest of the function logic remains the same...
    const result = await Transaction.aggregate([
      {
        $match: {
          ...matchQuery,
          type: { $in: ['Cash', 'Online', 'Card', 'Split', 'CashIn', 'CashOut', 'bank_in', 'bank_out'] }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$total" }
        }
      }
    ]);
    let cashIn = 0;
    let cashOut = 0;
    let totalCash = 0;
    let bankIn = 0; 
    let bankOut = 0;
    result.forEach(r => {
      if (r._id === "CashIn") {
        cashIn = r.total;
      } else if (r._id === "CashOut") {
        cashOut = r.total;
      } else if (r._id === "bank_in") { 
        bankIn = r.total;
      } else if (r._id === "bank_out") {  
        bankOut = r.total;
      } else {
        totalCash += r.total; // Treat Cash sales as CashIn
      }
    });
    const balance = totalCash + cashIn + bankIn - cashOut - bankOut;

    const transactionCount = await Transaction.countDocuments(matchQuery);

    res.json({ balance, cashIn, cashOut, bankIn, bankOut, transactionCount });

  } catch (error) {
    console.error("Error fetching daily cash balance and count:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.createTransaction = async (req, res) => {
  try {
    const {
      restaurantId,
      userId,
      tableNumber,
      items,
      sub_total,
      tax,
      discount,
      total,
      type,
      customerId,
      transactionId,
      roundOff,
      systemCharge
    } = req.body;

    // Enhanced validation
    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and cannot be empty"
      });
    }

    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Table number is required"
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required"
      });
    }

    // Initialize username variable
    let username;

    // If userId is provided but no username, fetch the user
    if (userId && !username) {
      const user = await User.findById(userId);
      if (user) {
        username = user.username;
      } else {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
    }

    // Validate and process items
    const processedItems = items.map(item => {
      if (!item.itemId || !item.itemName || !item.price || !item.quantity) {
        throw new Error('Each item must have itemId, itemName, price, and quantity');
      }

      return {
        itemId: item.itemId,
        itemName: item.itemName,
        price: Number(item.price),
        quantity: Number(item.quantity),
        size: item.size || null, // ✅ ADD SIZE FIELD
        selectedSubcategoryId: item.selectedSubcategoryId || null,
        subtotal: Number(item.price) * Number(item.quantity)
      };
    });

    // Create new transaction
    const newTransaction = new Transaction({
      restaurantId,
      userId: userId || null,
      username: username,
      tableNumber,
      items: processedItems,
      sub_total: Number(sub_total) || 0,
      tax: Number(tax) || 0,
      discount: Number(discount) || 0,
      total: Number(total) || 0,
      type,
      customerId,
      transactionId,
      roundOff,
      systemCharge,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const savedTransaction = await newTransaction.save();

    // Deduct inventory for all items in the transaction
    try {
      const { deductInventory } = require("../services/InventoryService");

      const inventoryResult = await deductInventory(
        processedItems,
        restaurantId,
        savedTransaction.transactionId,
        'transaction'
      );

      if (!inventoryResult.success) {
        console.error("Inventory deduction failed:", inventoryResult.errors);
        // You might want to handle this case differently based on business requirements
      }

      if (inventoryResult.warnings.length > 0) {
        console.warn("Inventory deduction warnings:", inventoryResult.warnings);
      }

    } catch (inventoryError) {
      console.error("Error deducting inventory:", inventoryError);
      // Don't fail the transaction if inventory deduction fails
      // You might want to handle this differently based on business requirements
    }

    // Credit reward points to customer if customerId is provided
    if (customerId) {
      try {
        const Menu = require("../model/Menu");
        const Customer = require("../model/Customer");

        // Calculate total reward points from all items in the transaction
        let totalRewardPoints = 0;

        for (const item of processedItems) {
          // Find the menu item to get its reward points
          const menuItem = await Menu.findById(item.itemId);
          if (menuItem && menuItem.rewardPoints) {
            totalRewardPoints += menuItem.rewardPoints * item.quantity;
          }
        }

        // Update customer's earned points if there are reward points to credit
        if (totalRewardPoints > 0) {
          await Customer.findByIdAndUpdate(
            customerId,
            { $inc: { earnedPoints: totalRewardPoints } },
            { new: true }
          );

          console.log(`Credited ${totalRewardPoints} reward points to customer ${customerId}`);
        }
      } catch (rewardError) {
        console.error("Error crediting reward points:", rewardError);
        // Don't fail the transaction if reward points fail
      }
    }

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction: savedTransaction,
    });
  } catch (error) {
    console.error("Create Transaction Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message
    });
  }
};

// ---------------- GET ALL TRANSACTIONS ----------------
exports.getAllTransactions = async (req, res) => {
  try {
    console.log('=== BACKEND: getAllTransactions CALLED ===');

    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required",
      });
    }

    // ✅ Filter by restaurantId and exclude deleted ones
    const transactions = await Transaction.find({
      restaurantId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length,
    });
  } catch (err) {
    console.error("Get All Transactions Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// exports.getAllTransactions = async (req, res) => {
//   try {
//     const transactions = await Transaction.find({
//       isDeleted: { $ne: true },
//     }).sort({ createdAt: -1 });
//     res.status(200).json({
//       success: true,
//       data: transactions,
//       count: transactions.length
//     });
//   } catch (err) {
//     console.error("Get All Transactions Error:", err);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: err.message
//     });
//   }
// };

// ---------------- GET TRANSACTIONS BY RESTAURANT ----------------
exports.getTransactionsByRestaurant = async (req, res) => {
  try {
    console.log('🔍 Transaction by Restaurant API Debug:');
    console.log('req.params.restaurantId:', req.params.restaurantId);
    console.log('req.userId:', req.userId);
    console.log('req.user:', req.user);
    console.log('req.user.restaurantId:', req.user?.restaurantId);
    console.log('req.user._id:', req.user?._id);
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    console.log("🔍 Final restaurantId used:", restaurantId);
    console.log("🔍 restaurantId type:", typeof restaurantId);
    console.log("🔍 restaurantId toString:", restaurantId?.toString());
    console.log("✅ Using ONLY restaurantId from user collection");

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    const transactions = await Transaction.find({
      restaurantId,
      isDeleted: { $ne: true }
    })
      .populate("userId", "username email fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    console.error("Get Transactions By Restaurant Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getTransactionsByYearRestaurant = async(req,res)=>{
  try {
    const { restaurantId } = req.params;
    const { year } = req.query; // <-- year query me aayega

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    // Year filter apply karo (agar diya gaya hai)
    let dateFilter = {};
    if (year) {
      const startOfYear = new Date(parseInt(year), 0, 1);
      const endOfYear = new Date(parseInt(year) + 1, 0, 1);
      dateFilter = {
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      };
    }

    const transactions = await Transaction.find({
      restaurantId,
      isDeleted: { $ne: true },
      ...dateFilter
    })
      .populate("userId", "username email fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    console.error("Get Transactions By Restaurant Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ---------------- GET TRANSACTION BY ID ----------------
exports.getTransactionById = async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Try to find by transactionId first, then by _id if not found
    let transaction = await Transaction.findOne({ transactionId })
      .populate('customerId', 'name email phoneNumber address')
      .populate('userId', 'name username')
      .populate('restaurantId', 'name address phone email');

    if (!transaction) {
      transaction = await Transaction.findById(transactionId)
        .populate('customerId', 'name email phoneNumber address')
        .populate('userId', 'name username')
        .populate('restaurantId', 'name address phone email');
    }

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ---------------- UPDATE TRANSACTION ----------------
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
      message: "Transaction updated successfully"
    });
  } catch (err) {
    console.error("Update Transaction Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ---------------- DELETE TRANSACTION (SOFT DELETE) ----------------
exports.deleteTransaction = async (req, res) => {
  try {
    const { deletionRemark } = req.body;
    const transactionId = req.params.id;
    // Find the transaction first to get existing notes
    const existingTransaction = await Transaction.findById(transactionId);

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        isDeleted: true,
        deletionRemark,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Transaction cancelled successfully",
      data: transaction
    });
  } catch (err) {
    console.error("Delete Transaction Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ---------------- GET TRANSACTIONS BY CUSTOMER ----------------
exports.getTransactionByCustomer = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    
    const transactions = await Transaction.find({
      customerId: req.params.id,
      restaurantId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    console.error("Get Transactions By Customer Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ---------------- GET TRANSACTIONS BY PAYMENT TYPE ----------------
exports.getTransactionsByPaymentType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Payment type is required"
      });
    }

    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    
    const transactions = await Transaction.find({
      type,
      restaurantId,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    console.error("Get Transactions By Payment Type Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

// ---------------- GET POS TRANSACTIONS ----------------
exports.getPOSTransactions = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    
    const transactions = await Transaction.find({
      restaurantId,
      isDeleted: { $ne: true },
    })
      .populate("userId", "username email fullName")
      .populate("restaurantId", "name")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (err) {
    console.error("Get POS Transactions Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};