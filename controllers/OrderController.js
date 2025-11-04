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

    // Enhanced validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required and cannot be empty"
      });
    }

    if (!restaurantId && !req.user) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    if (!tableNumber) {
      return res.status(400).json({
        success: false,
        message: "Table number is required"
      });
    }

    // Use restaurantId from request or from authenticated user
    const finalRestaurantId = restaurantId || req.userId;
    const finalUserId = userId || req.userId;

    console.log("Final restaurantId:", finalRestaurantId);
    console.log("Final userId:", finalUserId);

    let orderData = {
      items,
      totalAmount: totalAmount || subtotal || 0,
      status: status || "pending",
      restaurantId: finalRestaurantId,
      userId: finalUserId,
      tableNumber: tableNumber || "Table-1", // Default table if not provided
    };
    orderData.customerName = customerName || "Walk-in Customer";

    if (customerId) {
      orderData.customerId = customerId;
      // Fetch customer address if customerId is provided
      const customer = await Customer.findById(customerId);
      if (customer && customer.address) {
        orderData.customerAddress = customer.address;
      }
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
        if (customer.address) {
          orderData.customerAddress = customer.address;
        }
      }
    }

    // Add additional fields if provided
    if (deliveryId) orderData.deliveryId = deliveryId;
    if (orderType) orderData.orderType = orderType;
    if (tax !== undefined) orderData.tax = tax;
    if (discount !== undefined) orderData.discount = discount;
    if (subtotal !== undefined) orderData.subtotal = subtotal;
    if (kotGenerated !== undefined) orderData.kotGenerated = kotGenerated;
    if (paymentStatus) orderData.paymentStatus = paymentStatus;

    console.log("Final order data before saving:", JSON.stringify(orderData, null, 2));

    const order = new Order(orderData);
    console.log("Order instance created, attempting to save...");
    
    const savedOrder = await order.save();
    console.log("Order saved successfully:", savedOrder._id);

    await order.populate("customerId", "name email");
    if (order.deliveryId) {
      await order.populate("deliveryId", "deliveryPerson status");
    }

    // Deduct inventory for all items in the order
    try {
      const { deductInventory } = require("../services/InventoryService");
      
      const inventoryResult = await deductInventory(
        items, 
        orderData.restaurantId, 
        savedOrder._id, 
        'order'
      );
      
      if (!inventoryResult.success) {
        console.error("Inventory deduction failed for order:", inventoryResult.errors);
        // You might want to handle this case differently based on business requirements
      }
      
      if (inventoryResult.warnings.length > 0) {
        console.warn("Inventory deduction warnings for order:", inventoryResult.warnings);
      }
      
    } catch (inventoryError) {
      console.error("Error deducting inventory for order:", inventoryError);
      // Don't fail the order if inventory deduction fails
      // You might want to handle this differently based on business requirements
    }

    // Credit reward points to customer if customerId is provided
    if (orderData.customerId) {
      try {
        const Menu = require("../model/Menu");
        const Customer = require("../model/Customer");
        
        // Calculate total reward points from all items in the order
        let totalRewardPoints = 0;
        
        for (const item of items) {
          // Find the menu item to get its reward points
          const menuItem = await Menu.findById(item.itemId);
          if (menuItem && menuItem.rewardPoints) {
            totalRewardPoints += menuItem.rewardPoints * item.quantity;
          }
        }
        
        // Update customer's earned points if there are reward points to credit
        if (totalRewardPoints > 0) {
          await Customer.findByIdAndUpdate(
            orderData.customerId,
            { $inc: { earnedPoints: totalRewardPoints } },
            { new: true }
          );
          
          console.log(`Credited ${totalRewardPoints} reward points to customer ${orderData.customerId}`);
        }
      } catch (rewardError) {
        console.error("Error crediting reward points:", rewardError);
        // Don't fail the order if reward points fail
      }
    }

    console.log("=== ORDER CREATION COMPLETED ===");
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: savedOrder,
      order: savedOrder // Add this for frontend compatibility
    });
  } catch (err) {
    console.error("=== ORDER CREATION FAILED ===");
    console.error("Error creating order:", err);
    console.error("Error details:", {
      name: err.name,
      message: err.message,
      code: err.code,
      errors: err.errors
    });
    
    // Handle specific validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    console.log("=== FETCHING ALL ORDERS ===");
    console.log("User from auth middleware:", req.user);
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    
    let query = {};
    if (restaurantId) {
      query.restaurantId = restaurantId;
    }
    
    console.log("Query filter:", query);
    
    const orders = await Order.find(query)
      .populate("customerId", "name email address")
      .populate("deliveryId", "deliveryPerson status")
      .populate("restaurantId", "username email")
      .populate("userId", "username email")
      .sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders`);
    
    // Update orders that don't have customerAddress but have customerId with address
    for (let order of orders) {
      if (!order.customerAddress && order.customerId && order.customerId.address) {
        order.customerAddress = order.customerId.address;
        await order.save();
      }
    }
    
    res.json({
      success: true,
      data: orders,
      orders: orders,
      count: orders.length
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};

exports.getActiveTables = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;

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
    const { restaurantId } = req.query
    const { tableNumbers } = req.body

    if (!restaurantId || !tableNumbers || !Array.isArray(tableNumbers)) {
      return res.status(400).json({ error: 'Restaurant ID and table numbers are required' })
    }

    const orders = await Order.find({
      restaurantId,
      tableNumber: { $in: tableNumbers },
      status: { $ne: 'cancelled' }
    })
      .populate('items.itemId')
      .populate('customerId', 'name email address')

    return res.status(200).json({ success: true, orders })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch combined orders' })
  }
}
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name email address")
      .populate("deliveryId", "deliveryPerson status");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    // Update order if it doesn't have customerAddress but has customerId with address
    if (!order.customerAddress && order.customerId && order.customerId.address) {
      order.customerAddress = order.customerId.address;
      await order.save();
    }

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

// Test endpoint to check database connection and order collection
exports.testOrderConnection = async (req, res) => {
  try {
    console.log("=== TESTING ORDER CONNECTION ===");
    
    // Test database connection
    const mongoose = require('mongoose');
    const connectionState = mongoose.connection.readyState;
    console.log("Mongoose connection state:", connectionState);
    
    // Test order collection access
    const orderCount = await Order.countDocuments();
    console.log("Total orders in collection:", orderCount);
    
    // Get a sample order
    const sampleOrder = await Order.findOne().sort({ createdAt: -1 });
    console.log("Latest order:", sampleOrder ? sampleOrder._id : "No orders found");
    
    res.json({
      success: true,
      message: "Database connection test successful",
      data: {
        connectionState: connectionState,
        totalOrders: orderCount,
        latestOrder: sampleOrder ? {
          id: sampleOrder._id,
          orderId: sampleOrder.orderId,
          status: sampleOrder.status,
          createdAt: sampleOrder.createdAt
        } : null
      }
    });
  } catch (err) {
    console.error("Database connection test failed:", err);
    res.status(500).json({
      success: false,
      message: "Database connection test failed",
      error: err.message
    });
  }
};