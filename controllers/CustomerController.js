
const Customer = require("../model/Customer");
const Message = require("../model/Message");
const Coupon = require("../model/Coupen");
const cron = require('node-cron');
const sendEmail = require("../services/MailService");
const UserProfile = require("../model/UserProfile");
const twilio = require("twilio");

// ✅ Load from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// ✅ Initialize Twilio client
const client = twilio(accountSid, authToken);

// === HELPER FUNCTIONS ===
const daysSinceCreation = (createdAt) => {
  if (!createdAt) return 0;
  const today = new Date();
  const createdDate = new Date(createdAt);
  const diffTime = Math.abs(today - createdDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getCustomerSettings = () => ({
  lostCustomerDays: 60,
  highSpenderAmount: 300,
  regularCustomerVisits: 10
});

const classifyCustomer = (customer, settings) => {
  if (customer.corporate === true) return 'Corporate';
  if (customer.totalSpent >= settings.highSpenderAmount) return 'High Spender';
  if (customer.frequency >= settings.regularCustomerVisits) return 'Regular';
  if (daysSinceCreation(customer.createdAt) >= settings.lostCustomerDays) return 'Lost Customer';
  return 'FirstTimer';
};

// ✅ Format message with coupon details
const formatMessageWithCoupon = (message, coupon) => {
  if (!coupon) return message;

  const couponInfo = `\n\n🎁 Special Offer: Use code ${coupon.code} to get ${coupon.discountValue}${coupon.discountType === 'percentage' ? '%' : '₹'} OFF!${coupon.minOrderValue > 0 ? ` (Min order: ₹${coupon.minOrderValue})` : ''}${coupon.expiryDate ? `\nValid until: ${new Date(coupon.expiryDate).toLocaleDateString('en-IN')}` : ''}`;

  return message + couponInfo;
};

// === GENERIC MESSAGE SENDING FUNCTIONS ===
const sendCustomEmail = async (customer, customMessage) => {
  try {
    await sendEmail(customer.email, "Message from Pebbles", customMessage);
    console.log(`✅ Email sent to: ${customer.name} (${customer.email})`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Email failed for ${customer.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendCustomSMS = async (customer, customMessage) => {
  try {
    let phone = customer.phoneNumber;
    if (!phone.startsWith('+')) {
      phone = '+91' + phone.replace(/^0/, '');
    }

    const response = await client.messages.create({
      body: customMessage,
      from: twilioPhoneNumber, // ✅ Using env variable
      to: phone,
    });

    console.log(`✅ SMS sent to ${customer.name} (${phone})`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error(`❌ SMS failed for ${customer.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendCustomWhatsApp = async (customer, customMessage) => {
  try {
    let phone = customer.phoneNumber;

    if (!phone.startsWith('+')) {
      phone = '+91' + phone.replace(/^0/, '');
    }

    const response = await client.messages.create({
      from: twilioWhatsAppNumber, // ✅ Using env variable
      to: `whatsapp:${phone}`,
      body: customMessage,
    });

    console.log(`✅ WhatsApp sent to ${customer.name} (${phone})`);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error(`❌ WhatsApp failed for ${customer.name}:`, error.message);
    return { success: false, error: error.message };
  }
};

// === SAVE/UPDATE MESSAGE AND SEND TO CUSTOMERS ===
exports.sendMessage = async (req, res) => {
  try {
    const { message, restaurantId, couponId } = req.body;

    // Validation
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    // Get coupon details if couponId provided
    let coupon = null;
    if (couponId) {
      coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found'
        });
      }
      console.log(`🎟️ Coupon attached: ${coupon.code}`);
    }

    // Save/Update message in database
    const savedMessage = await Message.findOneAndUpdate(
      { restaurantId },
      { 
        message,
        couponId: couponId || null,
        lastUpdated: new Date()
      },
      { 
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`💾 Message saved/updated for restaurant: ${restaurantId}`);

    // Get all customers for this restaurant
    const customers = await Customer.find({ restaurantId });

    if (!customers || customers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Message saved but no customers found to send',
        data: {
          messageId: savedMessage._id,
          totalCustomers: 0
        }
      });
    }

    console.log(`📤 Sending message to ${customers.length} customers...`);

    // Format message with coupon
    const finalMessage = formatMessageWithCoupon(message, coupon);

    let emailCount = 0;
    let smsCount = 0;
    let whatsappCount = 0;
    let failedCount = 0;

    // Send message to all customers
    for (const customer of customers) {
      try {
        if (customer.email) {
          const emailResult = await sendCustomEmail(customer, finalMessage);
          if (emailResult.success) emailCount++;
        }

        if (customer.phoneNumber) {
          const smsResult = await sendCustomSMS(customer, finalMessage);
          if (smsResult.success) smsCount++;
        }

        if (customer.phoneNumber) {
          const whatsappResult = await sendCustomWhatsApp(customer, finalMessage);
          if (whatsappResult.success) whatsappCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`Failed to send to ${customer.name}:`, error);
        failedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Message saved and sent successfully',
      data: {
        messageId: savedMessage._id,
        totalCustomers: customers.length,
        emailsSent: emailCount,
        smsSent: smsCount,
        whatsappSent: whatsappCount,
        failed: failedCount,
        couponAttached: coupon ? coupon.code : null
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};


// === GET SAVED MESSAGE FOR RESTAURANT ===
exports.getSavedMessage = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'Restaurant ID is required'
      });
    }

    const savedMessage = await Message.findOne({ restaurantId }).populate('couponId'); // ✅ Populate coupon

    if (!savedMessage) {
      return res.status(404).json({
        success: false,
        message: 'No saved message found'
      });
    }

    return res.status(200).json({
      success: true,
      data: savedMessage
    });

  } catch (error) {
    console.error('Get message error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve message',
      error: error.message
    });
  }
};

// === CRON JOB (Runs daily at 10AM IST) ===
cron.schedule('0 10 * * *', async () => {
  console.log('🚀 Daily Lost Customer Processing Started...');

  try {
    const customers = await Customer.find({});
    const settings = getCustomerSettings();

    for (const customer of customers) {
      const type = classifyCustomer(customer, settings);

      if (type === 'Lost Customer') {
        const alreadyNotified =
          customer.lastNotified &&
          (new Date() - new Date(customer.lastNotified)) < (settings.lostCustomerDays * 24 * 60 * 60 * 1000);

        if (alreadyNotified) {
          console.log(`⏭️ Skipping ${customer.name}, already notified recently.`);
          continue;
        }

        console.log(`📧 Processing: ${customer.name} (${type})`);

        // Get saved message for this restaurant
        const savedMessage = await Message.findOne({ restaurantId: customer.restaurantId }).populate('couponId'); // ✅ Populate coupon

        // Use saved message if available, otherwise skip
        if (!savedMessage || !savedMessage.message) {
          console.log(`⚠️ No saved message for restaurant ${customer.restaurantId}, skipping ${customer.name}`);
          continue;
        }

        // ✅ Format message with coupon if available
        const messageToSend = formatMessageWithCoupon(savedMessage.message, savedMessage.couponId);

        // Send using saved message
        if (customer.email) {
          await sendCustomEmail(customer, messageToSend);
        }

        if (customer.phoneNumber) {
          await sendCustomSMS(customer, messageToSend);
        }

        if (customer.phoneNumber) {
          await sendCustomWhatsApp(customer, messageToSend);
        }

        // Update lastNotified timestamp
        customer.lastNotified = new Date();
        await customer.save();

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('✅ Daily processing completed successfully.');
  } catch (error) {
    console.error('❌ Daily processing failed:', error);
  }
});

console.log('✅ Lost Customer Cron Job Initialized');


exports.createCustomer = async (req, res) => {
  try {
    let {
      name,
      email,
      address,
      phoneNumber,
      restaurantId,
      birthday,
      anniversary,
      corporate,
      membershipId,
      membershipName,
      rewardCustomerPoints,
      rewardByAdminPoints,
    } = req.body;

    if (membershipId === "") {
      membershipId = null;
    }

    if (!name || !email || !restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and restaurantId are required"
      });
    }

    // Check if the customer already exists
    const existingCustomer = await Customer.findOne({ email, restaurantId });

    if (existingCustomer) {
      // If customer exists → only update rewardByAdminPoints by ADDING
      const currentPoints = Number(existingCustomer.rewardByAdminPoints) || 0;
      const pointsToAdd = Number(rewardByAdminPoints) || 0;

      existingCustomer.rewardByAdminPoints = currentPoints + pointsToAdd;

      await existingCustomer.save(); // pre-save hook updates totalReward

      return res.status(200).json({
        success: true,
        message: `Existing customer updated. Added ${pointsToAdd} admin reward points.`,
        customer: existingCustomer
      });
    }

    // Otherwise, create a new customer
    const newCustomer = new Customer({
      name,
      email,
      address,
      phoneNumber,
      restaurantId,
      birthday,
      anniversary,
      corporate,
      membershipId,
      membershipName,
      rewardCustomerPoints: rewardCustomerPoints || 0,
      rewardByAdminPoints: rewardByAdminPoints || 0,
    });

    await newCustomer.save(); // pre-save hook will calculate totalReward

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer: newCustomer
    });
  } catch (err) {
    console.error("❌ Error in createCustomer:", err);
    return res.status(500).json({
      success: false,
      message: "Error creating customer",
      error: err.message
    });
  }
};

// exports.createCustomer = async (req, res) => {
//   try {
//     let {
//       name,
//       email,
//       address,
//       phoneNumber,
//       restaurantId,
//       birthday,
//       anniversary,
//       corporate,
//       membershipId,
//       membershipName,
//       rewardCustomerPoints,
//       rewardByAdminPoints, 
//     } = req.body;

//     if (membershipId === "") {
//       membershipId = null;
//     }

//     if (!name || !email || !restaurantId) {
//       return res
//         .status(400)
//         .json({ message: "Name, email, and restaurantId are required" });
//     }

//     const existingCustomer = await Customer.findOne({ email });
//     if (existingCustomer) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     const newCustomer = new Customer({
//       name,
//       email,
//       address,
//       phoneNumber,
//       restaurantId,
//       birthday,
//       anniversary,
//       corporate,
//       membershipId,
//       membershipName,
//       rewardCustomerPoints: rewardCustomerPoints || 0, // Initialize earned points
//       rewardByAdminPoints: rewardByAdminPoints || 0, 
//     });

//     await newCustomer.save(); // The pre-save hook will calculate totalReward

//     return res.status(201).json({
//       message: "Customer created successfully",
//       customer: newCustomer,
//     });
//   } catch (err) {
//     console.error("Error in createCustomer:", err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// Add reward points (from orders/purchases)
exports.addRewardPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { pointsToAdd } = req.body;

    console.log(`🎁 Adding ${pointsToAdd} reward points to customer ${id}`);

    if (!pointsToAdd || pointsToAdd < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid points to add. Must be a positive number."
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const currentPoints = Number(customer.rewardCustomerPoints) || 0;
    customer.rewardCustomerPoints = currentPoints + Number(pointsToAdd);
    await customer.save(); // The pre-save hook will update totalReward

    console.log(`✅ Customer ${customer.name} now has ${customer.rewardCustomerPoints} reward points`);

    res.status(200).json({
      success: true,
      message: `Successfully added ${pointsToAdd} reward points`,
      data: {
        customerId: customer._id,
        customerName: customer.name,
        previousPoints: currentPoints,
        pointsAdded: Number(pointsToAdd),
        totalPoints: customer.rewardCustomerPoints,
        totalReward: customer.totalReward // Send back the updated total
      }
    });
  } catch (error) {
    console.error('❌ Error adding reward points:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reward points',
      error: error.message
    });
  }
};

// Add admin reward points (manually given by admin)
exports.addAdminRewardPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { pointsToAdd } = req.body;

    console.log(`👤 Admin adding ${pointsToAdd} reward points to customer ${id}`);

    if (!pointsToAdd || pointsToAdd < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid points to add. Must be a positive number."
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const currentAdminPoints = Number(customer.rewardByAdminPoints) || 0;
    customer.rewardByAdminPoints = currentAdminPoints + Number(pointsToAdd);
    await customer.save(); // The pre-save hook will update totalReward

    console.log(`✅ Customer ${customer.name} now has ${customer.rewardByAdminPoints} admin reward points`);

    res.status(200).json({
      success: true,
      message: `Successfully added ${pointsToAdd} admin reward points`,
      data: {
        customerId: customer._id,
        customerName: customer.name,
        previousAdminPoints: currentAdminPoints,
        pointsAdded: Number(pointsToAdd),
        totalAdminPoints: customer.rewardByAdminPoints,
        totalReward: customer.totalReward // Send back the updated total
      }
    });
  } catch (error) {
    console.error('❌ Error adding admin reward points:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding admin reward points',
      error: error.message
    });
  }
};

// Deduct reward points (smart deduction: admin points first, then earned points)
exports.deductRewardPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { pointsToDeduct } = req.body;
    const numericPointsToDeduct = Number(pointsToDeduct);

    console.log(`💳 Deducting ${numericPointsToDeduct} reward points from customer ${id}`);

    if (!numericPointsToDeduct || numericPointsToDeduct <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid points to deduct. Must be a positive number."
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const currentRewardPoints = Number(customer.rewardCustomerPoints) || 0;
    const currentAdminPoints = Number(customer.rewardByAdminPoints) || 0;
    // Fallback to manual calculation if totalReward is 0 or invalid
    const totalAvailable = customer.totalReward > 0 
      ? customer.totalReward 
      : (currentRewardPoints + currentAdminPoints);

    if (totalAvailable < numericPointsToDeduct) {
      return res.status(400).json({
        success: false,
        message: `Insufficient reward points. Customer has ${totalAvailable} total points, but trying to deduct ${numericPointsToDeduct} points.`
      });
    }

    let remainingToDeduct = numericPointsToDeduct;

    // Deduct from admin points first
    if (currentAdminPoints > 0) {
      const deductFromAdmin = Math.min(currentAdminPoints, remainingToDeduct);
      customer.rewardByAdminPoints = currentAdminPoints - deductFromAdmin;
      remainingToDeduct -= deductFromAdmin;
    }

    // If there's still points to deduct, take from earned points
    if (remainingToDeduct > 0) {
      customer.rewardCustomerPoints = currentRewardPoints - remainingToDeduct;
    }

    await customer.save(); // The pre-save hook will update totalReward

    console.log(`✅ Customer ${customer.name} now has ${customer.totalReward} total reward points`);

    res.status(200).json({
      success: true,
      message: `Successfully deducted ${numericPointsToDeduct} reward points`,
      data: {
        customerId: customer._id,
        customerName: customer.name,
        previousRewardPoints: currentRewardPoints,
        previousAdminPoints: currentAdminPoints,
        pointsDeducted: numericPointsToDeduct,
        remainingRewardPoints: customer.rewardCustomerPoints,
        remainingAdminPoints: customer.rewardByAdminPoints,
        totalReward: customer.totalReward // Send back the new total
      }
    });
  } catch (error) {
    console.error('❌ Error deducting reward points:', error);
    res.status(500).json({
      success: false,
      message: 'Error deducting reward points',
      error: error.message
    });
  }
};

// ... (rest of your controller methods remain the same)

exports.getAllCustomers = async (req, res) => {
  try {
    const restaurantId = req.userId;
    const filter = restaurantId ? { restaurantId } : {};
    const customers = await Customer.find(filter).populate("membershipId");

    // Calculate and update totalReward for each customer
    for (let customer of customers) {
      if (!customer.totalReward || customer.totalReward === 0) {
        const customerPoints = Number(customer.rewardCustomerPoints) || 0;
        const adminPoints = Number(customer.rewardByAdminPoints) || 0;
        customer.totalReward = customerPoints + adminPoints;
        await customer.save();
      }
    }

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
};

exports.getAllCustomersForReservation = async (req, res) => {
  try {
    console.log("🔍 Fetching ALL customers for reservation dropdown...");
    const restaurantId = req.userId;
    console.log("👉 req.user.restaurantId =", req.userId);
    console.log("Type:", typeof req.userId);
    const customers = await Customer.find({ restaurantId: restaurantId }).populate("membershipId");
    console.log("📊 Total customers found:", customers.length);
    
    // Calculate and update totalReward for each customer
    for (let customer of customers) {
      if (!customer.totalReward || customer.totalReward === 0) {
        const customerPoints = Number(customer.rewardCustomerPoints) || 0;
        const adminPoints = Number(customer.rewardByAdminPoints) || 0;
        customer.totalReward = customerPoints + adminPoints;
        await customer.save();
      }
    }
    
    res.json(customers);
  } catch (err) {
    console.error("Error fetching all customers:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, role: "Customer" }).select("-password -verifyOTP -otpExpiry");
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const updates = req.body;
    const customerId = req.params.id;

    delete updates.password;
    delete updates.role;

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId },
      updates,
      { new: true, runValidators: true } // Added runValidators
    ).select("-password -verifyOTP -otpExpiry");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully", customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.restoreCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, role: "Customer" },
      { status: 1 },
      { new: true }
    );
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer restored", customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomersByType = async (req, res) => {
  try {
    const { restaurantId, customerType } = req.params;
    const decodedCustomerType = decodeURIComponent(customerType);
    const customers = await Customer.find({
      restaurantId,
      customerType: decodedCustomerType
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCustomerFrequency = async (req, res) => {
  try {
    const { id } = req.params;
    const { frequency, totalSpent } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      id,
      { frequency, totalSpent },
      { new: true, runValidators: true } // Added runValidators
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      message: "Customer frequency updated successfully",
      customer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.calculateCustomerTotalSpent = async (req, res) => {
  try {
    const Order = require("../model/Order");
    const customers = await Customer.find({});
    let updatedCount = 0;

    for (const customer of customers) {
      const orders = await Order.find({
        customerId: customer._id,
        status: { $in: ['completed', 'served'] }
      });

      const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      await Customer.findByIdAndUpdate(
        customer._id,
        { totalSpent },
        { new: true }
      );

      updatedCount++;
    }

    res.json({
      message: `Successfully updated total spent for ${updatedCount} customers`,
      updatedCount
    });
  } catch (err) {
    console.error("Error calculating customer total spent:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.calculateSingleCustomerTotalSpent = async (req, res) => {
  try {
    const { customerId } = req.params;
    const Order = require("../model/Order");

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const orders = await Order.find({
      customerId: customerId,
      status: { $in: ['completed', 'served'] }
    });

    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    const updatedCustomer = await Customer.findByIdAndUpdate(
      customerId,
      { totalSpent },
      { new: true }
    );

    res.json({
      message: "Customer total spent updated successfully",
      customer: updatedCustomer,
      totalSpent,
      orderCount: orders.length
    });
  } catch (err) {
    console.error("Error calculating single customer total spent:", err);
    res.status(500).json({ error: err.message });
  }
};