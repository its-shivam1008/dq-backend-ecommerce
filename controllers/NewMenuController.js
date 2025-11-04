const Menu = require("../model/Menu");
const Inventory = require("../model/Inventory");
const Category = require("../model/Category");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const UserProfile = require("../model/UserProfile");
// ---------------- Multer Config ----------------
const storage = multer.memoryStorage();
const upload = multer({ storage });
// const upload = multer({ storage });
const uploadToCloudinary = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });

// Helper function to process sizes
const processSizes = (sizesData) => {
  if (!sizesData) return [];
  try {
    let parsedSizes = typeof sizesData === "string" ? JSON.parse(sizesData) : sizesData;
    if (!Array.isArray(parsedSizes)) return [];
    return parsedSizes
      .map(size => ({
        name: size.name?.trim() || size.label?.trim() || "",
        label: size.label?.trim() || size.name?.trim() || "",
        price: Number(size.price) || 0,
        enabled: size.enabled !== undefined ? Boolean(size.enabled) : true
      }))
      .filter(size => size.name && size.price > 0);
  } catch (error) {
    console.error("Error processing sizes:", error);
    return [];
  }
};

// Helper function to process stock items
const processStockItems = (stockItemsData) => {
  if (!stockItemsData) return [];
  try {
    let parsedStockItems = typeof stockItemsData === "string" ? JSON.parse(stockItemsData) : stockItemsData;
    if (!Array.isArray(parsedStockItems)) return [];
    return parsedStockItems
      .map((item) => ({
        stockId: item.stockId?.trim() || "",
        quantity: Number(item.quantity) || 0,
        unit: item.unit?.trim() || "",
        size: item.size?.trim() || "", // ✅ ADD SIZE FIELD
        price: Number(item.price) || 0 // ✅ ADD PRICE FIELD
      }))
      .filter((item) => item.stockId && item.quantity >= 0);
  } catch (error) {
    console.error("Error processing stock items:", error);
    return [];
  }
};


exports.createMenuItem = async (req, res) => {
  try {
    console.log("📝 Create Menu Item Request Body:", req.body);

    const {
      itemName,
      price,
      categoryId,
      restaurantId,
      sub_category,
      status,
      menuId,
      unit,
      description,
      preparationTime,
      rewardPoints,
    } = req.body;

    if (!itemName?.trim() || !categoryId || !restaurantId) {
      return res
        .status(400)
        .json({ message: "itemName, categoryId, and restaurantId are required." });
    }
    if (!menuId?.trim()) {
      return res.status(400).json({ message: "menuId is required." });
    }

    // const targetuser = await UserProfile.findById(restaurantId);

    // Check duplicate menuId for restaurant
    const existingMenu = await Menu.findOne({
      menuId: menuId.trim(),
      restaurantId,
    });
    if (existingMenu) {
      return res
        .status(400)
        .json({ message: "Menu ID already exists for this restaurant." });
    }

    // ✅ Get category name
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    let numericPrice = null;
    if (price) {
      numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res
          .status(400)
          .json({ message: "Price must be a valid non-negative number." });
      }
    }

    const processedSizes = processSizes(req.body.sizes);
    const processedStockItems = processStockItems(req.body.stockItems);
    
    // 🔍 DEBUG: Log processed data
    console.log("🔍 DEBUG - Backend processing:");
    console.log("req.body.stockItems:", req.body.stockItems);
    console.log("processedStockItems:", processedStockItems);

    let itemImage = null;
    if (req.file) {
      itemImage = await uploadToCloudinary(req.file.buffer, "menu");
    }

    const menuItemData = {
      menuId: menuId.trim(),
      itemName: itemName.trim(),
      price: numericPrice,
      sizes: processedSizes,
      categoryId,
      categoryName: category.categoryName, // ✅ save categoryName also
      restaurantId,
      sub_category: sub_category?.trim() || "",
      status: Number(status) || 1,
      itemImage,
      stockItems: processedStockItems,
      stock: 0,
      unit: unit?.trim() || "",
      description: description?.trim() || "",
      preparationTime: preparationTime ? Number(preparationTime) : 0,
      rewardPoints: rewardPoints ? Number(rewardPoints) : 0,
    };

    const menuItem = await Menu.create(menuItemData);

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  } catch (error) {
    console.error("❌ Failed to create menu item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create menu item",
      error: error.message,
    });
  }
};

