const Order = require("../model/Order");
const Customer = require("../model/Customer");
const Delivery = require("../model/Delivery");

exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items,
      totalAmount,
      status,
      deliveryId,
      restaurantId,
      userId,
      tableNumber,
      customerName,
      orderType,
      tax,
      discount,
      subtotal,
      kotGenerated,
      paymentStatus,
    } = req.body;
    let orderData = {
      items,
      totalAmount: totalAmount || subtotal || 0,
      status: status || "pending",
    };

    if (customerId) {
      orderData.customerId = customerId;
    } else if (customerName) {
      // Try to find existing customer by name
      let customer = await Customer.findOne({
        name: customerName,
        restaurantId: restaurantId
      });

      if (!customer && customerName !== 'Walk-in Customer') {
        customer = new Customer({
          name: customerName,
          restaurantId: restaurantId,
        });
        await customer.save();
      }

      if (customer) {
        orderData.customerId = customer._id;
      }
    }

    // Add additional fields if provided
    if (deliveryId) orderData.deliveryId = deliveryId;
    if (restaurantId) orderData.restaurantId = restaurantId;
    if (userId) orderData.userId = userId;
    if (tableNumber) orderData.tableNumber = tableNumber;
    if (orderType) orderData.orderType = orderType;
    if (tax !== undefined) orderData.tax = tax;
    if (discount !== undefined) orderData.discount = discount;
    if (subtotal !== undefined) orderData.subtotal = subtotal;
    if (kotGenerated !== undefined) orderData.kotGenerated = kotGenerated;
    if (paymentStatus) orderData.paymentStatus = paymentStatus;

    const order = new Order(orderData);
    await order.save();

    await order.populate("customerId", "name email");
    if (order.deliveryId) {
      await order.populate("deliveryId", "deliveryPerson status");
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
      order: order // Add this for frontend compatibility
    });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const envRestaurantId = process.env.RESTAURENT_ID;
    const reqRestaurantId = req.query.restaurantId || req.body?.restaurantId;
    const target = reqRestaurantId || envRestaurantId;

    let filter = {};
    if (target) {
      // Match both string and ObjectId forms to be safe
      const mongoose = require('mongoose');
      const or = [{ restaurantId: target }];
      if (mongoose.Types.ObjectId.isValid(target)) {
        or.push({ restaurantId: new mongoose.Types.ObjectId(target) });
      }
      filter.$or = or;
    }

    const orders = await Order.find(filter);
    res.json({
      success: true,
      data: orders,
      orders: orders
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getActiveTables = async (req, res) => {
  try {
// Get restaurantId from query or body, else fallback to env
    const restaurantId = req.query.restaurantId || req.body.restaurantId || process.env.RESTAURENT_ID;

    if (!restaurantId) {
      return res.status(400).json({ message: 'restaurantId is required' });
    }

    // Define "active" statuses
    const activeStatuses = ["pending", "confirmed", "preparing", "ready", "served"];

    // Fetch active orders for this restaurant
    const activeOrders = await Order.find({
      restaurantId,
      status: { $in: activeStatuses },
    }).sort({ createdAt: 1 }); // Optional: sort by time

    // Combine orders by tableNumber
    const combinedTables = {};
    activeOrders.forEach(order => {
      if (!combinedTables[order.tableNumber]) {
        combinedTables[order.tableNumber] = [];
      }
      combinedTables[order.tableNumber].push(order);
    });

    res.status(200).json({ combinedTables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.getCombinedOrders = async (req, res) => {
  try {
    const { tableNumbers } = req.body
    const restaurantId = req.query.restaurantId || process.env.RESTAURENT_ID;

    if (!restaurantId || !tableNumbers || !Array.isArray(tableNumbers)) {
      return res.status(400).json({ error: 'Restaurant ID and table numbers are required' })
    }

    const orders = await Order.find({
      restaurantId,
      tableNumber: { $in: tableNumbers },
      status: { $ne: 'cancelled' }
    }).populate('items.itemId')

    return res.status(200).json({ success: true, orders })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch combined orders' })
  }
}
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email")
      .populate("deliveryId", "deliveryPerson status");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, message: "Order status updated successfully", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};