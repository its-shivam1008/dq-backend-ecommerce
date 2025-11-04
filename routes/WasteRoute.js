const express = require("express");
const router = express.Router();
const {
    createWasteMaterial,
    getWasteMaterials,
    // getWasteMaterialById,
    updateWasteMaterial,
    deleteWasteMaterial,
} = require("../controllers/WasteController");
router.post("/create/waste", createWasteMaterial);
router.get("/all/wastes", getWasteMaterials);
// router.get("/waste/:id", getWasteMaterialById);
router.put("/update/:id", updateWasteMaterial);
router.delete("/waste/:id", deleteWasteMaterial);
module.exports = router;