// ✅ FIXED: Create Menu Item with proper unit handling
// exports.createMenuItem = async (req, res) => {
//   try {
//     console.log("📝 Create Menu Item Request Body:", req.body);

//     const {
//       itemName,
//       price,
//       categoryId,
//       restaurantId,
//       sub_category,
//       status,
//       menuId,
//       unit,
//       description,
//       preparationTime,
//     } = req.body;

//     // Validation
//     if (!itemName?.trim() || !categoryId || !restaurantId) {
//       return res.status(400).json({ message: "itemName, categoryId, and restaurantId are required." });
//     }
//     if (!menuId?.trim()) {
//       return res.status(400).json({ message: "menuId is required." });
//     }

//     // Check if menuId already exists
//     const existingMenu = await Menu.findOne({ menuId: menuId.trim(), restaurantId });
//     if (existingMenu) {
//       return res.status(400).json({ message: "Menu ID already exists for this restaurant." });
//     }

//     let numericPrice = null;
//     if (price) {
//       numericPrice = Number(price);
//       if (isNaN(numericPrice) || numericPrice < 0) {
//         return res.status(400).json({ message: "Price must be a valid non-negative number." });
//       }
//     }

//     const processedSizes = processSizes(req.body.sizes);
//     const processedStockItems = processStockItems(req.body.stockItems);

//     console.log("✅ Processed stockItems:", processedStockItems);

//     // Handle image upload to Cloudinary from buffer
//     let itemImage = null;
//     if (req.file) {
//       itemImage = await uploadToCloudinary(req.file.buffer, "menu");
//     }

//     const menuItemData = {
//       menuId: menuId.trim(),
//       itemName: itemName.trim(),
//       price: numericPrice,
//       sizes: processedSizes,
//       categoryId,
//       restaurantId,
//       sub_category: sub_category?.trim() || "",
//       status: Number(status) || 1,
//       itemImage,
//       stockItems: processedStockItems, // ✅ Now includes unit
//       stock: 0,
//       unit: unit?.trim() || "",
//       description: description?.trim() || "",
//       preparationTime: preparationTime ? Number(preparationTime) : 0,
//     };

//     console.log("💾 Creating menu item with data:", menuItemData);

//     const menuItem = await Menu.create(menuItemData);
//     await menuItem.populate("categoryId", "categoryName");

//     console.log("✅ Menu item created:", menuItem);

//     res.status(201).json({
//       success: true,
//       message: "Menu item created successfully",
//       data: menuItem,
//     });
//   } catch (error) {
//     console.error("❌ Failed to create menu item:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create menu item",
//       error: error.message
//     });
//   }
// };
exports.uploadMiddleware = upload.single("itemImage");
// ---------------- GET ALL MENU ITEMS ----------------
exports.getMenuItems = async (req, res) => {
  try {
    console.log('🔍 Menu API Debug:');
    console.log('req.query.restaurantId:', req.query.restaurantId);
    console.log('req.userId:', req.userId);
    console.log('req.user:', req.user);
    console.log('req.user.restaurantId:', req.user?.restaurantId);
    console.log('req.user._id:', req.user?._id);
    
    // Prefer authenticated restaurantId, fallback to query for public access
    const restaurantId = req.userId || req.query.restaurantId;
    console.log("🔍 Final restaurantId used:", restaurantId);
    console.log("🔍 restaurantId type:", typeof restaurantId);
    console.log("🔍 restaurantId toString:", restaurantId?.toString());
    console.log("✅ Using ONLY restaurantId from user collection");

    // Build query filter - find menu items with same restaurantId
    let filter = {};
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    console.log("🔍 Database filter:", filter);

    const menuItems = await Menu.find(filter)
      .populate("categoryId", "categoryName")
      .sort({ createdAt: -1 });

    console.log("🔍 Database query result:", {
      count: menuItems.length,
      items: menuItems.map(item => ({
        id: item._id,
        name: item.itemName,
        status: item.status,
        restaurantId: item.restaurantId
      }))
    });

    res.status(200).json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    res.status(500).json({
      message: "Failed to fetch menu items",
      error: error.message
    });
  }
};

