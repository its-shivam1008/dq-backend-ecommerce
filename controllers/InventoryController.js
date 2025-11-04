const Inventory = require("../model/Inventory");
const Supplier = require("../model/Supplier");

// Utility function removed - no auto-fix needed

// Bulk fix function removed - no auto-fix needed

// ==================== ADD/PURCHASE INVENTORY ====================
exports.addInventory = async (req, res) => {
  try {
    const { itemName, unit, restaurantId, supplierId, quantity, pricePerUnit } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!itemName) missingFields.push("itemName");
    if (!unit) missingFields.push("unit");
    if (!restaurantId) missingFields.push("restaurantId");
    if (!supplierId) missingFields.push("supplierId");
    if (!quantity) missingFields.push("quantity");
    if (!pricePerUnit) missingFields.push("pricePerUnit");

    if (missingFields.length > 0) {
      console.error("Missing fields:", missingFields.join(", "));
      return res.status(400).json({ 
        message: "All fields are required", 
        missingFields 
      });
    }

    // Find supplier by supplierId
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Check if inventory item already exists
    let inventory = await Inventory.findOne({
      itemName: itemName.trim().toLowerCase(),
      restaurantId,
      isDeleted: { $ne: true }
    });

    if (inventory) {
      console.log('🔄 Item exists, adding stock from supplier...');
      console.log('🔄 Current inventory:', {
        itemName: inventory.itemName,
        totalQuantity: inventory.totalQuantity,
        totalRemainingQuantity: inventory.totalRemainingQuantity
      });
      
      // Item exists - add stock from this supplier using the model method
      inventory.addSupplierStock({
        supplierId: supplier._id,
        supplierName: supplier.supplierName,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit)
      });
      
      console.log('🔄 After addSupplierStock:', {
        totalQuantity: inventory.totalQuantity,
        totalRemainingQuantity: inventory.totalRemainingQuantity,
        supplierStocksCount: inventory.supplierStocks.length
      });
      
      await inventory.save();
      
      console.log('✅ Inventory saved successfully');
      
      return res.status(200).json({
        success: true,
        message: "Stock purchased and added from supplier successfully",
        inventory
      });
    } else {
      // Create new inventory item
      const parsedQuantity = Number(quantity);
      const parsedPrice = Number(pricePerUnit);
      const totalAmount = parsedQuantity * parsedPrice;

      inventory = new Inventory({
        itemName: itemName.trim().toLowerCase(),
        unit,
        // restaurantId,   before change by abhishek
        restaurantId : req.userId, //I have changed this - abhishek
        totalQuantity: parsedQuantity,
        totalRemainingQuantity: parsedQuantity,
        totalUsedQuantity: 0,
        totalAmount: totalAmount,
        supplierStocks: [{
          supplierId: supplier._id,
          supplierName: supplier.supplierName,
          purchasedQuantity: parsedQuantity,
          remainingQuantity: parsedQuantity,
          usedQuantity: 0,
          pricePerUnit: parsedPrice,
          totalAmount: totalAmount,
          purchasedAt: new Date(),
          isFullyUsed: false
        }]
      });
      
      await inventory.save();
      
      return res.status(201).json({
        success: true,
        message: "New inventory item created and stock purchased successfully",
        inventory
      });
    }
  } catch (error) {
    console.error("Error adding inventory:", error);
    res.status(500).json({ 
      message: "Error adding inventory", 
      error: error.message 
    });
  }
};

// ==================== GET ALL INVENTORIES ====================
exports.getInventory = async (req, res) => {
  try {
    console.log('=== GET INVENTORY API CALLED ===');
    
    // const restaurantId = req.query.restaurantId || req.userId; I have changed this - abhishek
    const restaurantId = req.userId;

    if (!restaurantId) {
      return res.status(400).json({ message: "Restaurant ID is required" });
    }

    // Fetch inventories and populate supplier details
    const items = await Inventory.find({
      restaurantId,
      isDeleted: { $ne: true }
    })
    .populate({
      path: "supplierStocks.supplierId",
      select: "supplierName email phoneNumber rawItems"
    })
    .sort({ createdAt: -1 }); // Sort by newest first

    console.log(`Found ${items.length} inventory items for restaurant ${restaurantId}`);

    // Round all decimal values to 2 decimal places
    const processedItems = items.map(item => ({
      ...item.toObject(),
      totalRemainingQuantity: parseFloat((item.totalRemainingQuantity || 0).toFixed(2)),
      totalUsedQuantity: parseFloat((item.totalUsedQuantity || 0).toFixed(2)),
      totalQuantity: parseFloat((item.totalQuantity || 0).toFixed(2)),
      totalAmount: parseFloat((item.totalAmount || 0).toFixed(2)),
      stock: {
        ...item.stock,
        totalQuantity: parseFloat((item.stock?.totalQuantity || 0).toFixed(2)),
        quantity: parseFloat((item.stock?.quantity || 0).toFixed(2))
      }
    }));

    res.status(200).json(processedItems);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ 
      message: "Error fetching inventory", 
      error: err.message 
    });
  }
};

