const Coupon = require("../model/Coupen");

// ➤ Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const coupon = new Coupon({
      ...req.body,
      createdBy: req.userId,
      restaurantId: req.userId, // Set restaurantId to current user's ID
    });
    await coupon.save();

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
};

// ➤ Get all coupons (with pagination + filter)
exports.getCoupons = async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;

    const filter = {
      restaurantId: req.userId // Only get coupons for current user's restaurant
    };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(filter);

    res.json({
      success: true,
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
      error: error.message,
    });
  }
};

// ➤ Get single coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ 
      _id: req.params.id, 
      restaurantId: req.userId 
    });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    res.json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch coupon",
      error: error.message,
    });
  }
};

// ➤ Validate coupon by code
exports.validateCouponByCode = async (req, res) => {
  try {
    const { couponCode, orderTotal = 0 } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    const coupon = await Coupon.findOne({ 
      code: couponCode.toUpperCase(),
      isActive: true,
      restaurantId: req.userId // Only validate coupons for current user's restaurant
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid Coupon",
      });
    }

    // validate
    const validity = coupon.isValid();
    if (!validity.valid) {
      return res.status(400).json({
        success: false,
        message: validity.message,
      });
    }

    // Check max usage limit
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: `Coupon usage limit exceeded. Used: ${coupon.usageCount}/${coupon.maxUsage}`,
      });
    }

    // calculate discount
    const discount = coupon.calculateDiscount(orderTotal);
    if (!discount.applicable) {
      return res.status(400).json({
        success: false,
        message: discount.message,
      });
    }

    res.json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discount.discountAmount,
        minOrderValue: coupon.minOrderValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        expiryDate: coupon.expiryDate,
        usageCount: coupon.usageCount,
        maxUsage: coupon.maxUsage,
        description: coupon.description,
        isActive: coupon.isActive
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate coupon",
      error: error.message,
    });
  }
};

// ➤ Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { couponId, orderTotal } = req.body;

    const coupon = await Coupon.findOne({ 
      _id: couponId,
      restaurantId: req.userId // Only apply coupons for current user's restaurant
    });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // validate
    const validity = coupon.isValid();
    if (!validity.valid) {
      return res.status(400).json({
        success: false,
        message: validity.message,
      });
    }

    // Check max usage limit
    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({
        success: false,
        message: `Coupon usage limit exceeded. Used: ${coupon.usageCount}/${coupon.maxUsage}`,
      });
    }

    // calculate
    const discount = coupon.calculateDiscount(orderTotal);
    if (!discount.applicable) {
      return res.status(400).json({
        success: false,
        message: discount.message,
      });
    }

    // increment usage
    coupon.usageCount += 1;
    await coupon.save();

    res.json({
      success: true,
      message: "Coupon applied successfully",
      discount,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply coupon",
      error: error.message,
    });
  }
};

// ➤ Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.userId },
      req.body,
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update coupon",
      error: error.message,
    });
  }
};

// ➤ Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ 
      _id: req.params.id, 
      restaurantId: req.userId 
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
      error: error.message,
    });
  }
};