// Public API to get menu items by restaurantId (for customer menu)
exports.getPublicMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    console.log("🌐 Public Menu API - restaurantId:", restaurantId);
    
    if (!restaurantId) {
      return res.status(400).json({ 
        message: "restaurantId is required" 
      });
    }

    const menuItems = await Menu.find({ 
      restaurantId,
      status: 1 // Only active items
    })
      .populate("categoryId", "categoryName")
      .sort({ createdAt: -1 });

    console.log("✅ Public menu items found:", menuItems.length);
    
    res.status(200).json(menuItems);
  } catch (error) {
    console.error("Error fetching public menu items:", error);
    res.status(500).json({
      message: "Failed to fetch menu items",
      error: error.message
    });
  }
};

// ---------------- GET SINGLE MENU ITEM ----------------
exports.getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const menuItem = await Menu.findById(id)
      .populate("categoryId", "categoryName");

    if (!menuItem) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json(menuItem);
  } catch (error) {
    console.error("Error fetching menu item:", error);
    res.status(500).json({
      message: "Failed to fetch menu item",
      error: error.message
    });
  }
};

// ✅ FIXED: Update Menu Item with proper unit handling
// ==================== DEDUCT STOCK FROM MENU ====================
exports.deductStockFromMenu = async (req, res) => {
  try {
    const { itemId, quantityToDeduct, unit } = req.body;
    
    console.log('=== DEDUCT STOCK FROM MENU ===');
    console.log('Item ID:', itemId);
    console.log('Quantity to deduct:', quantityToDeduct);
    console.log('Unit:', unit);
    
    // Call deductStock API with unit parameter
    const deductResult = await fetch('http://localhost:4000/api/deduct-stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization || 'dummy-token'}`
      },
      body: JSON.stringify({
        itemId: itemId,
        quantityToDeduct: quantityToDeduct,
        unit: unit  // ✅ Pass unit parameter
      })
    });
    
    if (!deductResult.ok) {
      const errorData = await deductResult.json();
      return res.status(deductResult.status).json(errorData);
    }
    
    const result = await deductResult.json();
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Error deducting stock from menu:', error);
    res.status(500).json({
      success: false,
      message: 'Error deducting stock',
      error: error.message
    });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    console.log("📝 Update Menu Item Request Body:", req.body);

    const { id } = req.params;
    const {
      itemName,
      price,
      categoryId,
      sub_category,
      stock,
      sizes,
      stockItems,
      description,
      preparationTime
    } = req.body;

    const updateData = {};
    if (itemName) updateData.itemName = itemName.trim();
    if (price) updateData.price = Number(price);
    if (categoryId) updateData.categoryId = categoryId;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (stock !== undefined) updateData.stock = Number(stock);
    if (description !== undefined) updateData.description = description?.trim() || "";
    if (preparationTime !== undefined) updateData.preparationTime = Number(preparationTime) || 0;

    // ✅ Handle sizes update
    if (sizes) {
      const processedSizes = processSizes(sizes);
      updateData.sizes = processedSizes;
      console.log("✅ Processed sizes for update:", processedSizes);
    }

    // ✅ FIXED: Handle stockItems with unit field using helper function
    if (stockItems) {
      const processedStockItems = processStockItems(stockItems);
      updateData.stockItems = processedStockItems;
      console.log("✅ Processed stockItems for update:", processedStockItems);
    }

    // Handle image upload from buffer
    if (req.file) {
      const existingMenu = await Menu.findById(id);
      updateData.itemImage = await uploadToCloudinary(req.file.buffer, "menu");

      // Optionally delete old Cloudinary image
      if (existingMenu?.itemImage) {
        try {
          const publicId = existingMenu.itemImage.split("/").slice(-2).join("/").split(".")[0];
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn("Failed to delete old image:", err.message);
        }
      }
    }

    console.log("💾 Updating menu item with data:", updateData);

    const updatedMenu = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "categoryName");

    if (!updatedMenu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    console.log("✅ Menu item updated:", updatedMenu);

    res.status(200).json({
      message: "Menu item updated successfully",
      data: updatedMenu
    });
  } catch (error) {
    console.error("❌ Error updating menu item:", error);
    res.status(500).json({
      message: "Failed to update menu item",
      error: error.message
    });
  }
};

