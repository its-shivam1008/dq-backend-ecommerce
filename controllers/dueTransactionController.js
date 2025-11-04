// controllers/dueTransactionController.js
const DueTransaction = require("../model/DueTransactions");
const Customer = require('../model/Customer');
const mongoose = require("mongoose");

exports.createDueTransaction = async (req, res) => {
  try {
    const { customer_id, total, paidAmount = 0, restaurantId } = req.body;
    console.log("Request body:", req.body);

    if (!customer_id) {
      return res.status(400).json({ message: "customer_id is required" });
    }

    // Validate customer
    const customer = await Customer.findOne({ _id: customer_id, restaurantId });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create due transaction
    const dueTransaction = new DueTransaction({
      customer_id: customer._id,
      total,
      paidAmount,
      remainingAmount: total - paidAmount,
      customerName: customer.name || customer.customerName,
      status: (total - paidAmount) <= 0 ? "paid" : "unpaid",
      restaurantId,
    });

    await dueTransaction.save();

    return res.status(201).json({
      message: "Due Transaction created successfully",
      dueTransaction,
    });
  } catch (error) {
    console.error("Error creating due transaction:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ---------------- GET ALL DUE TRANSACTIONS ----------------
exports.getAllDueTransactions = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }
    const items = await DueTransaction.find({restaurantId})
    res.status(200).json(items);
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Error fetching Due", error: err.message });
  }
}
exports.deleteDueTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Due transaction ID is required",
        success: false
      });
    }

    const dueTransaction = await DueTransaction.findById(id);
    if (!dueTransaction) {
      return res.status(404).json({
        message: "Due transaction not found",
        success: false
      });
    }

    await DueTransaction.findByIdAndDelete(id);

    res.status(200).json({
      message: "Due transaction deleted successfully",
      success: true,
      data: { id } // Return the deleted ID
    });
  } catch (error) {
    console.error("Error deleting due transaction:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message
    });
  }
};

exports.updateDueTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, transaction_id, addPayment, total, restaurantId } = req.body;

    if (!id) {
      return res.status(400).json({
        message: "Due transaction ID is required",
        success: false
      });
    }

    // Find existing due
    const dueTransaction = await DueTransaction.findById(id);
    if (!dueTransaction) {
      return res.status(404).json({
        message: "Due transaction not found",
        success: false
      });
    }

    const updateData = { updatedAt: new Date() };

    // Update customer if changed
    const customerId = customer_id || transaction_id;
    if (customerId) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          message: "Customer not found",
          success: false
        });
      }
      updateData.customer_id = customerId;
      updateData.customerName = customer.name || customer.customerName;
    }

    // Update total if needed
    if (total !== undefined) {
      const parsedTotal = parseFloat(total);
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        return res.status(400).json({
          message: "Invalid total amount",
          success: false
        });
      }
      updateData.total = parsedTotal;
    }

    // Handle partial payment
    if (addPayment !== undefined) {
      const parsedPayment = parseFloat(addPayment);
      if (isNaN(parsedPayment) || parsedPayment <= 0) {
        return res.status(400).json({
          message: "Invalid payment amount",
          success: false
        });
      }

      updateData.paidAmount = (dueTransaction.paidAmount || 0) + parsedPayment;
      updateData.remainingAmount = (dueTransaction.total || 0) - updateData.paidAmount;
      updateData.status = updateData.remainingAmount <= 0 ? "paid" : "unpaid";
    }

    // Save updated transaction
    const updatedDueTransaction = await DueTransaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("customer_id", "name customerName email phone");

    res.status(200).json({
      message: "Due transaction updated successfully",
      success: true,
      data: updatedDueTransaction
    });
  } catch (error) {
    console.error("Error updating due transaction:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message
    });
  }
};
// ---------------- DELETE DUE TRANSACTION ----------------

exports.deleteDueTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        message: "Due transaction ID is required",
        success: false
      });
    }

    const dueTransaction = await DueTransaction.findById(id);
    if (!dueTransaction) {
      return res.status(404).json({
        message: "Due transaction not found",
        success: false
      });
    }

    await DueTransaction.findByIdAndDelete(id);

    res.status(200).json({
      message: "Due transaction deleted successfully",
      success: true,
      data: { id } // Return the deleted ID
    });
  } catch (error) {
    console.error("Error deleting due transaction:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message
    });
  }
};

// ---------------- GET DUE TRANSACTION BY ID ----------------
exports.getDueTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        message: "Due transaction ID is required",
        success: false
      });
    }

    const dueTransaction = await DueTransaction.findById(id)
      .populate('customer_id', 'name customerName email phone');

    if (!dueTransaction) {
      return res.status(404).json({
        message: "Due transaction not found",
        success: false
      });
    }

    res.status(200).json({
      message: "Due transaction retrieved successfully",
      success: true,
      data: dueTransaction
    });
  } catch (error) {
    console.error("Error fetching due transaction:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message
    });
  }
};

exports.getDueTransactionsByCustomer = async (req, res) => {
  try {
    // Accept customer_id from URL params OR query params
    const customer_id = req.params.customer_id || req.query.customer_id;

    // Validate customer_id
    if (!customer_id || !mongoose.Types.ObjectId.isValid(customer_id)) {
      return res.status(400).json({
        message: "Valid customer ID is required",
        success: false,
      });
    }

    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    const filter = { customer_id };
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) {
      filter.restaurantId = restaurantId;
    }

    // Fetch due transactions
    const dueTransactions = await DueTransaction.find(filter);

    // If none found
    if (!dueTransactions || dueTransactions.length === 0) {
      return res.status(200).json({
        message: "No due transactions found for this customer.",
        success: true,
        data: [],
      });
    }

    // Success response
    res.status(200).json({
      message: "Due transactions retrieved successfully",
      success: true,
      data: dueTransactions,
    });

  } catch (error) {
    console.error("Error fetching customer dues:", error);
    res.status(500).json({
      message: "Internal server error",
      success: false,
      error: error.message,
    });
  }
};