// ==================== GET SINGLE INVENTORY BY ID ====================
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate({
      path: "supplierStocks.supplierId",
      select: "supplierName email phoneNumber rawItems"
    });
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Round all decimal values to 2 decimal places
    const processedItem = {
      ...item.toObject(),
      totalRemainingQuantity: parseFloat((item.totalRemainingQuantity || 0).toFixed(2)),
      totalUsedQuantity: parseFloat((item.totalUsedQuantity || 0).toFixed(2)),
      totalQuantity: parseFloat((item.totalQuantity || 0).toFixed(2)),
      totalAmount: parseFloat((item.totalAmount || 0).toFixed(2)),
      stock: {
        ...item.stock,
        totalQuantity: parseFloat((item.stock?.totalQuantity || 0).toFixed(2)),
        quantity: parseFloat((item.stock?.quantity || 0).toFixed(2))
      }
    };
    
    res.status(200).json(processedItem);
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).json({ 
      message: "Error fetching item", 
      error: err.message 
    });
  }
};

// ==================== UPDATE INVENTORY ====================
exports.updateInventory = async (req, res) => {
  try {
    const { unit } = req.body;
    
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Only allow updating unit
    if (unit) {
      item.unit = unit;
    }
    
    await item.save();

    res.status(200).json({ 
      message: "Item updated successfully", 
      inventory: item 
    });
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ 
      message: "Error updating item", 
      error: err.message 
    });
  }
};

// ==================== DELETE INVENTORY (SOFT DELETE) ====================
exports.deleteInventory = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    item.isDeleted = true;
    item.deletedTime = new Date();
    await item.save();

    res.status(200).json({ 
      message: "Item deleted successfully", 
      item 
    });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ 
      message: "Error deleting item", 
      error: err.message 
    });
  }
};

