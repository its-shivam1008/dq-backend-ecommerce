const Inventory = require("../model/Inventory");
const Supplier = require('../model/Supplier');
// ➤ Add new inventory item
exports.addInventory = async (req, res) => {
  try {
    const { itemName, quantity, unit, restaurantId } = req.body;

    // Validate required fields
    if (!itemName || !quantity || !unit || !restaurantId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find supplier by restaurantId
    const supplier = await Supplier.findOne({ restaurantId });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found for this restaurant" });
    }

    // Create new inventory item
    const newInventory = new Inventory({
      itemName,
      quantity,
      unit,
      restaurantId,
      supplierId: supplier._id,              // ✅ required for relationship
      supplierName:supplier.supplierName,   // ✅ stored for quick reference
    });

    await newInventory.save();

    res.status(201).json({
      success: true,
      message: "Inventory added successfully",
      inventory: newInventory,
    });
  } catch (error) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ message: "Error adding inventory", error: error.message });
  }
};




// ➤ Get all inventory items 
exports.getInventory = async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || process.env.RESTAURENT_ID;
    const filter = restaurantId ? { restaurantId } : {};
    const items = await Inventory.find(filter);
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ message: "Error fetching inventory", error: err.message });
  }
};


// ➤ Get single inventory item
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ message: "Error fetching item", error: err.message });
  }
};

// ➤ Update inventory item
exports.updateInventory = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json({ message: "Item updated successfully", item });
  } catch (err) {
    res.status(500).json({ message: "Error updating item", error: err.message });
  }
};

// ➤ Delete inventory item
exports.deleteInventory = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.isDeleted = true;
    item.deletedTime = new Date();

    await item.save();

    res.status(200).json({ message: "Item deleted successfully", item });
  } catch (err) {
    res.status(500).json({ message: "Error deleting item", error: err.message });
  }
};


// ➤ Update stock quantity
exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.quantity = quantity;
    await item.save();

    res.status(200).json({ message: "Stock updated successfully", item });
  } catch (err) {
    res.status(500).json({ message: "Error updating stock", error: err.message });
  }
};
