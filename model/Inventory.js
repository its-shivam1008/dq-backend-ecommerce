const mongoose = require("mongoose");

const supplierStockSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  supplierName: {
    type: String,
    required: true,
  },
  purchasedQuantity: {
    type: Number,
    required: true,
    default: 0,
  },
  remainingQuantity: {
    type: Number,
    required: true,
    default: 0,
  },
  usedQuantity: {
    type: Number,
    default: 0,
  },
  pricePerUnit: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  isFullyUsed: {
    type: Boolean,
    default: false,
  },
});

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "gm", "ltr", "ml", "pcs", "mg", "litre"],
    },
    restaurantId: {
      type: String,
      required: true,
    },
    // Aggregate stock information
    totalQuantity: {
      type: Number,
      default: 0,
    },
    totalUsedQuantity: {
      type: Number,
      default: 0,
    },
    totalRemainingQuantity: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    // Array of supplier stocks (FIFO order maintained by purchasedAt)
    supplierStocks: [supplierStockSchema],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ==================== UNIT CONVERSION UTILITIES ====================

/**
 * Normalize unit names to standard format
 * @param {string} u - Unit to normalize
 * @returns {string} - Normalized unit
 */
const normalizeUnit = (u) => {
  if (!u) return '';
  u = u.toLowerCase().trim();
  
  // Weight units
  if (['g', 'gram', 'grams', 'gm'].includes(u)) return 'gm';
  if (['kilogram', 'kgs', 'kg.', 'kg'].includes(u)) return 'kg';
  if (['milligram', 'milligrams', 'mg'].includes(u)) return 'mg';
  
  // Volume units
  if (['l', 'liter', 'liters', 'litre', 'litres', 'ltr'].includes(u)) return 'litre';
  if (['mls', 'ml', 'milliliter', 'millilitre'].includes(u)) return 'ml';
  
  // Count units
  if (['piece', 'pieces', 'unit', 'units', 'pcs', 'pc'].includes(u)) return 'pcs';
  
  return u;
};

/**
 * Convert quantity to base unit (gm for weight, ml for volume, pcs for count)
 * @param {number} qty - Quantity to convert
 * @param {string} unit - Source unit
 * @returns {number} - Quantity in base unit
 */
const convertToBaseUnit = (qty, unit) => {
  const u = normalizeUnit(unit);
  
  switch (u) {
    // Weight conversions to grams
    case 'kg': return qty * 1000;
    case 'gm': return qty;
    case 'mg': return qty * 0.001;
    
    // Volume conversions to ml
    case 'litre': return qty * 1000;
    case 'ltr': return qty * 1000;
    case 'ml': return qty;
    
    // Count (no conversion)
    case 'pcs': return qty;
    
    default: return qty;
  }
};

/**
 * Convert quantity from base unit back to target unit
 * @param {number} qty - Quantity in base unit
 * @param {string} unit - Target unit
 * @returns {number} - Quantity in target unit
 */
const convertFromBaseUnit = (qty, unit) => {
  const u = normalizeUnit(unit);
  
  switch (u) {
    // Weight conversions from grams
    case 'kg': return qty / 1000;
    case 'gm': return qty;
    case 'mg': return qty / 0.001;
    
    // Volume conversions from ml
    case 'litre': return qty / 1000;
    case 'ltr': return qty / 1000;
    case 'ml': return qty;
    
    // Count (no conversion)
    case 'pcs': return qty;
    
    default: return qty;
  }
};

/**
 * Check if two units are compatible (both weight, both volume, or both count)
 * @param {string} unit1 - First unit
 * @param {string} unit2 - Second unit
 * @returns {boolean} - True if compatible
 */
const areUnitsCompatible = (unit1, unit2) => {
  const u1 = normalizeUnit(unit1);
  const u2 = normalizeUnit(unit2);
  
  const weightUnits = ['kg', 'gm', 'mg'];
  const volumeUnits = ['litre', 'ltr', 'ml'];
  const countUnits = ['pcs'];
  
  const u1IsWeight = weightUnits.includes(u1);
  const u2IsWeight = weightUnits.includes(u2);
  const u1IsVolume = volumeUnits.includes(u1);
  const u2IsVolume = volumeUnits.includes(u2);
  const u1IsCount = countUnits.includes(u1);
  const u2IsCount = countUnits.includes(u2);
  
  return (u1IsWeight && u2IsWeight) || 
         (u1IsVolume && u2IsVolume) || 
         (u1IsCount && u2IsCount);
};

// ==================== INVENTORY METHODS ====================

/**
 * Add stock from a supplier
 * @param {Object} supplierData - Supplier stock data
 */
inventorySchema.methods.addSupplierStock = function(supplierData) {
  console.log('🔄 addSupplierStock called with:', supplierData);
  console.log('🔄 Before adding - Current totals:', {
    totalQuantity: this.totalQuantity,
    totalRemainingQuantity: this.totalRemainingQuantity,
    totalAmount: this.totalAmount
  });
  
  const newStock = {
    supplierId: supplierData.supplierId,
    supplierName: supplierData.supplierName,
    purchasedQuantity: supplierData.quantity,
    remainingQuantity: supplierData.quantity,
    usedQuantity: 0,
    pricePerUnit: supplierData.pricePerUnit,
    totalAmount: supplierData.quantity * supplierData.pricePerUnit,
    purchasedAt: new Date(),
    isFullyUsed: false,
  };

  this.supplierStocks.push(newStock);
  
  // Update totals
  this.totalQuantity += supplierData.quantity;
  this.totalRemainingQuantity += supplierData.quantity;
  this.totalAmount += newStock.totalAmount;
  
  console.log('🔄 After adding - New totals:', {
    totalQuantity: this.totalQuantity,
    totalRemainingQuantity: this.totalRemainingQuantity,
    totalAmount: this.totalAmount,
    supplierStocksCount: this.supplierStocks.length
  });
  
  // Sort by purchasedAt to maintain FIFO
  this.supplierStocks.sort((a, b) => a.purchasedAt - b.purchasedAt);
  
  return this;
};

/**
 * Deduct stock using FIFO with unit conversion support
 * @param {number} quantityToDeduct - Quantity to deduct
 * @param {string} deductionUnit - Unit of the quantity to deduct (optional)
 * @returns {boolean} - Success status
 */
inventorySchema.methods.deductStock = function(quantityToDeduct, deductionUnit = null) {
  // If no deduction unit provided, assume it matches inventory unit
  const targetUnit = deductionUnit || this.unit;
  
  console.log('=== DEDUCT STOCK WITH UNIT CONVERSION ===');
  console.log('Item:', this.itemName);
  console.log('Inventory Unit:', this.unit);
  console.log('Deduction Unit:', targetUnit);
  console.log('Quantity to Deduct:', quantityToDeduct);
  
  // Check unit compatibility
  if (!areUnitsCompatible(this.unit, targetUnit)) {
    console.error(`Unit mismatch: Cannot deduct ${targetUnit} from ${this.unit}`);
    return false;
  }
  
  // Convert deduction quantity to base unit (gm/ml/pcs)
  const deductionInBaseUnit = convertToBaseUnit(quantityToDeduct, targetUnit);
  console.log('Deduction in Base Unit:', deductionInBaseUnit);
  
  // Convert inventory unit to base unit for comparison
  const inventoryBaseUnit = normalizeUnit(this.unit);
  console.log('Inventory Base Unit:', inventoryBaseUnit);
  
  let remainingInBaseUnit = deductionInBaseUnit;
  const tolerance = 0.001; // Small tolerance for floating point precision
  
  // Sort to ensure FIFO (oldest first)
  this.supplierStocks.sort((a, b) => a.purchasedAt - b.purchasedAt);
  
  // Track deduction for logging
  const deductions = [];
  
  for (let stock of this.supplierStocks) {
    if (remainingInBaseUnit <= tolerance) break;
    if (stock.isFullyUsed) continue;
    
    // Convert stock's remaining quantity to base unit
    const stockInBaseUnit = convertToBaseUnit(stock.remainingQuantity, this.unit);
    console.log(`  Supplier: ${stock.supplierName}, Available: ${stockInBaseUnit} (base unit)`);
    
    if (stockInBaseUnit >= remainingInBaseUnit) {
      // This stock can cover the remaining deduction
      const deductFromThisStock = convertFromBaseUnit(remainingInBaseUnit, this.unit);
      
      stock.remainingQuantity -= deductFromThisStock;
      stock.usedQuantity += deductFromThisStock;
      
      deductions.push({
        supplier: stock.supplierName,
        deducted: deductFromThisStock,
        unit: this.unit
      });
      
      console.log(`  Deducted: ${deductFromThisStock} ${this.unit}`);
      
      // Check if stock is fully used (with tolerance)
      if (stock.remainingQuantity <= tolerance) {
        stock.remainingQuantity = 0;
        stock.isFullyUsed = true;
        console.log(`  Stock fully used`);
      }
      
      remainingInBaseUnit = 0;
    } else {
      // Use all remaining stock from this supplier
      const usedFromThisStock = stock.remainingQuantity;
      
      stock.usedQuantity += usedFromThisStock;
      stock.remainingQuantity = 0;
      stock.isFullyUsed = true;
      
      deductions.push({
        supplier: stock.supplierName,
        deducted: usedFromThisStock,
        unit: this.unit
      });
      
      console.log(`  Deducted all: ${usedFromThisStock} ${this.unit}`);
      console.log(`  Stock fully used`);
      
      remainingInBaseUnit -= stockInBaseUnit;
    }
  }
  
  // Check if we successfully deducted all required stock
  if (remainingInBaseUnit > tolerance) {
    console.error(`Insufficient stock. Remaining to deduct: ${remainingInBaseUnit} (base unit)`);
    return false;
  }
  
  // Update totals (convert deduction back to inventory unit for accurate totals)
  const actualDeducted = convertFromBaseUnit(deductionInBaseUnit, this.unit);
  this.totalUsedQuantity += actualDeducted;
  this.totalRemainingQuantity -= actualDeducted;
  
  console.log('Deduction Summary:');
  deductions.forEach(d => console.log(`  - ${d.supplier}: ${d.deducted} ${d.unit}`));
  console.log('Total Remaining:', this.totalRemainingQuantity, this.unit);
  console.log('=== DEDUCTION COMPLETE ===\n');
  
  return true;
};

/**
 * Recalculate all total quantities from supplier stocks
 */
inventorySchema.methods.recalculateTotals = function() {
  this.totalQuantity = this.supplierStocks.reduce((sum, stock) => 
    sum + (stock.purchasedQuantity || 0), 0
  );
  
  this.totalRemainingQuantity = this.supplierStocks.reduce((sum, stock) => 
    sum + (stock.remainingQuantity || 0), 0
  );
  
  this.totalUsedQuantity = this.supplierStocks.reduce((sum, stock) => 
    sum + (stock.usedQuantity || 0), 0
  );
  
  this.totalAmount = this.supplierStocks.reduce((sum, stock) => 
    sum + (stock.totalAmount || 0), 0
  );
  
  return this;
};

// Virtual to get active supplier stocks (not fully used)
inventorySchema.virtual('activeSupplierStocks').get(function() {
  return this.supplierStocks.filter(stock => !stock.isFullyUsed);
});

const Inventory = mongoose.model("Inventory", inventorySchema);

module.exports = Inventory;
// const mongoose = require("mongoose");

// const supplierStockSchema = new mongoose.Schema({
//   supplierId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Supplier",
//     required: true,
//   },
//   supplierName: {
//     type: String,
//     required: true,
//   },
//   purchasedQuantity: {
//     type: Number,
//     required: true,
//     default: 0,
//   },
//   remainingQuantity: {
//     type: Number,
//     required: true,
//     default: 0,
//   },
//   usedQuantity: {
//     type: Number,
//     default: 0,
//   },
//   pricePerUnit: {
//     type: Number,
//     required: true,
//     default: 0,
//   },
//   totalAmount: {
//     type: Number,
//     required: true,
//     default: 0,
//   },
//   purchasedAt: {
//     type: Date,
//     default: Date.now,
//   },
//   isFullyUsed: {
//     type: Boolean,
//     default: false,
//   },
// });