// ---------------- UPDATE MENU ITEM STATUS ----------------
exports.updateMenuStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

    console.log('🔄 Updating menu status - Request details:', { 
      id, 
      status, 
      user: req.user,
      userId: req.userId,
      actualUserId: req.actualUserId,
      userRestaurantId: req.user?.restaurantId
    });

    // Validate input
    if (!id || status === undefined) {
      return res.status(400).json({
        success: false,
        message: "Menu item ID and status are required",
      });
    }

    // Ensure status is either 0 or 1
    const numericStatus = Number(status);
    if (![0, 1].includes(numericStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Must be 0 (Inactive) or 1 (Active)",
      });
    }

    // Find the menu item first
    const menuItem = await Menu.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Check ownership - ensure the user has access to this menu item's restaurant
    // req.userId is set by authMiddleware to user.restaurantId
    const userRole = req.user?.role || 'user';
    const userRestaurantId = req.userId?.toString() || req.user?.restaurantId?.toString();
    const menuRestaurantId = menuItem.restaurantId?.toString();
    
    const isOwner = menuRestaurantId && userRestaurantId && menuRestaurantId === userRestaurantId;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const noRestaurantCheck = !menuRestaurantId; // Menu item with no restaurant restriction
    
    console.log('🔍 Ownership check:', {
      isOwner,
      isAdmin,
      noRestaurantCheck,
      menuRestaurantId,
      userRestaurantId,
      userRole
    });
    
    if (!isOwner && !isAdmin && !noRestaurantCheck) {
      console.log('❌ Unauthorized access attempt:', {
        menuRestaurantId,
        userRestaurantId,
        userId: req.user?._id,
        userRole
      });
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this menu item",
      });
    }

    // Update the menu item status
    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      { status: numericStatus },
      { new: true, runValidators: true }
    ).populate("categoryId", "categoryName");

    console.log('✅ Menu status updated successfully');

    res.status(200).json({
      success: true,
      message: `Menu item ${numericStatus === 1 ? 'activated' : 'deactivated'} successfully`,
      data: {
        _id: updatedMenu._id,
        status: updatedMenu.status,
      },
    });
  } catch (error) {
    console.error("Error updating menu status:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating menu status",
      error: error.message
    });
  }
};

// ---------------- DELETE MENU ITEM (SOFT DELETE) ----------------
exports.deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by setting status to 0
    const deletedMenu = await Menu.findByIdAndUpdate(
      id,
      { status: 0 },
      { new: true }
    );

    if (!deletedMenu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json({
      message: "Menu item deleted successfully",
      data: { _id: deletedMenu._id, status: deletedMenu.status }
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({
      message: "Failed to delete menu item",
      error: error.message
    });
  }
};

// ---------------- HARD DELETE MENU ITEM ----------------
exports.hardDeleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMenu = await Menu.findByIdAndDelete(id);

    if (!deletedMenu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    // Delete Cloudinary image if exists
    if (deletedMenu.itemImage) {
      try {
        const publicId = deletedMenu.itemImage.split("/").slice(-2).join("/").split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("Failed to delete image from Cloudinary:", err.message);
      }
    }

    res.status(200).json({
      message: "Menu item permanently deleted",
      data: { _id: deletedMenu._id }
    });
  } catch (error) {
    console.error("Error permanently deleting menu item:", error);
    res.status(500).json({
      message: "Failed to permanently delete menu item",
      error: error.message
    });
  }
};



// const Menu = require("../model/Menu");
// const Inventory = require("../model/Inventory");
// const multer = require("multer");
// const cloudinary = require("../config/cloudinary");
// const streamifier = require("streamifier");
// // ---------------- Multer Config ----------------
// const storage = multer.memoryStorage();
// const upload = multer({ storage });
// // const upload = multer({ storage });
// const uploadToCloudinary = (fileBuffer, folder) =>
//   new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       { folder },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result.secure_url);
//       }
//     );
//     streamifier.createReadStream(fileBuffer).pipe(stream);
//   });

// // Helper function to process sizes
// const processSizes = (sizesData) => {
//   if (!sizesData) return [];
//   try {
//     let parsedSizes = typeof sizesData === "string" ? JSON.parse(sizesData) : sizesData;
//     if (!Array.isArray(parsedSizes)) return [];
//     return parsedSizes
//       .map(size => ({
//         name: size.name?.trim() || size.label?.trim() || "",
//         label: size.label?.trim() || size.name?.trim() || "",
//         price: Number(size.price) || 0,
//         enabled: size.enabled !== undefined ? Boolean(size.enabled) : true
//       }))
//       .filter(size => size.name && size.price > 0);
//   } catch (error) {
//     console.error("Error processing sizes:", error);
//     return [];
//   }
// };

