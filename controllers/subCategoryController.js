// controllers/subCategoryController.js
const Category = require('../model/Category')
const SubCategory = require("../model/SubCategory");

// ---------------- CREATE SUBCATEGORY ----------------
exports.createSubCategory = async (req, res) => {
  try {
    console.log('🔍 SubCategory Creation Debug:');
    console.log('req.body.restaurantId:', req.body.restaurantId);
    console.log('req.userId:', req.userId);
    console.log('req.user:', req.user);
    console.log('req.user.restaurantId:', req.user?.restaurantId);
    console.log('req.user._id:', req.user?._id);
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    console.log("🔍 Final restaurantId used for creation:", restaurantId);
    console.log("✅ Using ONLY restaurantId from user collection for creation");
    
    const { sub_category_name, categoryName, categoryId } = req.body;

    if (!sub_category_name || !categoryId || !restaurantId) {
      return res.status(400).json({ message: "sub_category_name, categoryId, and restaurantId are required" });
    }

    // Check duplicate
    const existing = await SubCategory.findOne({
      sub_category_name: sub_category_name.trim(),
      categoryId,
      restaurantId,
    });

    if (existing) {
      return res.status(400).json({ message: "SubCategory already exists under this category" });
    }
    const category = await Category.findById(categoryId);
    const subCategory = new SubCategory({
      sub_category_name: sub_category_name.trim(),
      categoryName:category.categoryName,
      categoryId,
      restaurantId,
    });

    await subCategory.save();

    // ⚠️ Important: return consistent payload for Redux
    res.status(201).json({
      id: subCategory._id, // match frontend .id usage
      sub_category_name: subCategory.sub_category_name,
      categoryName: subCategory.categoryName,
      categoryId: subCategory.categoryId,
      restaurantId: subCategory.restaurantId,
    });
  } catch (error) {
    console.error("Error creating subcategory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- FETCH SUBCATEGORIES ----------------
exports.getSubCategories = async (req, res) => {
  try {
    console.log('🔍 SubCategory API Debug:');
    console.log('req.query.restaurantId:', req.query.restaurantId);
    console.log('req.userId:', req.userId);
    console.log('req.user:', req.user);
    console.log('req.user.restaurantId:', req.user?.restaurantId);
    console.log('req.user._id:', req.user?._id);
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId;
    console.log("🔍 Final restaurantId used:", restaurantId);
    console.log("🔍 restaurantId type:", typeof restaurantId);
    console.log("🔍 restaurantId toString:", restaurantId?.toString());
    console.log("✅ Using ONLY restaurantId from user collection");

    const { categoryId } = req.query;

    const filter = {};
    if (restaurantId) filter.restaurantId = restaurantId;
    if (categoryId) filter.categoryId = categoryId;

    const subCategories = await SubCategory.find(filter);

    // ✅ Return _id instead of id for consistency
    res.status(200).json(
      subCategories.map((sub) => ({
        _id: sub._id,
        sub_category_name: sub.sub_category_name,
        categoryName: sub.categoryName,
        categoryId: sub.categoryId,
        restaurantId: sub.restaurantId,
      }))
    );
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- UPDATE SUBCATEGORY ----------------
exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { sub_category_name, categoryId } = req.body;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    if (sub_category_name) subCategory.sub_category_name = sub_category_name.trim();
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (category) {
        subCategory.categoryId = categoryId;
        subCategory.categoryName = category.categoryName;
      }
    }

    await subCategory.save();

    // ✅ Return _id instead of id for consistency
    res.status(200).json({
      _id: subCategory._id,
      sub_category_name: subCategory.sub_category_name,
      categoryName: subCategory.categoryName,
      categoryId: subCategory.categoryId,
      restaurantId: subCategory.restaurantId,
    });
  } catch (error) {
    console.error("Error updating subcategory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ---------------- DELETE SUBCATEGORY ----------------
exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const subCategory = await SubCategory.findByIdAndDelete(id);
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }

    // ✅ Return _id instead of id for consistency
    res.status(200).json({ _id: id });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};