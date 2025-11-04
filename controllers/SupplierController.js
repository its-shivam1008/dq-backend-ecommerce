const Supplier = require("../model/Supplier");

// ================================
// ✅ Get all suppliers
// ================================
exports.getSuppliers = async (req, res) => {
  try {
    const restaurantId = req.userId; //I have changed this - abhishek
    // const restaurantId = req.query.restaurantId || req.userId;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    const suppliers = await Supplier.find({ restaurantId })

    res.json({ success: true, data: suppliers });
  } catch (err) {
    console.error("❌ Error fetching suppliers:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// ✅ Create new supplier
// ================================
exports.createSupplier = async (req, res) => {
  try {
    const { supplierName, email, phoneNumber, rawItems, restaurantId, inventoryId } = req.body; // <--- Changed from rawItem

    // ... validation

    // ✅ Normalize rawItems: ensure it's always an array
    let itemsArray = [];
    if (Array.isArray(rawItems)) { // <--- Changed from rawItem
      itemsArray = rawItems;
    } else if (rawItems) { // <--- Changed from rawItem
      itemsArray = [rawItems];
    }

    const supplier = new Supplier({
      supplierName,
      email,
      phoneNumber,
      rawItems: itemsArray, // ✅ Save as array
      // restaurantId,   before change by abhishek
      restaurantId : req.userId, //I have changed this - abhishek
      inventoryId,
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (err) {
    console.error("❌ Error creating supplier:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ================================
// ✅ Update supplier
// ================================
exports.updateSupplier = async (req, res) => {
  try {
    const { rawItems } = req.body; // <--- Changed from rawItem

    // ✅ Normalize rawItems if sent as a single string
    if (rawItems && !Array.isArray(rawItems)) { // <--- Changed from rawItem
      req.body.rawItems = [rawItems]; // <--- Changed from rawItem
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({ success: true, data: supplier });
  } catch (err) {
    console.error("❌ Error updating supplier:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// ✅ Delete supplier
// ================================
exports.deleteSupplier = async (req, res) => {
  try {
    // ⚠️ FIX: You were deleting using restaurantId instead of supplier ID
    const supplier = await Supplier.findByIdAndDelete(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({ success: true, message: "Supplier deleted successfully" });
  } catch (err) {
    console.error("❌ Delete supplier error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// const Supplier = require("../model/Supplier");

// // Get all suppliers
// exports.getSuppliers = async (req, res) => {
//   try {
//     // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
//     const restaurantId = req.userId;

//     if (!restaurantId) {
//       return res.status(400).json({ message: "Restaurant ID is required" });
//     }

//     const suppliers = await Supplier.find({ restaurantId })
//       .populate("inventories");

//     res.json({ success: true, data: suppliers });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Create new supplier
// exports.createSupplier = async (req, res) => {
//   try {
//     const { supplierName, email, phoneNumber, rawItem, restaurantId, inventoryId } = req.body;

//     // Validation
//     if (!supplierName || !phoneNumber) {
//       return res.status(400).json({
//         message: "Supplier name and phone number are required",
//       });
//     }
//     // if (email) {
//     //   const existingSupplier = await Supplier.findOne({ email, restaurantId });
//     //   if (existingSupplier) {
//     //     return res
//     //       .status(400)
//     //       .json({ message: "Supplier already exists with this email" });
//     //   }
//     // }
//     const supplier = new Supplier({
//       supplierName,
//       email,
//       phoneNumber,
//       rawItem,
//       restaurantId,
//       inventoryId
//     });

//     await supplier.save();

//     res.status(201).json({
//       success: true,
//       message: "Supplier created successfully",
//       data: supplier,
//     });
//   } catch (err) {
//     console.error("❌ Error creating supplier:", err);
//     res.status(500).json({ message: err.message || "Server error" });
//   }
// };


// // Update supplier
// exports.updateSupplier = async (req, res) => {
//   try {
//     const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!supplier) return res.status(404).json({ message: "Supplier not found" });
//     res.json({ success: true, data: supplier });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Delete supplier
// exports.deleteSupplier = async (req, res) => {
//   try {
//     const supplierId = req.params.id;

//     const supplier = await Supplier.findByIdAndDelete(supplierId);

//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }

//     res.json({ success: true, message: "Supplier deleted successfully" });
//   } catch (err) {
//     console.error("Delete supplier error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };