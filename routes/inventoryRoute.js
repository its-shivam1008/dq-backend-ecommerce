const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/InventoryController');
const { authMiddleware } = require('../middleware/authMiddleware'); // Adjust path as needed

// ==================== INVENTORY MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/stock/inventories
 * @desc    Get all inventories for a restaurant with supplier details
 * @access  Private (requires authentication)
 * @query   restaurantId (optional, will use from auth if not provided)
 */
router.get('/stock/inventories', authMiddleware, inventoryController.getInventory);

/**
 * @route   GET /api/inventory/:id
 * @desc    Get single inventory item by ID with full details
 * @access  Private
 * @params  id - Inventory item ID
 */
router.get('/inventory/:id', authMiddleware, inventoryController.getInventoryById);

/**
 * @route   GET /api/supplier-stock-details/:id
 * @desc    Get detailed supplier stock breakdown with FIFO order
 * @access  Private
 * @params  id - Inventory item ID
 * @returns Supplier-wise purchase details, usage stats, FIFO order
 */
router.get('/supplier-stock-details/:id', authMiddleware, inventoryController.getSupplierStockDetails);

/**
 * @route   POST /api/create/adding/inventories
 * @desc    Purchase stock from a supplier (creates new or adds to existing)
 * @access  Private
 * @body    {
 *            itemName: string,
 *            unit: string ('kg', 'gm', 'ltr', 'ml', 'pcs', 'mg'),
 *            restaurantId: string,
 *            supplierId: string,
 *            quantity: number,
 *            pricePerUnit: number
 *          }
 */
router.post('/create/adding/inventories', authMiddleware, inventoryController.addInventory);

/**
 * @route   PUT /api/update/:id
 * @desc    Update inventory item (only unit can be changed)
 * @access  Private
 * @params  id - Inventory item ID
 * @body    { unit: string }
 */
router.put('/update/stock/:id', authMiddleware, inventoryController.updateInventory);

/**
 * @route   DELETE /api/delete/:id
 * @desc    Soft delete inventory item
 * @access  Private
 * @params  id - Inventory item ID
 */
router.delete('/delete/:id', authMiddleware, inventoryController.deleteInventory);

/**
 * @route   POST /api/deduct-stock
 * @desc    Deduct stock using FIFO method (oldest supplier first)
 * @access  Private
 * @body    {
 *            itemId: string,
 *            quantityToDeduct: number
 *          }
 */
router.post('/deduct-stock', authMiddleware, inventoryController.deductStock);

/**
 * @route   POST /api/batch-deduct-stock
 * @desc    Deduct stock for multiple items at once (for order processing)
 * @access  Private
 * @body    {
 *            items: [
 *              {
 *                itemId: string,
 *                quantityToDeduct: number,
 *                itemName: string (optional, for error reporting)
 *              }
 *            ]
 *          }
 */
router.post('/batch-deduct-stock', authMiddleware, inventoryController.batchDeductStock);

// Fix missing units route removed - no auto-fix needed

// ==================== EXPORT ROUTER ====================
module.exports = router;

// const express = require("express");
// const router = express.Router();
// const inventoryController = require("../controllers/InventoryController");
// const {authMiddleware} = require("../middleware/authMiddleware");


// router.post("/create/adding/inventories", authMiddleware, inventoryController.addInventory);
// router.get("/stock/inventories", authMiddleware, inventoryController.getInventory);
// router.get("/:id", authMiddleware, inventoryController.getInventoryById);
// router.put("/update/:id", authMiddleware, inventoryController.updateInventory);
// router.delete("/delete/:id", authMiddleware, inventoryController.deleteInventory);
// router.patch("/:id/stock", authMiddleware, inventoryController.updateStock);

// module.exports = router;