// // Helper function to process stock items
// const processStockItems = (stockItemsData) => {
//   if (!stockItemsData) return [];
//   try {
//     let parsedStockItems = typeof stockItemsData === "string" ? JSON.parse(stockItemsData) : stockItemsData;
//     if (!Array.isArray(parsedStockItems)) return [];
//     return parsedStockItems
//       .map((item) => ({
//         stockId: item.stockId?.trim() || "",
//         quantity: Number(item.quantity) || 0,
//       }))
//       .filter((item) => item.stockId && item.quantity >= 0);
//   } catch (error) {
//     console.error("Error processing stock items:", error);
//     return [];
//   }
// };
// exports.createMenuItem = async (req, res) => {
//   try {
//     const {
//       itemName,
//       price,
//       categoryId,
//       restaurantId,
//       sub_category,
//       status,
//       menuId,
//       unit,
//       description,
//       preparationTime,
//     } = req.body;

//     // Validation
//     if (!itemName?.trim() || !categoryId || !restaurantId) {
//       return res.status(400).json({ message: "itemName, categoryId, and restaurantId are required." });
//     }
//     if (!menuId?.trim()) {
//       return res.status(400).json({ message: "menuId is required." });
//     }

//     // Check if menuId already exists
//     const existingMenu = await Menu.findOne({ menuId: menuId.trim(), restaurantId });
//     if (existingMenu) {
//       return res.status(400).json({ message: "Menu ID already exists for this restaurant." });
//     }

//     let numericPrice = null;
//     if (price) {
//       numericPrice = Number(price);
//       if (isNaN(numericPrice) || numericPrice < 0) {
//         return res.status(400).json({ message: "Price must be a valid non-negative number." });
//       }
//     }

//     const processedSizes = processSizes(req.body.sizes);
//     const processedStockItems = processStockItems(req.body.stockItems);

//     // Handle image upload to Cloudinary from buffer
//     let itemImage = null;
//     if (req.file) {
//       itemImage = await uploadToCloudinary(req.file.buffer, "menu");
//     }

//     const menuItemData = {
//       menuId: menuId.trim(),
//       itemName: itemName.trim(),
//       price: numericPrice,
//       sizes: processedSizes,
//       categoryId,
//       restaurantId,
//       sub_category: sub_category?.trim() || "",
//       status: Number(status) || 1,
//       itemImage,
//       stockItems: processedStockItems,
//       stock: 0,
//       unit: unit?.trim() || "",
//       description: description?.trim() || "",
//       preparationTime: preparationTime ? Number(preparationTime) : 0,
//     };

//     const menuItem = await Menu.create(menuItemData);
//     await menuItem.populate("categoryId", "categoryName");

//     res.status(201).json({
//       success: true,
//       message: "Menu item created successfully",
//       data: menuItem,
//     });
//   } catch (error) {
//     console.error("Failed to create menu item:", error);
//     res.status(500).json({ success: false, message: "Failed to create menu item", error: error.message });
//   }
// };



// // Export multer middleware
// exports.uploadMiddleware = upload.single("itemImage");

// // ---------------- GET ALL MENU ITEMS ----------------
// exports.getMenuItems = async (req, res) => {
//   try {
//     const { restaurantId } = req.query;

//     // Build query filter
//     let filter = {};
//     if (restaurantId) {
//       filter.restaurantId = restaurantId;
//     }

//     const menuItems = await Menu.find(filter)
//       .populate("categoryId", "categoryName")
//       .sort({ createdAt: -1 });

//     res.status(200).json(menuItems);
//   } catch (error) {
//     console.error("Error fetching menu items:", error);
//     res.status(500).json({
//       message: "Failed to fetch menu items",
//       error: error.message
//     });
//   }
// };

// // ---------------- GET SINGLE MENU ITEM ----------------
// exports.getMenuItemById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const menuItem = await Menu.findById(id)
//       .populate("categoryId", "categoryName");

//     if (!menuItem) {
//       return res.status(404).json({ message: "Menu item not found" });
//     }

//     res.status(200).json(menuItem);
//   } catch (error) {
//     console.error("Error fetching menu item:", error);
//     res.status(500).json({
//       message: "Failed to fetch menu item",
//       error: error.message
//     });
//   }
// };


