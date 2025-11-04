const Menu = require("../model/Menu");
const Inventory = require("../model/Inventory");
const { roundToDecimals } = require("../utils/numberUtils");
const Decimal = require('decimal.js');



/**
 * Convert units to a common base unit for comparison
 * @param {Number} quantity - Quantity to convert
 * @param {String} fromUnit - Source unit
 * @param {String} toUnit - Target unit
 * @returns {Number} - Converted quantity
 */
const convertUnits = (quantity, fromUnit, toUnit) => {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return roundToDecimals(quantity, 2);
  }

  // Direct conversion logic for common cases
  let convertedQuantity = quantity;

  // Weight conversions
  if (fromUnit === 'gm' && toUnit === 'kg') {
    convertedQuantity = quantity / 1000; // 1000 gm = 1 kg
  } else if (fromUnit === 'kg' && toUnit === 'gm') {
    convertedQuantity = quantity * 1000; // 1 kg = 1000 gm
  } else if (fromUnit === 'mg' && toUnit === 'gm') {
    convertedQuantity = quantity / 1000; // 1000 mg = 1 gm
  } else if (fromUnit === 'mg' && toUnit === 'kg') {
    convertedQuantity = quantity / 1000000; // 1000000 mg = 1 kg
  } else if (fromUnit === 'gm' && toUnit === 'mg') {
    convertedQuantity = quantity * 1000; // 1 gm = 1000 mg
  } else if (fromUnit === 'kg' && toUnit === 'mg') {
    convertedQuantity = quantity * 1000000; // 1 kg = 1000000 mg
  }
  
  // Volume conversions
  else if (fromUnit === 'ml' && toUnit === 'ltr') {
    convertedQuantity = quantity / 1000; // 1000 ml = 1 ltr
  } else if (fromUnit === 'ml' && toUnit === 'litre') {
    convertedQuantity = quantity / 1000; // 1000 ml = 1 litre
  } else if (fromUnit === 'ltr' && toUnit === 'ml') {
    convertedQuantity = quantity * 1000; // 1 ltr = 1000 ml
  } else if (fromUnit === 'litre' && toUnit === 'ml') {
    convertedQuantity = quantity * 1000; // 1 litre = 1000 ml
  } else if (fromUnit === 'ltr' && toUnit === 'litre') {
    convertedQuantity = quantity; // 1 ltr = 1 litre
  } else if (fromUnit === 'litre' && toUnit === 'ltr') {
    convertedQuantity = quantity; // 1 litre = 1 ltr
  }
  
  // Default case - no conversion
  else {
    console.log(`⚠️ No conversion defined for ${fromUnit} to ${toUnit}`);
    convertedQuantity = quantity;
  }
  
  // Round to avoid floating point precision issues
  const roundedQuantity = roundToDecimals(convertedQuantity, 2);
  
  // Debug logging
  console.log(`Unit conversion: ${quantity} ${fromUnit} = ${roundedQuantity} ${toUnit}`);
  
  return roundedQuantity;
};

/**
 * Check if two units are compatible (same type)
 * @param {String} unit1 - First unit
 * @param {String} unit2 - Second unit
 * @returns {Boolean} - True if compatible
 */
const areUnitsCompatible = (unit1, unit2) => {
  const weightUnits = ['mg', 'gm', 'kg'];
  const volumeUnits = ['ml', 'litre', 'ltr', 'liter']; // ✅ ADD ltr and liter
  const countUnits = ['pcs'];
  
  const unit1Type = weightUnits.includes(unit1) ? 'weight' : 
                   volumeUnits.includes(unit1) ? 'volume' : 
                   countUnits.includes(unit1) ? 'count' : 'unknown';
  
  const unit2Type = weightUnits.includes(unit2) ? 'weight' : 
                   volumeUnits.includes(unit2) ? 'volume' : 
                   countUnits.includes(unit2) ? 'count' : 'unknown';
  
  return unit1Type === unit2Type;
};

