const express = require("express");
const router = express.Router();
const SupplierController = require("../controllers/SupplierController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Get all suppliers
router.get("/getall/suppliers", authMiddleware, SupplierController.getSuppliers);

// Create a new supplier
router.post("/create/suppliers", authMiddleware, SupplierController.createSupplier);

// Update a supplier
router.put("/suppliers/:id", authMiddleware, SupplierController.updateSupplier);

// Delete a supplier
router.delete("/suppliers/:id", authMiddleware, SupplierController.deleteSupplier);

module.exports = router;