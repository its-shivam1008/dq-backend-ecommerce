const WasteMaterial = require("../model/Waste");
const Inventory = require("../model/Inventory"); // ✅ ADD THIS IMPORT
const mongoose = require('mongoose');

// ✅ Create new waste material entry
exports.createWasteMaterial = async (req, res) => {
    try {
        const { itemId, itemName, wasteQuantity, restaurantId, unit, reason, date } = req.body;

        if (!itemName || !wasteQuantity || !restaurantId) {
            return res.status(400).json({
                success: false,
                message: "Item name, waste quantity, and restaurant ID are required.",
            });
        }

        // ✅ Find inventory item by ID (not by name)
        const inventoryItem = await Inventory.findOne({ _id: itemId, restaurantId });

        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                message: `Item "${itemName}" not found in inventory.`,
            });
        }

        // ✅ Get current total quantity (FIXED: Use correct field)
        const currentQuantity = inventoryItem.totalRemainingQuantity ?? 0;
        const inventoryUnit = inventoryItem.unit;
        
        console.log('🔄 Stock validation:', {
            itemName: inventoryItem.itemName,
            totalRemainingQuantity: inventoryItem.totalRemainingQuantity,
            inventoryUnit: inventoryUnit,
            wasteUnit: unit,
            wasteQuantity: wasteQuantity
        });

        if (currentQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `No stock available for "${itemName}".`,
            });
        }

        // ✅ Unit conversion function - Simplified and working
        const convertUnits = (quantity, fromUnit, toUnit) => {
            console.log(`🔄 Converting: ${quantity} ${fromUnit} to ${toUnit}`);
            
            // If same units, return as is
            if (fromUnit === toUnit) {
                console.log(`✅ Same units: ${quantity}`);
                return quantity;
            }

            // Weight conversions (base: gm)
            const weightConversions = {
                'mg': 0.001,    // 1mg = 0.001gm
                'gm': 1,        // 1gm = 1gm (base)
                'kg': 1000     // 1kg = 1000gm
            };

            // Volume conversions (base: ml)
            const volumeConversions = {
                'ml': 1,        // 1ml = 1ml (base)
                'ltr': 1000,    // 1ltr = 1000ml
                'litre': 1000   // 1litre = 1000ml
            };

            // Check if both are weight units
            if (weightConversions[fromUnit] && weightConversions[toUnit]) {
                const baseQuantity = quantity * weightConversions[fromUnit];
                const convertedQuantity = baseQuantity / weightConversions[toUnit];
                console.log(`✅ Weight conversion: ${quantity} ${fromUnit} = ${convertedQuantity} ${toUnit}`);
                return convertedQuantity;
            }

            // Check if both are volume units
            if (volumeConversions[fromUnit] && volumeConversions[toUnit]) {
                const baseQuantity = quantity * volumeConversions[fromUnit];
                const convertedQuantity = baseQuantity / volumeConversions[toUnit];
                console.log(`✅ Volume conversion: ${quantity} ${fromUnit} = ${convertedQuantity} ${toUnit}`);
                return convertedQuantity;
            }

            // For pcs or incompatible units, return original
            console.log(`⚠️ No conversion available: ${fromUnit} to ${toUnit} - using original quantity`);
            return quantity;
        };

        // ✅ Convert waste quantity to inventory unit
        const convertedWasteQuantity = convertUnits(wasteQuantity, unit, inventoryUnit);
        
        console.log('🔄 Converted waste quantity:', {
            original: `${wasteQuantity} ${unit}`,
            converted: `${convertedWasteQuantity} ${inventoryUnit}`
        });

        // ✅ Prevent waste > available quantity (using converted quantity)
        if (convertedWasteQuantity > currentQuantity) {
            return res.status(400).json({
                success: false,
                message: `Cannot waste ${wasteQuantity} ${unit} (${convertedWasteQuantity} ${inventoryUnit}). Only ${currentQuantity} ${inventoryUnit} available.`,
            });
        }

        // ✅ Create waste record
        const waste = new WasteMaterial({
            itemId,
            stockName: itemName,
            wasteQuantity,
            restaurantId,
            unit,
            note: reason,
            date,
        });

        await waste.save();

        // ✅ Reduce available stock using FIFO method
        console.log('🔄 Before waste deduction:', {
            totalRemainingQuantity: inventoryItem.totalRemainingQuantity,
            totalQuantity: inventoryItem.totalQuantity
        });

        // Deduct from supplierStocks using FIFO (First In, First Out)
        let remainingWaste = convertedWasteQuantity; // ✅ Use converted quantity
        
        for (let stockItem of inventoryItem.supplierStocks) {
            if (remainingWaste <= 0) break;
            
            if (stockItem.remainingQuantity > 0 && !stockItem.isFullyUsed) {
                const deductFromThisStock = Math.min(stockItem.remainingQuantity, remainingWaste);
                
                stockItem.remainingQuantity -= deductFromThisStock;
                stockItem.usedQuantity += deductFromThisStock;
                
                if (stockItem.remainingQuantity <= 0) {
                    stockItem.isFullyUsed = true;
                    stockItem.remainingQuantity = 0;
                }
                
                remainingWaste -= deductFromThisStock;
                
                console.log(`✅ Deducted ${deductFromThisStock} ${inventoryUnit} from supplier stock`);
            }
        }

        // Update main totals (using converted quantity)
        inventoryItem.totalRemainingQuantity -= convertedWasteQuantity;
        inventoryItem.totalUsedQuantity = (inventoryItem.totalUsedQuantity || 0) + convertedWasteQuantity;

        await inventoryItem.save();

        console.log('✅ After waste deduction:', {
            totalRemainingQuantity: inventoryItem.totalRemainingQuantity,
            totalQuantity: inventoryItem.totalQuantity,
            wasteDeducted: convertedWasteQuantity
        });

        res.status(201).json({
            success: true,
            message: `Waste added. Remaining ${itemName}: ${inventoryItem.totalRemainingQuantity} ${inventoryUnit}`,
            waste,
        });
    } catch (error) {
        console.error("❌ Error creating waste material:", error);
        console.error("❌ Error stack:", error.stack);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            details: error.stack
        });
    }
};