// ==================== DEDUCT STOCK WITH UNIT CONVERSION ====================
exports.deductStock = async (req, res) => {
  try {
    const { itemId, quantityToDeduct, unit } = req.body; // ✅ ADD unit parameter

    console.log('=== DEDUCT STOCK (FIFO) ===');
    console.log('Item ID:', itemId);
    console.log('Quantity to deduct:', quantityToDeduct);
    console.log('Unit:', unit);
    console.log('🔍 DEBUG - Request body:', req.body);
    console.log('🔍 DEBUG - Unit parameter:', unit, 'Type:', typeof unit);

    // Validate inputs
    if (!itemId || !quantityToDeduct) {
      return res.status(400).json({ 
        message: "Item ID and quantity are required" 
      });
    }

    if (quantityToDeduct <= 0) {
      return res.status(400).json({ 
        message: "Quantity must be greater than 0" 
      });
    }

    // Find the inventory item
    const item = await Inventory.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // 🔍 DEBUG: Check item data
    console.log('🔍 DEBUG - Item found:', {
      id: item._id,
      itemName: item.itemName,
      unit: item.unit,
      hasUnit: !!item.unit,
      unitType: typeof item.unit
    });

    // Check if unit exists - NO AUTO FIX
    if (!item.unit) {
      return res.status(400).json({ 
        message: `Inventory item "${item.itemName}" does not have a unit defined. Please update the item with a valid unit.` 
      });
    }

    // ✅ CONVERT UNIT BEFORE DEDUCTION
    const inventoryBaseUnit = item.unit.toLowerCase();
    
    // If unit is not provided, try to get it from menu's stockItems
    let deductionUnit = unit;
    if (!deductionUnit) {
      console.log('⚠️ Unit not provided in request, trying to fetch from menu...');
      
      try {
        const Menu = require("../model/Menu");
        
        // Find menu item that uses this inventory item
        const menuItem = await Menu.findOne({
          'stockItems.stockId': itemId,
          isDeleted: { $ne: true }
        });
        
        if (menuItem && menuItem.stockItems) {
          const stockItem = menuItem.stockItems.find(s => s.stockId.toString() === itemId.toString());
          if (stockItem && stockItem.unit) {
            deductionUnit = stockItem.unit;
            console.log(`✅ Found unit from menu: ${deductionUnit}`);
          } else {
            console.log('⚠️ Unit not found in menu, using inventory unit as fallback');
            deductionUnit = inventoryBaseUnit;
          }
        } else {
          console.log('⚠️ Menu item not found, using inventory unit as fallback');
          deductionUnit = inventoryBaseUnit;
        }
      } catch (error) {
        console.error('Error fetching unit from menu:', error);
        console.log('⚠️ Using inventory unit as fallback');
        deductionUnit = inventoryBaseUnit;
      }
    }
    
    deductionUnit = deductionUnit.toLowerCase();
    
    console.log(`🔄 Unit Conversion: ${quantityToDeduct} ${deductionUnit} → ${inventoryBaseUnit}`);
    
    let convertedQuantity = quantityToDeduct;
    
    // Weight conversion
    if (['kg', 'gm', 'mg'].includes(inventoryBaseUnit) && ['kg', 'gm', 'mg'].includes(deductionUnit)) {
      const toBaseUnit = {
        'kg': { 'kg': 1, 'gm': 0.001, 'mg': 0.000001 },
        'gm': { 'kg': 1000, 'gm': 1, 'mg': 0.001 },
        'mg': { 'kg': 1000000, 'gm': 1000, 'mg': 1 }
      };
      convertedQuantity = quantityToDeduct * toBaseUnit[inventoryBaseUnit][deductionUnit];
    }
    
    // Volume conversion
    if (['ltr', 'litre', 'ml'].includes(inventoryBaseUnit) && ['ltr', 'litre', 'ml'].includes(deductionUnit)) {
      const toBaseUnit = {
        'ltr': { 'ltr': 1, 'litre': 1, 'ml': 0.001 },
        'litre': { 'ltr': 1, 'litre': 1, 'ml': 0.001 },
        'ml': { 'ltr': 1000, 'litre': 1000, 'ml': 1 }
      };
      const normalizedBase = inventoryBaseUnit === 'litre' ? 'ltr' : inventoryBaseUnit;
      const normalizedDeduct = deductionUnit === 'litre' ? 'ltr' : deductionUnit;
      convertedQuantity = quantityToDeduct * toBaseUnit[normalizedBase][normalizedDeduct];
    }

    console.log(`Converting ${quantityToDeduct} ${deductionUnit} to ${convertedQuantity} ${inventoryBaseUnit}`);

    // Check if sufficient stock is available
    if (item.totalRemainingQuantity < convertedQuantity) {
      return res.status(400).json({ 
        message: `Insufficient stock. Available: ${item.totalRemainingQuantity} ${item.unit}, Requested: ${quantityToDeduct} ${deductionUnit} (${convertedQuantity} ${item.unit})` 
      });
    }

    // Use the model's FIFO deduction method with converted quantity
    const success = item.deductStock(convertedQuantity);
    
    if (!success) {
      return res.status(400).json({ 
        message: "Failed to deduct stock using FIFO method" 
      });
    }

    await item.save();

    console.log('Stock deducted successfully using FIFO');
    console.log('Remaining stock:', item.totalRemainingQuantity);
    console.log('🔍 DEBUG - Final deductionUnit:', deductionUnit);

    res.status(200).json({ 
      message: "Stock deducted successfully using FIFO method", 
      deducted: `${quantityToDeduct} ${deductionUnit || 'units'} (${convertedQuantity} ${item.unit})`,
      item 
    });
  } catch (err) {
    console.error("❌ Error deducting stock:", err);
    console.error("❌ Error stack:", err.stack);
    console.error("❌ Error details:", {
      name: err.name,
      message: err.message,
      code: err.code
    });
    res.status(500).json({ 
      message: "Error deducting stock", 
      error: err.message,
      details: err.stack
    });
  }
};
// ==================== GET SUPPLIER STOCK DETAILS ====================
exports.getSupplierStockDetails = async (req, res) => {
  try {
    console.log('=== GET SUPPLIER STOCK DETAILS ===');
    console.log('Item ID:', req.params.id);

    const item = await Inventory.findById(req.params.id).populate({
      path: "supplierStocks.supplierId",
      select: "supplierName email phoneNumber"
    });

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Calculate usage percentage and format supplier details
    const supplierDetails = item.supplierStocks.map((stock, index) => {
      const usagePercentage = stock.purchasedQuantity > 0 
        ? ((stock.usedQuantity / stock.purchasedQuantity) * 100).toFixed(2)
        : 0;

      return {
        index: index + 1,
        supplierId: stock.supplierId?._id || stock.supplierId,
        supplierName: stock.supplierName,
        supplierEmail: stock.supplierId?.email,
        supplierPhone: stock.supplierId?.phoneNumber,
        purchasedQuantity: parseFloat((stock.purchasedQuantity || 0).toFixed(2)),
        remainingQuantity: parseFloat((stock.remainingQuantity || 0).toFixed(2)),
        usedQuantity: parseFloat((stock.usedQuantity || 0).toFixed(2)), // ✅ FIX APPLIED HERE
        pricePerUnit: parseFloat((stock.pricePerUnit || 0).toFixed(2)),
        totalAmount: parseFloat((stock.totalAmount || 0).toFixed(2)),
        purchasedAt: stock.purchasedAt,
        isFullyUsed: stock.isFullyUsed,
        usagePercentage: parseFloat(usagePercentage)
      };
    });

    // Prepare response with summary and details
    const response = {
      itemName: item.itemName,
      unit: item.unit,
      totalQuantity: parseFloat((item.totalQuantity || 0).toFixed(2)),
      totalRemainingQuantity: parseFloat((item.totalRemainingQuantity || 0).toFixed(2)),
      totalUsedQuantity: parseFloat((item.totalUsedQuantity || 0).toFixed(2)), // ✅ FIX APPLIED HERE
      totalAmount: parseFloat((item.totalAmount || 0).toFixed(2)),
      supplierStocks: supplierDetails,
      nextSupplierToUse: supplierDetails.find(s => !s.isFullyUsed)?.index || null
    };

    console.log('Supplier details fetched successfully');
    console.log('Total suppliers:', supplierDetails.length);
    console.log('Next supplier to use (FIFO):', response.nextSupplierToUse);

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching supplier stock details:", err);
    res.status(500).json({ 
      message: "Error fetching supplier details", 
      error: err.message 
    });
  }
};

