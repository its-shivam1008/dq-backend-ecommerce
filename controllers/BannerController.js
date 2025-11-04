const Banner = require("../model/Banner");
const multer = require('multer')
const cloudinary = require("../config/cloudinary"); // adjust path
const fs = require("fs");
const storage = multer.memoryStorage();
const streamifier = require("streamifier");
const getImageUrl = require('../utils/getImageUrl')

const upload = multer({ storage }).fields([
  { name: "banner_1", maxCount: 1 },
  { name: "banner_2", maxCount: 1 },
  { name: "banner_3", maxCount: 1 },
]);


const uploadToCloudinary = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });


exports.createBanner = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      console.log('🔍 Banner Creation Debug:');
      console.log('req.body.restaurantId:', req.body.restaurantId);
      console.log('req.userId:', req.userId);
      console.log('req.user:', req.user);
      console.log('req.user.restaurantId:', req.user?.restaurantId);
      console.log('req.user._id:', req.user?._id);
      
      // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
      const restaurantId = req.userId;
      console.log("🔍 Final restaurantId used for creation:", restaurantId);
      console.log("✅ Using ONLY restaurantId from user collection for creation");

      if (!restaurantId) {
        return res.status(400).json({
          success: false,
          message: "restaurantId is required or could not be resolved",
        });
      }

      // ✅ Upload banners to Cloudinary
      const banner_1 = req.files?.banner_1
        ? await uploadToCloudinary(req.files.banner_1[0].buffer, "banners")
        : null;
      const banner_2 = req.files?.banner_2
        ? await uploadToCloudinary(req.files.banner_2[0].buffer, "banners")
        : null;
      const banner_3 = req.files?.banner_3
        ? await uploadToCloudinary(req.files.banner_3[0].buffer, "banners")
        : null;

      if (!banner_1) {
        return res.status(400).json({
          success: false,
          message: "banner_1 is required",
        });
      }

      // ✅ Create and save banner
      const banner = new Banner({
        restaurantId,
        banner_1,
        banner_2,
        banner_3,
      });

      await banner.save();

      res.status(201).json({
        success: true,
        message: "Banner created successfully",
        data: banner,
      });
    } catch (error) {
      console.error("Create banner error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  });
};

exports.getBanners = async (req, res) => {
  try {
    console.log('🔍 Banner API Debug:');
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

    let banners;
    if (restaurantId) {
      banners = await Banner.find({ restaurantId });
    } else {
      banners = await Banner.find({});
    }

    // No need to modify URLs since Cloudinary already provides them
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Get banners error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public API to get banners by restaurantId (for customer menu)
exports.getPublicBanners = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    
    console.log("🌐 Public Banner API - restaurantId:", restaurantId);
    
    if (!restaurantId) {
      return res.status(400).json({ 
        success: false,
        message: "restaurantId is required" 
      });
    }

    const banners = await Banner.find({ restaurantId });

    console.log("✅ Public banners found:", banners.length);
    
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error("Error fetching public banners:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch banners",
      error: error.message 
    });
  }
};

exports.updateBanner = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { id } = req.params;

      const existingBanner = await Banner.findById(id);
      if (!existingBanner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }

      const updateData = {};

      // Upload new images to Cloudinary if they exist in the request
      const banner_1_url = req.files?.banner_1
        ? await uploadToCloudinary(req.files.banner_1[0].buffer, "banners")
        : req.body.banner_1_url;

      const banner_2_url = req.files?.banner_2
        ? await uploadToCloudinary(req.files.banner_2[0].buffer, "banners")
        : req.body.banner_2_url;

      const banner_3_url = req.files?.banner_3
        ? await uploadToCloudinary(req.files.banner_3[0].buffer, "banners")
        : req.body.banner_3_url;

      // Build the update object, falling back to the existing banner's image if no new one is provided
      updateData.banner_1 = banner_1_url !== 'undefined' ? banner_1_url : existingBanner.banner_1;
      updateData.banner_2 = banner_2_url !== 'undefined' ? banner_2_url : existingBanner.banner_2;
      updateData.banner_3 = banner_3_url !== 'undefined' ? banner_3_url : existingBanner.banner_3;

      const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      if (!updatedBanner) {
        return res.status(404).json({ success: false, message: "Banner not found after update" });
      }

      res.status(200).json({ success: true, data: updatedBanner });
    } catch (error) {
      console.error("Update banner error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

// ✅ Delete Banner (No Auth)
exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;


    // Find banner first
    const banner = await Banner.findById(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }

    // Delete the banner
    await Banner.findByIdAndDelete(id);

    // Optionally delete the image files from filesystem
    const imagePaths = [banner.banner_1, banner.banner_2, banner.banner_3].filter(Boolean);
    imagePaths.forEach(imagePath => {
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);

        } catch (fileErr) {
          console.error('Error deleting file:', imagePath, fileErr);
        }
      }
    });


    res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};