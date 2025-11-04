const express = require("express");
const router = express.Router();
const subcategoryController = require("../controllers/subCategoryController");
const { authMiddleware } = require('../middleware/authMiddleware')

router.post("/create/subCategory", authMiddleware, subcategoryController.createSubCategory);
router.get("/data/subCategory", authMiddleware, subcategoryController.getSubCategories);
router.put("/subCategory/:id", authMiddleware, subcategoryController.updateSubCategory);
router.delete("/subCategory/:id", authMiddleware, subcategoryController.deleteSubCategory);


module.exports = router;