// // exports.updateMenuItem = async (req, res) => {
// //   try {
// //     const { id } = req.params;
// //     const {
// //       itemName,
// //       price,
// //       categoryId,
// //       sub_category,
// //       stock,
// //       sizes,
// //       stockItems,
// //     } = req.body;

// //     const updateData = {};
// //     if (itemName) updateData.itemName = itemName.trim();
// //     if (price) updateData.price = Number(price);
// //     if (categoryId) updateData.categoryId = categoryId;
// //     if (sub_category !== undefined) updateData.sub_category = sub_category;
// //     if (stock !== undefined) updateData.stock = Number(stock);

// //     // ✅ Handle sizes update
// //     if (sizes) {
// //       try {
// //         updateData.sizes =
// //           typeof sizes === "string" ? JSON.parse(sizes) : sizes;
// //       } catch (parseError) {
// //         return res.status(400).json({ message: "Invalid sizes format" });
// //       }
// //     }

// //     // ✅ Handle stockItems
// //     if (stockItems) {
// //       try {
// //         const parsedStockItems =
// //           typeof stockItems === "string" ? JSON.parse(stockItems) : stockItems;

// //         updateData.stockItems = parsedStockItems.map((item) => ({
// //           stockId: item.stockId || "",
// //           quantity: Number(item.quantity) || 0,
// //         }));
// //       } catch (parseError) {
// //         return res.status(400).json({ message: "Invalid stockItems format" });
// //       }
// //     }

// //     // ✅ Handle image upload
// //     if (req.file) {
// //       // find existing menu item (to remove old image if needed)
// //       const existingMenu = await Menu.findById(id);

// //       // upload new file to cloudinary
// //       const result = await cloudinary.uploader.upload(req.file.path, {
// //         folder: "menu",
// //         public_id: `${Date.now()}-${path.basename(
// //           req.file.originalname,
// //           path.extname(req.file.originalname)
// //         )}`,
// //       });

// //       updateData.itemImage = result.secure_url;

// //       // delete temp file
// //       fs.unlinkSync(req.file.path);

// //       // optionally delete old Cloudinary image
// //       if (existingMenu?.itemImage) {
// //         try {
// //           // extract public_id from URL
// //           const publicId = existingMenu.itemImage
// //             .split("/")
// //             .slice(-2)
// //             .join("/")
// //             .split(".")[0]; // folder/fileName (without extension)

// //           await cloudinary.uploader.destroy(publicId);
// //         } catch (err) {
// //           console.warn("Failed to delete old image:", err.message);
// //         }
// //       }
// //     }

// //     const updatedMenu = await Menu.findByIdAndUpdate(id, updateData, {
// //       new: true,
// //       runValidators: true,
// //     }).populate("categoryId", "categoryName");

// //     if (!updatedMenu) {
// //       return res.status(404).json({ message: "Menu item not found" });
// //     }

// //     res.status(200).json({
// //       message: "Menu item updated successfully",
// //       data: updatedMenu,
// //     });
// //   } catch (error) {
// //     console.error("❌ Error updating menu item:", error);
// //     res
// //       .status(500)
// //       .json({ message: "Failed to update menu item", error: error.message });
// //   }
// // };

// exports.updateMenuItem = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { itemName, price, categoryId, sub_category, stock, sizes, stockItems } = req.body;

//     const updateData = {};
//     if (itemName) updateData.itemName = itemName.trim();
//     if (price) updateData.price = Number(price);
//     if (categoryId) updateData.categoryId = categoryId;
//     if (sub_category !== undefined) updateData.sub_category = sub_category;
//     if (stock !== undefined) updateData.stock = Number(stock);

//     if (sizes) {
//       try {
//         updateData.sizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
//       } catch (parseError) {
//         return res.status(400).json({ message: "Invalid sizes format" });
//       }
//     }

//     if (stockItems) {
//       try {
//         const parsedStockItems = typeof stockItems === "string" ? JSON.parse(stockItems) : stockItems;
//         updateData.stockItems = parsedStockItems.map((item) => ({
//           stockId: item.stockId || "",
//           quantity: Number(item.quantity) || 0,
//         }));
//       } catch (parseError) {
//         return res.status(400).json({ message: "Invalid stockItems format" });
//       }
//     }

//     // Handle image upload from buffer
//     if (req.file) {
//       const existingMenu = await Menu.findById(id);
//       updateData.itemImage = await uploadToCloudinary(req.file.buffer, "menu");