/**
 * Deduct inventory for items in a transaction or order
 * @param {Array} items - Array of items with itemId and quantity
 * @param {String} restaurantId - Restaurant ID
 * @param {String} sourceId - Transaction ID or Order ID for logging
 * @param {String} sourceType - 'transaction' or 'order'
 * @returns {Object} - Result object with success status and details
 */

const deductInventory = async (items, restaurantId, sourceId, sourceType = 'transaction') => {
  try {
    console.log(`Starting inventory deduction for ${sourceType}:`, sourceId);
    console.log(`🔍 DEBUG - Items received:`, JSON.stringify(items, null, 2));
    
    const results = {
      success: true,
      deductedItems: [],
      warnings: [],
      errors: []
    };
    
    for (const item of items) {
      try {
        // 🔹 1. Find menu item to get its stockItems (ingredients)
        const menuItem = await Menu.findById(item.itemId);
        if (!menuItem) {
          results.warnings.push(`Menu item not found: ${item.itemName} (ID: ${item.itemId})`);
          continue;
        }

        if (!menuItem.stockItems || menuItem.stockItems.length === 0) {
          console.log(`No stock items found for menu item: ${item.itemName}`);
          continue;
        }

        console.log(`Processing item: ${item.itemName} (Quantity: ${item.quantity}, Size: ${item.size})`);
        console.log(`🔍 DEBUG - Item details:`, {
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.quantity,
          size: item.size,
          hasSize: !!item.size,
          sizeType: typeof item.size
        });
        console.log(`🔍 DEBUG - All menuItem.stockItems:`, menuItem.stockItems);

        // 🔹 2. Filter stock items by size (if size is provided)
        let stockItemsToProcess = menuItem.stockItems;
        if (item.size && item.size.trim()) {
          console.log(`🔍 DEBUG - Looking for size: "${item.size}"`);
          console.log(`🔍 DEBUG - Available sizes in stockItems:`, menuItem.stockItems.map(si => si.size));
          
          stockItemsToProcess = menuItem.stockItems.filter(stockItem => {
            const matches = stockItem.size === item.size;
            console.log(`🔍 DEBUG - Comparing "${stockItem.size}" === "${item.size}" = ${matches}`);
            return matches;
          });
          
          console.log(`Filtering stock items for size: ${item.size}, Found: ${stockItemsToProcess.length} items`);
          console.log(`🔍 DEBUG - Filtered stockItems:`, stockItemsToProcess);
          
          if (stockItemsToProcess.length === 0) {
            results.warnings.push(`No stock items found for size: ${item.size} in menu item: ${item.itemName}`);
            continue;
          }
        } else {
          console.log(`No size specified, processing all stock items for: ${item.itemName}`);
        }

        // 🔹 3. Loop through each stock item (ingredient) for the selected size
        for (const stockItem of stockItemsToProcess) {
          const totalQuantityNeeded = new Decimal(stockItem.quantity).times(item.quantity);

          console.log(
            `Deducting stock: ${stockItem.stockId} - Quantity needed: ${totalQuantityNeeded} ${stockItem.unit}`
          );

          // 🔹 3. Find inventory item
          console.log(`🔍 DEBUG - Looking for inventory item with stockId: ${stockItem.stockId}, restaurantId: ${restaurantId}`);
          
          const inventoryItem = await Inventory.findOne({
            _id: stockItem.stockId,
            restaurantId: restaurantId,
            isDeleted: { $ne: true }
          });

          if (!inventoryItem) {
            // Try without restaurantId filter to see if item exists
            const inventoryItemWithoutRestaurant = await Inventory.findById(stockItem.stockId);
            if (inventoryItemWithoutRestaurant) {
              console.log(`❌ Inventory item exists but restaurantId mismatch:`);
              console.log(`   Expected: ${restaurantId}`);
              console.log(`   Actual: ${inventoryItemWithoutRestaurant.restaurantId}`);
              results.warnings.push(`Inventory item found but restaurantId mismatch for stockId: ${stockItem.stockId}`);
            } else {
              console.log(`❌ Inventory item not found at all for stockId: ${stockItem.stockId}`);
              results.warnings.push(`Inventory item not found for stockId: ${stockItem.stockId}`);
            }
            continue;
          }
          
          console.log(`✅ Found inventory item: ${inventoryItem.itemName} (ID: ${inventoryItem._id})`);
          console.log(`🔍 DEBUG - Inventory item details:`, {
            id: inventoryItem._id,
            itemName: inventoryItem.itemName,
            unit: inventoryItem.unit,
            totalQuantity: inventoryItem.totalQuantity,
            totalRemainingQuantity: inventoryItem.totalRemainingQuantity,
            stock: inventoryItem.stock,
            hasStock: !!inventoryItem.stock,
            stockTotalQuantity: inventoryItem.stock?.totalQuantity,
            stockQuantity: inventoryItem.stock?.quantity
          });

          // 🔹 4. Check unit compatibility
          if (!areUnitsCompatible(stockItem.unit, inventoryItem.unit)) {
            const warning = `Unit mismatch: Menu uses ${stockItem.unit}, Inventory uses ${inventoryItem.unit} for ${inventoryItem.itemName}`;
            results.warnings.push(warning);
            console.warn(warning);
            continue;
          }

          // 🔹 5. Convert quantity (e.g., gm → kg)
          const convertedQuantityNeeded = new Decimal(
            convertUnits(totalQuantityNeeded.toNumber(), stockItem.unit, inventoryItem.unit)
          );

           console.log(
             `Converted quantity: ${totalQuantityNeeded.toFixed(2)} ${stockItem.unit} = ${convertedQuantityNeeded.toFixed(2)} ${inventoryItem.unit}`
           );

          // 🔹 6. Check if enough stock is available
          // Use totalRemainingQuantity instead of stock.totalQuantity
          const currentStock = new Decimal(inventoryItem.totalRemainingQuantity || 0);
          console.log(`🔍 DEBUG - Current stock: ${currentStock.toFixed(2)} ${inventoryItem.unit}`);

          if (currentStock.greaterThanOrEqualTo(convertedQuantityNeeded)) {
            // ✅ 7. Proper rounding (2 decimals everywhere)
            const roundedDeductedQuantity = convertedQuantityNeeded.toDecimalPlaces(2);
            const remainingStock = currentStock.minus(roundedDeductedQuantity).toDecimalPlaces(2);

            // ✅ 8. Deduct from DB
            await Inventory.findByIdAndUpdate(
              stockItem.stockId,
              { 
                $inc: { 
                  'totalRemainingQuantity': -roundedDeductedQuantity.toNumber(),
                  'totalUsedQuantity': roundedDeductedQuantity.toNumber()
                }
              },
              { new: true }
            );

             // ✅ 9. Push result summary
             results.deductedItems.push({
               inventoryItemName: inventoryItem.itemName,
               stockId: stockItem.stockId,
               quantityDeducted: roundedDeductedQuantity.toNumber(),
               unit: inventoryItem.unit,
               remainingStock: parseFloat(remainingStock.toFixed(2)),
               originalQuantity: totalQuantityNeeded.toDecimalPlaces(2).toNumber(),
               originalUnit: stockItem.unit
             });

            console.log(
              `✅ Successfully deducted ${roundedDeductedQuantity.toFixed(2)} ${inventoryItem.unit} from ${inventoryItem.itemName}`
            );

          } else {
            const warning = `⚠️ Insufficient stock for ${inventoryItem.itemName}. Available: ${currentStock.toFixed(2)} ${inventoryItem.unit}, Needed: ${convertedQuantityNeeded.toFixed(2)} ${inventoryItem.unit}`;
            results.warnings.push(warning);
            console.warn(warning);
          }
        }
      } catch (itemError) {
        const error = `Error processing item ${item.itemName}: ${itemError.message}`;
        results.errors.push(error);
        console.error(error);
      }
    }

    // ✅ Final result flag
    if (results.errors.length > 0) {
      results.success = false;
    }

    console.log(`Inventory deduction completed for ${sourceType}:`, sourceId);
    console.log(`Results:`, {
      deductedItems: results.deductedItems.length,
      warnings: results.warnings.length,
      errors: results.errors.length
    });

    return results;

  } catch (error) {
    console.error(`Error in inventory deduction for ${sourceType}:`, error);
    return {
      success: false,
      deductedItems: [],
      warnings: [],
      errors: [error.message]
    };
  }
};
// const deductInventory = async (items, restaurantId, sourceId, sourceType = 'transaction') => {
//   try {
//     console.log(`Starting inventory deduction for ${sourceType}:`, sourceId);
    