// ✅ Get all waste materials (optionally by restaurant)
exports.getWasteMaterials = async (req, res) => {
    try {
        const { restaurantId } = req.query;
        const filter = restaurantId ? { restaurantId } : {};

        const wastes = await WasteMaterial.find(filter)
            .populate("restaurantId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: wastes.length,
            wastes,
        });
    } catch (error) {
        console.error("Error fetching waste materials:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// ✅ Update waste material
// 📍 File: WasteController.js

// ✅ CORRECTED Update waste material function
exports.updateWasteMaterial = async (req, res) => {
  try {
    const { itemId: newItemId, itemName, wasteQuantity: newWasteQuantity, unit, reason, date } = req.body;
    const wasteId = req.params.id;

    if (!wasteId) return res.status(400).json({ success: false, message: "Waste ID missing" });
    if (!mongoose.Types.ObjectId.isValid(wasteId)) return res.status(400).json({ success: false, message: "Invalid Waste ID" });

    const existingWaste = await WasteMaterial.findById(wasteId);
    if (!existingWaste) return res.status(404).json({ success: false, message: "Waste record not found" });

    const oldItemId = existingWaste.itemId;
    const oldWasteQuantity = existingWaste.wasteQuantity;
    const newWasteQuantityNum = Number(newWasteQuantity);
    const oldWasteQuantityNum = Number(oldWasteQuantity);
    if (isNaN(newWasteQuantityNum) || isNaN(oldWasteQuantityNum)) {
      return res.status(400).json({ success: false, message: "Invalid waste quantity value" });
    }

    const itemHasChanged = oldItemId && newItemId ? oldItemId.toString() !== newItemId : false;
    console.log({ wasteId, newItemId, oldItemId, itemHasChanged });

    if (itemHasChanged) {
      const oldInventoryItem = await Inventory.findById(oldItemId);
      if (oldInventoryItem?.stock) {
        oldInventoryItem.stock.quantity = (oldInventoryItem.stock.quantity ?? 0) + oldWasteQuantityNum;
        if (oldInventoryItem.stock.totalQuantity != null)
          oldInventoryItem.stock.totalQuantity += oldWasteQuantityNum;
        await oldInventoryItem.save();
      }

      const newInventoryItem = await Inventory.findById(newItemId);
      if (newInventoryItem?.stock) {
        newInventoryItem.stock.quantity -= newWasteQuantityNum;
        if (newInventoryItem.stock.totalQuantity != null)
          newInventoryItem.stock.totalQuantity -= newWasteQuantityNum;
        await newInventoryItem.save();
      }

    } else {
      const currentItemId = newItemId || oldItemId;
      if (!currentItemId) return res.status(400).json({ success: false, message: "Inventory item ID missing" });

      const inventoryItem = await Inventory.findById(currentItemId);
      if (!inventoryItem) return res.status(404).json({ success: false, message: "Inventory item not found" });

      const quantityDifference = newWasteQuantityNum - oldWasteQuantityNum;
      if (inventoryItem.stock) {
        inventoryItem.stock.quantity -= quantityDifference;
        if (inventoryItem.stock.totalQuantity != null)
          inventoryItem.stock.totalQuantity -= quantityDifference;
        await inventoryItem.save();
      }
    }

    let updatedItemName = itemName;

if (!updatedItemName && newItemId) {
  const inventoryItem = await Inventory.findById(newItemId);
  updatedItemName = inventoryItem ? inventoryItem.itemName || inventoryItem.name : "Unknown Item";
}

    existingWaste.itemId = newItemId;
    existingWaste.stockName = itemName || updatedItemName || existingWaste.stockName;
    existingWaste.wasteQuantity = newWasteQuantityNum;
    existingWaste.unit = unit;
    existingWaste.note = reason;
    existingWaste.date = date;
    await existingWaste.save();

    res.status(200).json({
      success: true,
      message: "Waste material updated successfully",
      waste: existingWaste,
    });

  } catch (error) {
    console.error("CRITICAL ERROR in updateWasteMaterial:", error);
    res.status(500).json({ success: false, message: "Internal server error hai", error: error.message });
  }
};

// ✅ Delete waste material
exports.deleteWasteMaterial = async (req, res) => {
    try {
        const wasteId = req.params.id;

        const deletedWaste = await WasteMaterial.findById(wasteId);
        if (!deletedWaste) {
            return res.status(404).json({
                success: false,
                message: "Waste material not found",
            });
        }

        // Find inventory and restore the wasted quantity
        const inventoryItem = await Inventory.findById(deletedWaste.itemId);
        if (inventoryItem) {
            inventoryItem.stock.quantity = (inventoryItem.stock?.quantity ?? 0) + deletedWaste.wasteQuantity;
            if (inventoryItem.stock.totalQuantity) {
                inventoryItem.stock.totalQuantity += deletedWaste.wasteQuantity;
            }
            await inventoryItem.save();
        }

        // Delete the waste record
        await WasteMaterial.findByIdAndDelete(wasteId);

        res.status(200).json({
            success: true,
            message: "Waste material deleted and stock restored successfully",
        });
    } catch (error) {
        console.error("Error deleting waste material:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// const WasteMaterial = require("../model/Waste");

// // ✅ Create new waste material entry
// const Stock = require("../model/Inventory"); // <-- import your Stock model

// // ✅ Create new waste material entry
// exports.createWasteMaterial = async (req, res) => {
//     try {
//         const { itemId, itemName, wasteQuantity, restaurantId, unit, reason, date } = req.body;

//         if (!itemName || !wasteQuantity || !restaurantId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Item name, waste quantity, and restaurant ID are required.",
//             });
//         }

//         // ✅ 1️⃣ Find inventory item
//         const inventoryItem = await Inventory.findOne({ itemName, restaurantId });

//         if (!inventoryItem) {
//             return res.status(404).json({
//                 success: false,
//                 message: `Item "${itemName}" not found in inventory.`,
//             });
//         }

//         // ✅ 2️⃣ Get current total quantity
//         const currentQuantity = inventoryItem.stock?.totalQuantity ?? 0;

//         if (currentQuantity <= 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: `No stock available for "${itemName}".`,
//             });
//         }

//         // ✅ 3️⃣ Prevent waste > available quantity
//         if (wasteQuantity > currentQuantity) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Cannot waste ${wasteQuantity} ${unit}. Only ${currentQuantity} ${unit} available.`,
//             });
//         }

//         // ✅ 4️⃣ Create waste record
//         const waste = new WasteMaterial({
//             itemId,
//             stockName: itemName,
//             wasteQuantity,
//             restaurantId,
//             unit,
//             note: reason,
//             date,
//         });

//         await waste.save();

//         // ✅ 5️⃣ Reduce available stock
//         inventoryItem.stock.totalQuantity = currentQuantity - wasteQuantity;
//         await inventoryItem.save();

//         res.status(201).json({
//             success: true,
//             message: `Waste added. Remaining ${itemName}: ${inventoryItem.stock.totalQuantity} ${unit}`,
//             waste,
//         });
//     } catch (error) {
//         console.error("Error creating waste material:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//         });
//     }
// };

// // exports.createWasteMaterial = async (req, res) => {
// //     try {
// //         const { itemId, itemName, wasteQuantity, restaurantId, unit, reason, date } = req.body;

// //         if (!itemName || !wasteQuantity || !restaurantId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Item name, waste quantity, and restaurant ID are required.",
// //             });
// //         }

// //         const waste = new WasteMaterial({
// //             itemId,
// //             stockName: itemName, // keep compatibility
// //             wasteQuantity,
// //             restaurantId,
// //             unit,
// //             note: reason, // save reason in note field
// //             date,
// //         });

// //         await waste.save();

// //         res.status(201).json({
// //             success: true,
// //             message: "Waste material added successfully",
// //             waste,
// //         });
// //     } catch (error) {
// //         console.error("Error creating waste material:", error);
// //         res.status(500).json({
// //             success: false,
// //             message: "Internal server error",
// //         });
// //     }
// // };


// // ✅ Get all waste materials (optionally by restaurant)
// exports.getWasteMaterials = async (req, res) => {
//     try {
//         const { restaurantId } = req.query;
//         const filter = restaurantId ? { restaurantId } : {};

//         const wastes = await WasteMaterial.find(filter)
//             .populate("restaurantId", "name email")
//             .sort({ createdAt: -1 });

//         res.status(200).json({
//             success: true,
//             count: wastes.length,
//             wastes,
//         });
//     } catch (error) {
//         console.error("Error fetching waste materials:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//         });
//     }
// };

// // ✅ Get single waste material by ID
// exports.getWasteMaterialById = async (req, res) => {
//     try {
//         const waste = await WasteMaterial.findById(req.params.id).populate(
//             "restaurantId",
//             "name email"
//         );

//         if (!waste) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Waste material not found",
//             });
//         }

//         res.status(200).json({
//             success: true,
//             waste,
//         });
//     } catch (error) {
//         console.error("Error fetching waste material:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//         });
//     }
// };

// // ✅ Update waste material
// exports.updateWasteMaterial = async (req, res) => {
//     try {
//         const updatedWaste = await WasteMaterial.findByIdAndUpdate(
//             req.params.id,
//             req.body,
//             { new: true, runValidators: true }
//         );

//         if (!updatedWaste) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Waste material not found",
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Waste material updated successfully",
//             waste: updatedWaste,
//         });
//     } catch (error) {
//         console.error("Error updating waste material:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//         });
//     }
// };

// // ✅ Delete waste material
// exports.deleteWasteMaterial = async (req, res) => {
//     try {
//         const deletedWaste = await WasteMaterial.findByIdAndDelete(req.params.id);

//         if (!deletedWaste) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Waste material not found",
//             });
//         }

//         res.status(200).json({
//             success: true,
//             message: "Waste material deleted successfully",
//         });
//     } catch (error) {
//         console.error("Error deleting waste material:", error);
//         res.status(500).json({
//             success: false,
//             message: "Internal server error",
//         });
//     }
// };
