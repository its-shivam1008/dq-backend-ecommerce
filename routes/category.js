const express = require('express');
const router = express.Router();
const Category = require('../model/Category');
const User = require('../model/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/authMiddleware');
const { uploadBufferToCloudinary } = require('../utils/cloudinary');



// ---------- Multer setup ----------
// Use memory storage to avoid filesystem writes on serverless platforms
const upload = multer({ storage: multer.memoryStorage() });

// ---------- CREATE CATEGORY ----------
router.post(
  '/category',
  authMiddleware,
  upload.single('categoryImage'),
  async (req, res) => {
    try {
      const restaurantId = req.user.restaurantId;
      const { categoryName, basePrice, description, size } = req.body;

      console.log("Request Body:", req.body);
      console.log("Uploaded File:", req.file);

      if (!categoryName || !req.file) {
        return res.status(400).json({ message: 'categoryName and categoryImage are required' });
      }

      // Upload to Cloudinary, with base64 fallback if not configured or fails
      let categoryImage;
      const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
      if (hasCloudinary) {
        try {
          const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'act-resto/categories',
            resource_type: 'image',
          });
          categoryImage = uploaded.secure_url || uploaded.url;
        } catch (err) {
          console.error('Cloudinary upload failed, falling back to base64:', err);
          const base64 = req.file.buffer.toString('base64');
          const mime = req.file.mimetype || 'image/jpeg';
          categoryImage = `data:${mime};base64,${base64}`;
        }
      } else {
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'image/jpeg';
        categoryImage = `data:${mime};base64,${base64}`;
      }

      const newCategory = new Category({
        categoryName,
        categoryImage,
        restaurantId,
        basePrice,
        description,
        size,
      });

      await newCategory.save();

      console.log("New Category Saved:", newCategory);
      res.status(201).json(newCategory);
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ message: err.message || 'Server error' });
    }
  }
);

router.get('/categories', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    // Get restaurantId from query parameter first, then fallback to env
    const queryRestaurantId = req.query.restaurantId;
    const envRestaurantId = process.env.RESTAURENT_ID;
    const targetRestaurantId = queryRestaurantId || envRestaurantId;

    // First, let's check all categories to debug
    const allCategories = await Category.find({ isDeleted: false });
    console.log('All categories in database:', allCategories.length);
    console.log('Sample category:', allCategories[0]);

    let filter = { isDeleted: false };
    if (targetRestaurantId) {
      // Try multiple approaches to match the restaurantId
      const orConditions = [
        { restaurantId: targetRestaurantId },
        { restaurantId: new mongoose.Types.ObjectId(targetRestaurantId) }
      ];
      
      // Also check if restaurantId field exists at all
      if (allCategories.length > 0 && !allCategories[0].restaurantId) {
        console.log('Categories exist but no restaurantId field found');
        // If no restaurantId field exists, return all categories
        filter = { isDeleted: false };
      } else {
        filter.$or = orConditions;
      }
    }

    console.log('Categories filter:', filter);
    const categories = await Category.find(filter);
    console.log('Found categories:', categories.length);
    res.json({ data: categories });
  } catch (err) {
    console.error('Categories API error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// ---------- GET CATEGORY BY ID ----------
router.get('/category/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.json({ data: category });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- UPDATE CATEGORY ----------
router.post('/category/update/:id', upload.single('categoryImage'), async (req, res) => {
  try {
    const { categoryName, restaurantId } = req.body;
    const updateData = {};
    if (categoryName) updateData.categoryName = categoryName;
    if (restaurantId) updateData.restaurantId = restaurantId;
    if (req.file && req.file.buffer) {
      const hasCloudinary = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
      if (hasCloudinary) {
        try {
          const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
            folder: 'act-resto/categories',
            resource_type: 'image',
          });
          updateData.categoryImage = uploaded.secure_url || uploaded.url;
        } catch (err) {
          console.error('Cloudinary upload failed, falling back to base64:', err);
          const base64 = req.file.buffer.toString('base64');
          const mime = req.file.mimetype || 'image/jpeg';
          updateData.categoryImage = `data:${mime};base64,${base64}`;
        }
      } else {
        const base64 = req.file.buffer.toString('base64');
        const mime = req.file.mimetype || 'image/jpeg';
        updateData.categoryImage = `data:${mime};base64,${base64}`;
      }
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- DELETE CATEGORY ----------
router.delete('/delete/category/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Remove image if you want on delete
    if (category.categoryImage && fs.existsSync(category.categoryImage)) {
      fs.unlinkSync(category.categoryImage);
    }

    category.isDeleted = true;
    await category.save();

    res.json({ message: 'Category marked as deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
})

module.exports = router;