//     const results = {
//       success: true,
//       deductedItems: [],
//       warnings: [],
//       errors: []
//     };
    
//     for (const item of items) {
//       try {
//         // Find the menu item to get its stockItems (ingredients)
//         const menuItem = await Menu.findById(item.itemId);
//         if (!menuItem) {
//           results.warnings.push(`Menu item not found: ${item.itemName} (ID: ${item.itemId})`);
//           continue;
//         }
        
//         if (!menuItem.stockItems || menuItem.stockItems.length === 0) {
//           console.log(`No stock items found for menu item: ${item.itemName}`);
//           continue;
//         }
        
//         console.log(`Processing item: ${item.itemName} (Quantity: ${item.quantity})`);
        
//         for (const stockItem of menuItem.stockItems) {
//           // Calculate total quantity needed for this stock item
//           const totalQuantityNeeded = stockItem.quantity * item.quantity;
          
//           console.log(`Deducting stock: ${stockItem.stockId} - Quantity needed: ${totalQuantityNeeded} ${stockItem.unit}`);
          
//           // ✅ CORRECT FLOW: Transaction → Menu → Inventory
//           // 1. Transaction items[].itemId → Menu collection
//           // 2. Menu stockItems[].stockId → Inventory collection  
//           // 3. Inventory collection में actual stock deduction
          