// ==================== BATCH DEDUCT STOCK (FOR ORDERS WITH MULTIPLE ITEMS) ====================
// ==================== BATCH DEDUCT STOCK WITH UNIT CONVERSION ====================
exports.batchDeductStock = async (req, res) => {
  try {
    const { items } = req.body;
    // items format: [{ itemId, quantityToDeduct, unit, itemName }, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        message: "Items array is required" 
      });
    }

    const results = [];
    const errors = [];

    for (const saleItem of items) {
      try {
        const { itemId, quantityToDeduct, unit } = saleItem;

        // Find inventory item
        const item = await Inventory.findById(itemId);
        if (!item) {
          errors.push({
            itemId,
            itemName: saleItem.itemName,
            error: "Item not found"
          });
          continue;
        }

        // ✅ CONVERT UNIT BEFORE DEDUCTION
        const inventoryBaseUnit = item.unit.toLowerCase();
        const deductionUnit = (unit || inventoryBaseUnit).toLowerCase();
        
        let convertedQuantity = quantityToDeduct;
        
        // Weight conversion
        if (['kg', 'gm', 'mg'].includes(inventoryBaseUnit) && ['kg', 'gm', 'mg'].includes(deductionUnit)) {
          const toBaseUnit = {
            'kg': { 'kg': 1, 'gm': 0.001, 'mg': 0.000001 },
            'gm': { 'kg': 1000, 'gm': 1, 'mg': 0.001 },
            'mg': { 'kg': 1000000, 'gm': 1000, 'mg': 1 }
          };
          convertedQuantity = quantityToDeduct * toBaseUnit[inventoryBaseUnit][deductionUnit];
        }
        
        // Volume conversion
        if (['ltr', 'litre', 'ml'].includes(inventoryBaseUnit) && ['ltr', 'litre', 'ml'].includes(deductionUnit)) {
          const toBaseUnit = {
            'ltr': { 'ltr': 1, 'litre': 1, 'ml': 0.001 },
            'litre': { 'ltr': 1, 'litre': 1, 'ml': 0.001 },
            'ml': { 'ltr': 1000, 'litre': 1000, 'ml': 1 }
          };
          const normalizedBase = inventoryBaseUnit === 'litre' ? 'ltr' : inventoryBaseUnit;
          const normalizedDeduct = deductionUnit === 'litre' ? 'ltr' : deductionUnit;
          convertedQuantity = quantityToDeduct * toBaseUnit[normalizedBase][normalizedDeduct];
        }

        console.log(`Converting ${quantityToDeduct} ${deductionUnit} to ${convertedQuantity} ${inventoryBaseUnit}`);

        if (item.totalRemainingQuantity < convertedQuantity) {
          errors.push({
            itemId,
            itemName: item.itemName,
            error: `Insufficient stock. Available: ${item.totalRemainingQuantity} ${inventoryBaseUnit}, Requested: ${quantityToDeduct} ${deductionUnit} (${convertedQuantity} ${inventoryBaseUnit})`
          });
          continue;
        }

        // Deduct using FIFO with converted quantity
        const success = item.deductStock(convertedQuantity);
        if (!success) {
          errors.push({
            itemId,
            itemName: item.itemName,
            error: "Failed to deduct stock"
          });
          continue;
        }

        await item.save();

        results.push({
          itemId,
          itemName: item.itemName,
          deductedQuantity: `${quantityToDeduct} ${deductionUnit}`,
          convertedQuantity: `${convertedQuantity} ${inventoryBaseUnit}`,
          remainingQuantity: item.totalRemainingQuantity
        });
      } catch (error) {
        errors.push({
          itemId: saleItem.itemId,
          itemName: saleItem.itemName,
          error: error.message
        });
      }

    }

    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json({
        message: "Failed to process any items",
        errors
      });
    }

    res.status(200).json({
      message: errors.length > 0 
        ? "Some items processed with errors" 
        : "All items processed successfully using FIFO method",
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error("Error in batch deduct stock:", err);
    res.status(500).json({ 
      message: "Error processing batch deduction", 
      error: err.message 
    });
  }
};


// const Inventory = require("../model/Inventory");
// const Supplier = require("../model/Supplier");

// // ==================== ADD/PURCHASE INVENTORY ====================
// exports.addInventory = async (req, res) => {
//   try {
//     const { itemName, unit, restaurantId, supplierId, quantity, pricePerUnit } = req.body;