//       // Optionally delete old Cloudinary image
//       if (existingMenu?.itemImage) {
//         try {
//           const publicId = existingMenu.itemImage.split("/").slice(-2).join("/").split(".")[0];
//           await cloudinary.uploader.destroy(publicId);
//         } catch (err) {
//           console.warn("Failed to delete old image:", err.message);
//         }
//       }
//     }

//     const updatedMenu = await Menu.findByIdAndUpdate(id, updateData, {
//       new: true,
//       runValidators: true,
//     }).populate("categoryId", "categoryName");

//     if (!updatedMenu) {
//       return res.status(404).json({ message: "Menu item not found" });
//     }

//     res.status(200).json({ message: "Menu item updated successfully", data: updatedMenu });
//   } catch (error) {
//     console.error("❌ Error updating menu item:", error);
//     res.status(500).json({ message: "Failed to update menu item", error: error.message });
//   }
// };

// // ---------------- UPDATE MENU ITEM STATUS ----------------
// exports.updateMenuStatus = async (req, res) => {
//   try {
//     const { id, status } = req.body;

//     // Validate input
//     if (!id || status === undefined) {
//       return res.status(400).json({
//         success: false,
//         message: "Menu item ID and status are required",
//       });
//     }

//     // Ensure status is either 0 or 1
//     const numericStatus = Number(status);
//     if (![0, 1].includes(numericStatus)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status value. Must be 0 (Inactive) or 1 (Active)",
//       });
//     }

//     const updatedMenu = await Menu.findByIdAndUpdate(
//       id,
//       { status: numericStatus },
//       { new: true, runValidators: true }
//     ).populate("categoryId", "categoryName");

//     if (!updatedMenu) {
//       return res.status(404).json({
//         success: false,
//         message: "Menu item not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: `Menu item ${numericStatus === 1 ? 'activated' : 'deactivated'} successfully`,
//       data: {
//         _id: updatedMenu._id,
//         status: updatedMenu.status,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating menu status:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error while updating menu status",
//       error: error.message
//     });
//   }
// };

// // ---------------- DELETE MENU ITEM (SOFT DELETE) ----------------
// exports.deleteMenuItem = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Soft delete by setting status to 0
//     const deletedMenu = await Menu.findByIdAndUpdate(
//       id,
//       { status: 0 },
//       { new: true }
//     );

//     if (!deletedMenu) {
//       return res.status(404).json({ message: "Menu item not found" });
//     }

//     res.status(200).json({
//       message: "Menu item deleted successfully",
//       data: { _id: deletedMenu._id, status: deletedMenu.status }
//     });
//   } catch (error) {
//     console.error("Error deleting menu item:", error);
//     res.status(500).json({
//       message: "Failed to delete menu item",
//       error: error.message
//     });
//   }
// };

// // ---------------- HARD DELETE MENU ITEM ----------------
// // exports.hardDeleteMenuItem = async (req, res) => {
// //   try {
// //     const { id } = req.params;

// //     const deletedMenu = await Menu.findByIdAndDelete(id);

// //     if (!deletedMenu) {
// //       return res.status(404).json({ message: "Menu item not found" });
// //     }

// //     // Delete associated image file if exists
// //     if (deletedMenu.itemImage && fs.existsSync(deletedMenu.itemImage)) {
// //       fs.unlinkSync(deletedMenu.itemImage);
// //     }

// //     res.status(200).json({
// //       message: "Menu item permanently deleted",
// //       data: { _id: deletedMenu._id }
// //     });
// //   } catch (error) {
// //     console.error("Error permanently deleting menu item:", error);
// //     res.status(500).json({
// //       message: "Failed to permanently delete menu item",
// //       error: error.message
// //     });
// //   }
// // };

// exports.hardDeleteMenuItem = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deletedMenu = await Menu.findByIdAndDelete(id);

//     if (!deletedMenu) {
//       return res.status(404).json({ message: "Menu item not found" });
//     }

//     // The fs.unlinkSync call was removed as it was incorrect.
//     // If you want to delete the Cloudinary image, you'd do it here.

//     res.status(200).json({
//       message: "Menu item permanently deleted",
//       data: { _id: deletedMenu._id }
//     });
//   } catch (error) {
//     console.error("Error permanently deleting menu item:", error);
//     res.status(500).json({
//       message: "Failed to permanently delete menu item",
//       error: error.message
//     });
//   }
// };