//           // Find and update the inventory item using stockId from Menu
//           const inventoryItem = await Inventory.findOne({
//             _id: stockItem.stockId,
//             restaurantId: restaurantId,
//             isDeleted: { $ne: true }
//           });
          
//           if (!inventoryItem) {
//             results.warnings.push(`Inventory item not found for stockId: ${stockItem.stockId}`);
//             continue;
//           }
          
//           // Check unit compatibility
//           if (!areUnitsCompatible(stockItem.unit, inventoryItem.unit)) {
//             const warning = `Unit mismatch: Menu uses ${stockItem.unit}, Inventory uses ${inventoryItem.unit} for ${inventoryItem.itemName}`;
//             results.warnings.push(warning);
//             console.warn(warning);
//             continue;
//           }
          
//           // Convert quantity to inventory unit
//           const convertedQuantityNeeded = convertUnits(totalQuantityNeeded, stockItem.unit, inventoryItem.unit);
          
//           console.log(`Converted quantity: ${totalQuantityNeeded} ${stockItem.unit} = ${convertedQuantityNeeded} ${inventoryItem.unit}`);
          
//           // Check if sufficient stock is available
//           const currentStock = inventoryItem.stock.totalQuantity || 0;
//           if (currentStock >= convertedQuantityNeeded) {
//             // Round the deducted quantity to avoid floating point issues
//             const roundedDeductedQuantity = roundToDecimals(convertedQuantityNeeded, 2);
            
//             // ✅ ACTUAL STOCK DEDUCTION in Inventory collection
//             await Inventory.findByIdAndUpdate(
//               stockItem.stockId,
//               { 
//                 $inc: { 
//                   'stock.totalQuantity': -roundedDeductedQuantity,
//                   'stock.quantity': -roundedDeductedQuantity
//                 }
//               },
//               { new: true }
//             );
            
