// routes/customerSettings.js
const express = require("express");
const router = express.Router();

const {getCustomerSettings,createCustomerSettings}= require("../controllers/CustomerSettingsController.js"); 

// GET customer settings
router.get("/", getCustomerSettings);

// POST create customer settings
router.post("/", createCustomerSettings);

// // PUT update customer settings
// router.put("/", CustomerSettingsController.updateCustomerSettings);

// // DELETE customer settings
// router.delete("/", CustomerSettingsController.deleteCustomerSettings);

module.exports = router;