//     // Validate required fields
//     const missingFields = [];
//     if (!itemName) missingFields.push("itemName");
//     if (!unit) missingFields.push("unit");
//     if (!restaurantId) missingFields.push("restaurantId");
//     if (!supplierId) missingFields.push("supplierId");
//     if (!quantity) missingFields.push("quantity");
//     if (!pricePerUnit) missingFields.push("pricePerUnit");

//     if (missingFields.length > 0) {
//       console.error("Missing fields:", missingFields.join(", "));
//       return res.status(400).json({ 
//         message: "All fields are required", 
//         missingFields 
//       });
//     }

//     // Find supplier by supplierId
//     const supplier = await Supplier.findById(supplierId);
//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }

//     // Check if inventory item already exists
//     let inventory = await Inventory.findOne({
//       itemName: itemName.trim().toLowerCase(),
//       restaurantId,
//       isDeleted: { $ne: true }
//     });

//     if (inventory) {
//       // Item exists - add stock from this supplier using the model method
//       inventory.addSupplierStock({
//         supplierId: supplier._id,
//         supplierName: supplier.supplierName,
//         quantity: Number(quantity),
//         pricePerUnit: Number(pricePerUnit)
//       });
      
//       await inventory.save();
      
//       return res.status(200).json({
//         success: true,
//         message: "Stock purchased and added from supplier successfully",
//         inventory
//       });
//     } else {
//       // Create new inventory item
//       const parsedQuantity = Number(quantity);
//       const parsedPrice = Number(pricePerUnit);
//       const totalAmount = parsedQuantity * parsedPrice;

//       inventory = new Inventory({
//         itemName: itemName.trim().toLowerCase(),
//         unit,
//         restaurantId,
//         totalQuantity: parsedQuantity,
//         totalRemainingQuantity: parsedQuantity,
//         totalUsedQuantity: 0,
//         totalAmount: totalAmount,
//         supplierStocks: [{
//           supplierId: supplier._id,
//           supplierName: supplier.supplierName,
//           purchasedQuantity: parsedQuantity,
//           remainingQuantity: parsedQuantity,
//           usedQuantity: 0,
//           pricePerUnit: parsedPrice,
//           totalAmount: totalAmount,
//           purchasedAt: new Date(),
//           isFullyUsed: false
//         }]
//       });
      
//       await inventory.save();
      
//       return res.status(201).json({
//         success: true,
//         message: "New inventory item created and stock purchased successfully",
//         inventory
//       });
//     }
//   } catch (error) {
//     console.error("Error adding inventory:", error);
//     res.status(500).json({ 
//       message: "Error adding inventory", 
//       error: error.message 
//     });
//   }
// };

// // ==================== GET ALL INVENTORIES ====================
// exports.getInventory = async (req, res) => {
//   try {
//     console.log('=== GET INVENTORY API CALLED ===');
    
//     const restaurantId = req.query.restaurantId || req.userId;

//     if (!restaurantId) {
//       return res.status(400).json({ message: "Restaurant ID is required" });
//     }

//     // Fetch inventories and populate supplier details
//     const items = await Inventory.find({
//       restaurantId,
//       isDeleted: { $ne: true }
//     })
//     .populate({
//       path: "supplierStocks.supplierId",
//       select: "supplierName email phoneNumber rawItems"
//     })
//     .sort({ createdAt: -1 }); // Sort by newest first

//     console.log(`Found ${items.length} inventory items for restaurant ${restaurantId}`);

//     res.status(200).json(items);
//   } catch (err) {
//     console.error("Error fetching inventory:", err);
//     res.status(500).json({ 
//       message: "Error fetching inventory", 
//       error: err.message 
//     });
//   }
// };

// // ==================== GET SINGLE INVENTORY BY ID ====================
// exports.getInventoryById = async (req, res) => {
//   try {
//     const item = await Inventory.findById(req.params.id).populate({
//       path: "supplierStocks.supplierId",
//       select: "supplierName email phoneNumber rawItems"
//     });
    
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }
    
//     res.status(200).json(item);
//   } catch (err) {
//     console.error("Error fetching item:", err);
//     res.status(500).json({ 
//       message: "Error fetching item", 
//       error: err.message 
//     });
//   }
// };

// // ==================== UPDATE INVENTORY ====================
// exports.updateInventory = async (req, res) => {
//   try {
//     const { unit } = req.body;
    
//     const item = await Inventory.findById(req.params.id);
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     // Only allow updating unit
//     if (unit) {
//       item.unit = unit;
//     }
    
//     await item.save();

//     res.status(200).json({ 
//       message: "Item updated successfully", 
//       inventory: item 
//     });
//   } catch (err) {
//     console.error("Error updating item:", err);
//     res.status(500).json({ 
//       message: "Error updating item", 
//       error: err.message 
//     });
//   }
// };