//             results.deductedItems.push({
//               inventoryItemName: inventoryItem.itemName,
//               stockId: stockItem.stockId,
//               quantityDeducted: roundedDeductedQuantity,
//               unit: inventoryItem.unit,
//               remainingStock: roundToDecimals(currentStock - roundedDeductedQuantity, 2),
//               originalQuantity: totalQuantityNeeded,
//               originalUnit: stockItem.unit
//             });
            
//             console.log(`Successfully deducted ${convertedQuantityNeeded} ${inventoryItem.unit} from inventory item: ${inventoryItem.itemName}`);
//           } else {
//             const warning = `Insufficient stock for ${inventoryItem.itemName}. Available: ${currentStock} ${inventoryItem.unit}, Needed: ${convertedQuantityNeeded} ${inventoryItem.unit}`;
//             results.warnings.push(warning);
//             console.warn(warning);
//           }
//         }
//       } catch (itemError) {
//         const error = `Error processing item ${item.itemName}: ${itemError.message}`;
//         results.errors.push(error);
//         console.error(error);
//       }
//     }
    
//     if (results.errors.length > 0) {
//       results.success = false;
//     }
    
//     console.log(`Inventory deduction completed for ${sourceType}:`, sourceId);
//     console.log(`Results:`, {
//       deductedItems: results.deductedItems.length,
//       warnings: results.warnings.length,
//       errors: results.errors.length
//     });
    
//     return results;
//   } catch (error) {
//     console.error(`Error in inventory deduction for ${sourceType}:`, error);
//     return {
//       success: false,
//       deductedItems: [],
//       warnings: [],
//       errors: [error.message]
//     };
//   }
// };

/**
 * Check if sufficient inventory is available for items
 * @param {Array} items - Array of items with itemId and quantity
 * @param {String} restaurantId - Restaurant ID
 * @returns {Object} - Result object with availability status
 */
const checkInventoryAvailability = async (items, restaurantId) => {
  try {
    const results = {
      available: true,
      unavailableItems: [],
      warnings: []
    };
    
    for (const item of items) {
      const menuItem = await Menu.findById(item.itemId);
      if (!menuItem || !menuItem.stockItems || menuItem.stockItems.length === 0) {
        continue;
      }
      
      for (const stockItem of menuItem.stockItems) {
        const totalQuantityNeeded = stockItem.quantity * item.quantity;
        
        // ✅ CORRECT FLOW: Transaction → Menu → Inventory
        // Check actual stock availability in Inventory collection
        
        const inventoryItem = await Inventory.findOne({
          _id: stockItem.stockId,
          restaurantId: restaurantId,
          isDeleted: { $ne: true }
        });
        
        if (!inventoryItem) {
          results.warnings.push(`Inventory item not found for stockId: ${stockItem.stockId}`);
          continue;
        }
        
        // Check unit compatibility
        if (!areUnitsCompatible(stockItem.unit, inventoryItem.unit)) {
          results.warnings.push(`Unit mismatch: Menu uses ${stockItem.unit}, Inventory uses ${inventoryItem.unit} for ${inventoryItem.itemName}`);
          continue;
        }
        
        // Convert quantity to inventory unit
        const convertedQuantityNeeded = convertUnits(totalQuantityNeeded, stockItem.unit, inventoryItem.unit);
        const currentStock = inventoryItem.stock.totalQuantity || 0;
        
        if (currentStock < convertedQuantityNeeded) {
          results.available = false;
          results.unavailableItems.push({
            itemName: item.itemName,
            inventoryItemName: inventoryItem.itemName,
            needed: convertedQuantityNeeded,
            available: currentStock,
            shortfall: roundToDecimals(convertedQuantityNeeded - currentStock, 2),
            unit: inventoryItem.unit,
            originalNeeded: totalQuantityNeeded,
            originalUnit: stockItem.unit
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error checking inventory availability:", error);
    return {
      available: false,
      unavailableItems: [],
      warnings: [error.message]
    };
  }
};

module.exports = {
  deductInventory,
  checkInventoryAvailability,
  convertUnits,
  areUnitsCompatible,
  roundToDecimals
};
