const Menu = require("../model/Menu");
const Inventory = require("../model/Inventory");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadBufferToCloudinary } = require("../utils/cloudinary");

// ---------------- Multer Config ----------------
// Use memory storage in serverless environments (e.g., Vercel) to avoid filesystem writes
const storage = multer.memoryStorage();
const upload = multer({ storage });
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
    let parsedStockItems = typeof stockItemsData === "string" 
      ? JSON.parse(stockItemsData) 
      : stockItemsData;
    
    if (!Array.isArray(parsedStockItems)) return [];
    
    return parsedStockItems
      .map(item => ({
        stockId: item.stockId?.trim() || "",
        quantity: Number(item.quantity) || 0
      }))
      .filter(item => item.stockId && item.quantity >= 0);
  } catch (error) {
    console.error("Error processing stock items:", error);
    return [];
  }
}
exports.createMenuItem = async (req, res) => {
  try {
    const { 
      itemName, 
      price, 
      categoryId, 
      restaurantId, 
      sub_category, 
      status, 
      menuId,
      description,
      preparationTime
    } = req.body;

    console.log("=== CREATE MENU ITEM DEBUG ===");
    console.log("Request body keys:", Object.keys(req.body));
    console.log("Raw sizes data:", req.body.sizes);
    console.log("Raw stockItems data:", req.body.stockItems);

    // Validation
    if (!itemName?.trim() || !categoryId || !restaurantId) {
      return res.status(400).json({
        message: "itemName, categoryId, and restaurantId are required.",
      });
    }

    if (!menuId?.trim()) {
      return res.status(400).json({
        message: "menuId is required.",
      });
    }

    // Check if menuId already exists
    const existingMenu = await Menu.findOne({ menuId: menuId.trim(), restaurantId });
    if (existingMenu) {
      return res.status(400).json({
        message: "Menu ID already exists for this restaurant.",
      });
    }

    // Process base price
    let numericPrice = null;
    if (price) {
      numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ message: "Price must be a valid non-negative number." });
      }
    }

    // Process sizes
    const processedSizes = processSizes(req.body.sizes);
    console.log("Processed sizes:", processedSizes);

    // Process stock items
    const processedStockItems = processStockItems(req.body.stockItems);
    console.log("Processed stock items:", processedStockItems);

  // Handle image
  let itemImage = null;
  if (req.file && req.file.buffer) {
    try {
      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "act-resto/menu-items",
        resource_type: "image",
      });
      itemImage = uploadResult.secure_url || uploadResult.url || null;
    } catch (uploadErr) {
      console.error("Cloudinary upload failed:", uploadErr);
      // Continue without image rather than failing the whole request
      itemImage = null;
    }
  }

    // Create menu item data
    const menuItemData = {
      menuId: menuId.trim(),
      itemName: itemName.trim(),
      price: numericPrice,
      sizes: processedSizes,
      categoryId,
      restaurantId,
      sub_category: sub_category?.trim() || "",
      status: Number(status) || 1,
      itemImage,
      stockItems: processedStockItems,
      stock: 0,
      description: description?.trim() || "",
      preparationTime: preparationTime ? Number(preparationTime) : 0
    };

    console.log("Final menu item data:", JSON.stringify(menuItemData, null, 2));

    // Create menu item
    const menuItem = await Menu.create(menuItemData);
    await menuItem.populate("categoryId", "categoryName");

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });

  } catch (error) {
    console.error("Failed to create menu item:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        success: false,
        message: "Validation error", 
        errors 
      });
    }

    res.status(500).json({ 
      success: false,
      message: "Failed to create menu item", 
      error: error.message 
    });
  }
};




// Export multer middleware
exports.uploadMiddleware = upload.single("itemImage");

// ---------------- GET ALL MENU ITEMS ----------------
exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    // Build query filter
    let filter = {};
    if (restaurantId) {
      filter.restaurantId = restaurantId;
    }

    const menuItems = await Menu.find(filter)
      .populate("categoryId", "categoryName")
      .sort({ createdAt: -1 });

    res.status(200).json(menuItems);
  } catch (error) {
    console.error("Error fetching menu items:", error);
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


exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, price, categoryId, sub_category, stock } = req.body;

    const updateData = {};
    if (itemName) updateData.itemName = itemName.trim();
    if (price) updateData.price = Number(price);
    if (categoryId) updateData.categoryId = categoryId;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (stock !== undefined) updateData.stock = Number(stock);

    // ✅ Handle sizes update
    if (req.body.sizes) {
      try {
        updateData.sizes = typeof req.body.sizes === "string"
          ? JSON.parse(req.body.sizes)
          : req.body.sizes;
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid sizes format" });
      }
    }

    // ✅ Handle stockItems
    if (req.body.stockItems) {
      try {
        const stockItems = typeof req.body.stockItems === "string"
          ? JSON.parse(req.body.stockItems)
          : req.body.stockItems;

        updateData.stockItems = stockItems.map((item) => ({
          stockId: item.stockId || "",
          quantity: Number(item.quantity) || 0,
        }));
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid stockItems format" });
      }
    }

    // ✅ Handle image upload
    if (req.file) {
      updateData.itemImage = req.file.path.replace(/\\/g, "/");
    }

    const updatedMenu = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("categoryId", "categoryName");

    if (!updatedMenu) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.status(200).json({
      message: "Menu item updated successfully",
      data: updatedMenu,
    });
  } catch (error) {
    console.error("❌ Error updating menu item:", error);
    res.status(500).json({ message: "Failed to update menu item", error: error.message });
  }
};


// ---------------- UPDATE MENU ITEM STATUS ----------------
exports.updateMenuStatus = async (req, res) => {
  try {
    const { id, status } = req.body;

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

    const updatedMenu = await Menu.findByIdAndUpdate(
      id,
      { status: numericStatus },
      { new: true, runValidators: true }
    ).populate("categoryId", "categoryName");

    if (!updatedMenu) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

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

    // Delete associated image file if exists
    if (deletedMenu.itemImage && fs.existsSync(deletedMenu.itemImage)) {
      fs.unlinkSync(deletedMenu.itemImage);
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