// // ==================== DELETE INVENTORY (SOFT DELETE) ====================
// exports.deleteInventory = async (req, res) => {
//   try {
//     const item = await Inventory.findById(req.params.id);
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     item.isDeleted = true;
//     item.deletedTime = new Date();
//     await item.save();

//     res.status(200).json({ 
//       message: "Item deleted successfully", 
//       item 
//     });
//   } catch (err) {
//     console.error("Error deleting item:", err);
//     res.status(500).json({ 
//       message: "Error deleting item", 
//       error: err.message 
//     });
//   }
// };

// // ==================== DEDUCT STOCK (FIFO METHOD) ====================
// exports.deductStock = async (req, res) => {
//   try {
//     const { itemId, quantityToDeduct } = req.body;

//     console.log('=== DEDUCT STOCK (FIFO) ===');
//     console.log('Item ID:', itemId);
//     console.log('Quantity to deduct:', quantityToDeduct);

//     // Validate inputs
//     if (!itemId || !quantityToDeduct) {
//       return res.status(400).json({ 
//         message: "Item ID and quantity are required" 
//       });
//     }

//     if (quantityToDeduct <= 0) {
//       return res.status(400).json({ 
//         message: "Quantity must be greater than 0" 
//       });
//     }

//     // Find the inventory item
//     const item = await Inventory.findById(itemId);
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     // Check if sufficient stock is available
//     if (item.totalRemainingQuantity < quantityToDeduct) {
//       return res.status(400).json({ 
//         message: `Insufficient stock. Available: ${item.totalRemainingQuantity} ${item.unit}, Requested: ${quantityToDeduct} ${item.unit}` 
//       });
//     }

//     // Use the model's FIFO deduction method
//     const success = item.deductStock(quantityToDeduct);
    
//     if (!success) {
//       return res.status(400).json({ 
//         message: "Failed to deduct stock using FIFO method" 
//       });
//     }

//     await item.save();

//     console.log('Stock deducted successfully using FIFO');
//     console.log('Remaining stock:', item.totalRemainingQuantity);

//     res.status(200).json({ 
//       message: "Stock deducted successfully using FIFO method", 
//       item 
//     });
//   } catch (err) {
//     console.error("Error deducting stock:", err);
//     res.status(500).json({ 
//       message: "Error deducting stock", 
//       error: err.message 
//     });
//   }
// };

// // ==================== GET SUPPLIER STOCK DETAILS ====================
// exports.getSupplierStockDetails = async (req, res) => {
//   try {
//     console.log('=== GET SUPPLIER STOCK DETAILS ===');
//     console.log('Item ID:', req.params.id);

//     const item = await Inventory.findById(req.params.id).populate({
//       path: "supplierStocks.supplierId",
//       select: "supplierName email phoneNumber"
//     });

//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     // Calculate usage percentage and format supplier details
//     const supplierDetails = item.supplierStocks.map((stock, index) => {
//       const usagePercentage = stock.purchasedQuantity > 0 
//         ? ((stock.usedQuantity / stock.purchasedQuantity) * 100).toFixed(2)
//         : 0;

//       return {
//         index: index + 1,
//         supplierId: stock.supplierId?._id || stock.supplierId,
//         supplierName: stock.supplierName,
//         supplierEmail: stock.supplierId?.email,
//         supplierPhone: stock.supplierId?.phoneNumber,
//         purchasedQuantity: stock.purchasedQuantity,
//         remainingQuantity: stock.remainingQuantity,
//         usedQuantity: stock.usedQuantity,
//         pricePerUnit: stock.pricePerUnit,
//         totalAmount: stock.totalAmount,
//         purchasedAt: stock.purchasedAt,
//         isFullyUsed: stock.isFullyUsed,
//         usagePercentage: parseFloat(usagePercentage)
//       };
//     });

//     // Prepare response with summary and details
//     const response = {
//       itemName: item.itemName,
//       unit: item.unit,
//       totalQuantity: item.totalQuantity,
//       totalRemainingQuantity: item.totalRemainingQuantity,
//       totalUsedQuantity: item.totalUsedQuantity,
//       totalAmount: item.totalAmount,
//       supplierStocks: supplierDetails,
//       nextSupplierToUse: supplierDetails.find(s => !s.isFullyUsed)?.index || null
//     };

//     console.log('Supplier details fetched successfully');
//     console.log('Total suppliers:', supplierDetails.length);
//     console.log('Next supplier to use (FIFO):', response.nextSupplierToUse);

//     res.status(200).json(response);
//   } catch (err) {
//     console.error("Error fetching supplier stock details:", err);
//     res.status(500).json({ 
//       message: "Error fetching supplier details", 
//       error: err.message 
//     });
//   }
// };

// // ==================== BATCH DEDUCT STOCK (FOR ORDERS WITH MULTIPLE ITEMS) ====================
// exports.batchDeductStock = async (req, res) => {
//   try {
//     const { items } = req.body;
//     // items format: [{ itemId, quantityToDeduct, itemName }, ...]