// const inventorySchema = new mongoose.Schema(
//   {
//     itemName: {
//       type: String,
//       required: true,
//       trim: true,
//       lowercase: true,
//     },
//     unit: {
//       type: String,
//       required: true,
//       enum: ["kg", "gm", "ltr", "ml", "pcs", "mg"],
//     },
//     restaurantId: {
//       type: String,
//       required: true,
//     },
//     // Aggregate stock information
//     totalQuantity: {
//       type: Number,
//       default: 0,
//     },
//     totalUsedQuantity: {
//       type: Number,
//       default: 0,
//     },
//     totalRemainingQuantity: {
//       type: Number,
//       default: 0,
//     },
//     totalAmount: {
//       type: Number,
//       default: 0,
//     },
//     // Array of supplier stocks (FIFO order maintained by purchasedAt)
//     supplierStocks: [supplierStockSchema],
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//     deletedTime: {
//       type: Date,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Method to add stock from a supplier
// inventorySchema.methods.addSupplierStock = function(supplierData) {
//   const newStock = {
//     supplierId: supplierData.supplierId,
//     supplierName: supplierData.supplierName,
//     purchasedQuantity: supplierData.quantity,
//     remainingQuantity: supplierData.quantity,
//     usedQuantity: 0,
//     pricePerUnit: supplierData.pricePerUnit,
//     totalAmount: supplierData.quantity * supplierData.pricePerUnit,
//     purchasedAt: new Date(),
//     isFullyUsed: false,
//   };

//   this.supplierStocks.push(newStock);
  
//   // Update totals
//   this.totalQuantity += supplierData.quantity;
//   this.totalRemainingQuantity += supplierData.quantity;
//   this.totalAmount += newStock.totalAmount;
  
//   // Sort by purchasedAt to maintain FIFO
//   this.supplierStocks.sort((a, b) => a.purchasedAt - b.purchasedAt);
  
//   return this;
// };

// // Method to deduct stock using FIFO
// inventorySchema.methods.deductStock = function(quantityToDeduct) {
//   let remainingToDeduct = quantityToDeduct;
  
//   // Sort to ensure FIFO (oldest first)
//   this.supplierStocks.sort((a, b) => a.purchasedAt - b.purchasedAt);
  
//   for (let stock of this.supplierStocks) {
//     if (remainingToDeduct <= 0) break;
//     if (stock.isFullyUsed) continue;
    
//     if (stock.remainingQuantity >= remainingToDeduct) {
//       // This supplier has enough stock
//       stock.remainingQuantity -= remainingToDeduct;
//       stock.usedQuantity += remainingToDeduct;
//       remainingToDeduct = 0;
      
//       if (stock.remainingQuantity === 0) {
//         stock.isFullyUsed = true;
//       }
//     } else {
//       // Use all remaining stock from this supplier
//       remainingToDeduct -= stock.remainingQuantity;
//       stock.usedQuantity += stock.remainingQuantity;
//       stock.remainingQuantity = 0;
//       stock.isFullyUsed = true;
//     }
//   }
  
//   // Update totals
//   this.totalUsedQuantity += quantityToDeduct;
//   this.totalRemainingQuantity -= quantityToDeduct;
  
//   return remainingToDeduct === 0;
// };

// // Virtual to get active supplier stocks (not fully used)
// inventorySchema.virtual('activeSupplierStocks').get(function() {
//   return this.supplierStocks.filter(stock => !stock.isFullyUsed);
// });

// const Inventory = mongoose.model("Inventory", inventorySchema);

// module.exports = Inventory;

// const mongoose = require("mongoose");

// const inventorySchema = new mongoose.Schema(
//   {
//     itemName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     stock: {
//       amount: {
//         type: Number,
//         required: true,
//       },
//       quantity: {
//         type: Number,
//         required: true,
//       },
//       total:{
//         type:Number,
//       },
//       totalQuantity: {
//         type: Number,
//         default: 0,
//       },
//       purchasedAt: {
//         type: Date,
//         default: Date.now,
//       },
//     },
//     //  Changed to suppliers array instead of single supplier
//     suppliers: [{
//       supplierName: {
//         type: String,
//         required: true,
//         trim: true,
//       },
//       supplierId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Supplier",
//         required: true,
//       },
//       quantity: {
//         type: Number,
//         required: true,
//       },
//       amount: {
//         type: Number,
//         required: true,
//       },
//       total: {
//         type: Number,
//       },
//       purchasedAt: {
//         type: Date,
//         default: Date.now,
//       }
//     }],
//     restaurantId: {
//       type: String,
//       required: true,
//     },
//     unit: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     isDeleted: {
//       type: Boolean,
//       default: false,
//     },
//     deletedTime: {
//       type: Date,
//     },
//   },
//   { timestamps: true }
// );

// // ✅ Virtual for supplier population
// inventorySchema.virtual("supplier", {
//   ref: "Supplier",
//   localField: "suppliers.supplierId",
//   foreignField: "_id",
//   justOne: false,
// });


// const Inventory = mongoose.model("Inventory", inventorySchema);
// module.exports = Inventory;