//     if (!items || !Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ 
//         message: "Items array is required" 
//       });
//     }

//     const results = [];
//     const errors = [];

//     for (const saleItem of items) {
//       try {
//         const { itemId, quantityToDeduct } = saleItem;

//         // Find and deduct stock
//         const item = await Inventory.findById(itemId);
//         if (!item) {
//           errors.push({
//             itemId,
//             itemName: saleItem.itemName,
//             error: "Item not found"
//           });
//           continue;
//         }

//         if (item.totalRemainingQuantity < quantityToDeduct) {
//           errors.push({
//             itemId,
//             itemName: item.itemName,
//             error: `Insufficient stock. Available: ${item.totalRemainingQuantity}, Requested: ${quantityToDeduct}`
//           });
//           continue;
//         }

//         // Deduct using FIFO
//         const success = item.deductStock(quantityToDeduct);
//         if (!success) {
//           errors.push({
//             itemId,
//             itemName: item.itemName,
//             error: "Failed to deduct stock"
//           });
//           continue;
//         }

//         await item.save();

//         results.push({
//           itemId,
//           itemName: item.itemName,
//           deductedQuantity: quantityToDeduct,
//           remainingQuantity: item.totalRemainingQuantity
//         });
//       } catch (error) {
//         errors.push({
//           itemId: saleItem.itemId,
//           itemName: saleItem.itemName,
//           error: error.message
//         });
//       }
//     }

//     if (errors.length > 0 && results.length === 0) {
//       return res.status(400).json({
//         message: "Failed to process any items",
//         errors
//       });
//     }

//     res.status(200).json({
//       message: errors.length > 0 
//         ? "Some items processed with errors" 
//         : "All items processed successfully using FIFO method",
//       successCount: results.length,
//       errorCount: errors.length,
//       results,
//       errors: errors.length > 0 ? errors : undefined
//     });
//   } catch (err) {
//     console.error("Error in batch deduct stock:", err);
//     res.status(500).json({ 
//       message: "Error processing batch deduction", 
//       error: err.message 
//     });
//   }
// };

// const Inventory = require("../model/Inventory");
// const Supplier = require("../model/Supplier");
// const { roundToDecimals, safeAdd, safeMultiply } = require("../utils/numberUtils");

// // ➤ Add new inventory item
// exports.addInventory = async (req, res) => {
//   try {
//     const { itemName, unit, restaurantId, supplierId, stock } = req.body;
//     const missingFields = [];

//     if (!itemName) missingFields.push("itemName");
//     if (!unit) missingFields.push("unit");
//     if (!restaurantId) missingFields.push("restaurantId");
//     if (!supplierId) missingFields.push("supplierId");

//     // ✅ FIX: Check for the nested stock object and its properties
//     if (!stock || !stock.quantity) missingFields.push("quantity");
//     if (!stock || !stock.amount) missingFields.push("amount");

//     if (missingFields.length > 0) {
//       console.error("Missing fields:", missingFields.join(", "));
//       return res.status(400).json({ message: "All fields are required", missingFields });
//     }

//     // Find supplier by supplierId
//     const supplier = await Supplier.findById(supplierId);
//     if (!supplier) {
//       return res.status(404).json({ message: "Supplier not found" });
//     }

//     // ✅ FIXED: Check if inventory item already exists
//     let existingInventory = await Inventory.findOne({
//       itemName: itemName.trim().toLowerCase(),
//       restaurantId,
//       isDeleted: { $ne: true }
//     });

//     if (existingInventory) {
//       // Add new supplier to existing inventory item
//       const newSupplier = {
//         supplierName: supplier.supplierName,
//         supplierId: supplier._id,
//         quantity: Number(stock.quantity),
//         amount: Number(stock.amount),
//         total: Number(stock.quantity) * Number(stock.amount),
//         purchasedAt: new Date(),
//       };

//       existingInventory.suppliers.push(newSupplier);

//       // Update total stock with proper rounding using utility functions
//       existingInventory.stock.quantity = safeAdd(existingInventory.stock.quantity, Number(stock.quantity));
//       existingInventory.stock.amount = safeAdd(existingInventory.stock.amount, Number(stock.amount));
//       existingInventory.stock.total = safeMultiply(existingInventory.stock.quantity, existingInventory.stock.amount);

//       // ✅ Calculate totalQuantity from all suppliers with proper rounding
//       existingInventory.stock.totalQuantity = roundToDecimals(existingInventory.suppliers.reduce((total, supplier) => {
//         return safeAdd(total, supplier.quantity || 0);
//       }, 0));

//       await existingInventory.save();

//       res.status(200).json({
//         success: true,
//         message: "Inventory updated successfully - new supplier added",
//         inventory: existingInventory,
//       });
//     } else {
//       // Create new inventory item with proper rounding using utility functions
//       const quantity = roundToDecimals(Number(stock.quantity));
//       const amount = roundToDecimals(Number(stock.amount));
//       const total = safeMultiply(quantity, amount);

//       const newInventory = new Inventory({
//         itemName: itemName.trim().toLowerCase(),
//         stock: {
//           quantity: quantity,
//           amount: amount,
//           total: total,
//           totalQuantity: quantity, // ✅ Set totalQuantity for new item
//           purchasedAt: new Date(),
//         },
//         suppliers: [{
//           supplierName: supplier.supplierName,
//           supplierId: supplier._id,
//           quantity: quantity,
//           amount: amount,
//           total: total,
//           purchasedAt: new Date(),
//         }],
//         unit,
//         restaurantId,
//       });

//       await newInventory.save();

//       res.status(201).json({
//         success: true,
//         message: "Inventory added successfully",
//         inventory: newInventory,
//       });
//     }
//   } catch (error) {
//     console.log("error is here", error)
//     console.error("Error adding inventory:", error);
//     res.status(500).json({ message: "Error adding inventory", error: error.message });
//   }
// };

// // ➤ Get all inventory items with unique items and summed quantities
// exports.getInventory = async (req, res) => {
//   try {
//     console.log('=== BACKEND API CALLED ===');

//     // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
//     const restaurantId = req.userId;

//     if (!restaurantId) {
//       return res.status(400).json({ message: "Restaurant ID is required" });
//     }

//     // ✅ Filter by restaurantId + exclude deleted
//     const items = await Inventory.find({
//       restaurantId,
//       isDeleted: { $ne: true },
//     }).populate({
//       path: "suppliers.supplierId",
//       model: "Supplier",
//       select: "supplierName email phoneNumber rawItem",
//     });

//     console.log('Raw items from database:', items.length);

//     // ✅ Process the inventory data
//     const processedItems = items.map((item) => ({
//       _id: item._id,
//       itemName: item.itemName,
//       unit: item.unit,
//       restaurantId: item.restaurantId,
//       stock: {
//         quantity: roundToDecimals(Number(item.stock?.quantity || 0)),
//         amount: roundToDecimals(Number(item.stock?.amount || 0)),
//         total: roundToDecimals(Number(item.stock?.total || 0)),
//         totalQuantity: roundToDecimals(Number(item.stock?.totalQuantity || 0)),
//         purchasedAt: item.stock?.purchasedAt,
//       },
//       suppliers: item.suppliers || [],
//       isDeleted: item.isDeleted,
//       createdAt: item.createdAt,
//       updatedAt: item.updatedAt,
//     }));

//     console.log('=== SENDING RESPONSE ===');
//     console.log('Processed items count:', processedItems.length);
//     console.log('Sample item:', processedItems[0]);

//     res.status(200).json(processedItems);
//   } catch (err) {
//     console.error('Error in getInventory:', err);
//     res.status(500).json({
//       message: "Error fetching inventory",
//       error: err.message,
//     });
//   }
// };


// // ➤ Get single inventory item
// exports.getInventoryById = async (req, res) => {
//   try {
//     const item = await Inventory.findById(req.params.id);
//     if (!item) return res.status(404).json({ message: "Item not found" });
//     res.status(200).json(item);
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching item", error: err.message });
//   }
// };

// // ➤ Update inventory item
// exports.updateInventory = async (req, res) => {
//   try {
//     // ✅ FIX: The req.body from the thunk is already structured correctly.
//     // No need to manually rebuild the stock object.
//     const item = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });

//     if (!item) return res.status(404).json({ message: "Item not found" });

//     // The response from the thunk expects `response.data.inventory`
//     // Let's keep the response structure consistent
//     res.status(200).json({ message: "Item updated successfully", inventory: item });
//   } catch (err) {
//     console.error("Error updating item:", err);
//     res.status(500).json({ message: "Error updating item", error: err.message });
//   }
// };

// // ➤ Delete inventory item (soft delete)
// exports.deleteInventory = async (req, res) => {
//   try {
//     const item = await Inventory.findById(req.params.id);
//     if (!item) {
//       return res.status(404).json({ message: "Item not found" });
//     }

//     item.isDeleted = true;
//     item.deletedTime = new Date();

//     await item.save();

//     res.status(200).json({ message: "Item deleted successfully", item });
//   } catch (err) {
//     res.status(500).json({ message: "Error deleting item", error: err.message });
//   }
// };

// // ➤ Update stock quantity
// exports.updateStock = async (req, res) => {
//   try {
//     const { quantity } = req.body;
//     const item = await Inventory.findById(req.params.id);
//     if (!item) return res.status(404).json({ message: "Item not found" });

//     // Round quantity to avoid floating point precision issues using utility function
//     const roundedQuantity = roundToDecimals(Number(quantity));
//     item.stock.quantity = roundedQuantity;
//     item.stock.totalQuantity = roundedQuantity; // Update totalQuantity as well

//     await item.save();

//     res.status(200).json({ message: "Stock updated successfully", item });
//   } catch (err) {
//     res.status(500).json({ message: "Error updating stock", error: err.message });
//   }
// };