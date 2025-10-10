const Banner = require("../model/Banner");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const uploadsDir = "uploads/banners";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ⚡ Configure multer inside controller
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // folder where files are stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "banner_1", maxCount: 1 },
  { name: "banner_2", maxCount: 1 },
  { name: "banner_3", maxCount: 1 },
]);

// Helper function to get full image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/${imagePath.replace(/\\/g, '/')}`;
};

// ✅ Get all banners (No Auth)
exports.getBanners = async (req, res) => {
  try {
    console.log('Get banners request received');
    
    const restaurantIdParam = req.query.restaurantId;
    const restaurantId = restaurantIdParam || process.env.RESTAURENT_ID;
    
    let banners;
    if (restaurantId) {
      banners = await Banner.find({ restaurantId });
      console.log(`Found ${banners.length} banners for restaurant ${restaurantId}`);
    } else {
      banners = await Banner.find({});
      console.log(`Found ${banners.length} total banners (no restaurant filter applied)`);
    }
    
    // Convert file paths to full URLs
    const bannersWithUrls = banners.map(banner => ({
      ...banner.toObject(),
      banner_1: getImageUrl(banner.banner_1),
      banner_2: getImageUrl(banner.banner_2),
      banner_3: getImageUrl(banner.banner_3),
    }));

    res.status(200).json({ success: true, data: bannersWithUrls });
  } catch (error) {
    console.error("Get banners error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Create Banner (No Auth)
exports.createBanner = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      console.log('Create banner request received');
      console.log('Files:', req.files);
      console.log('Body:', req.body);
      
      // Use a default restaurantId if none provided
      const restaurantId = req.body.restaurantId || 'default-restaurant';

      const bannerData = {
        restaurantId,
        banner_1: req.files?.banner_1 ? req.files.banner_1[0].path : null,
        banner_2: req.files?.banner_2 ? req.files.banner_2[0].path : null,
        banner_3: req.files?.banner_3 ? req.files.banner_3[0].path : null,
      };

      console.log('Banner data to save:', bannerData);

      if (!bannerData.banner_1) {
        return res.status(400).json({ success: false, message: "banner_1 is required" });
      }

      const banner = new Banner(bannerData);
      await banner.save();

      console.log('Banner saved successfully:', banner._id);

      // Convert file paths to URLs before sending response
      const bannerWithUrls = {
        ...banner.toObject(),
        banner_1: getImageUrl(banner.banner_1),
        banner_2: getImageUrl(banner.banner_2),
        banner_3: getImageUrl(banner.banner_3),
      };

      res.status(201).json({ success: true, data: bannerWithUrls });
    } catch (error) {
      console.error("Create banner error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
};

// ✅ Update Banner (No Auth)
exports.updateBanner = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { id } = req.params;
      console.log('Update banner request for ID:', id);
      console.log('Files:', req.files);
      console.log('Body:', req.body);

      // Find existing banner
      const existingBanner = await Banner.findById(id);
      if (!existingBanner) {
        return res.status(404).json({ success: false, message: "Banner not found" });
      }

      let updateData = {};

      // Handle restaurantId
      if (req.body.restaurantId) {
        if (!mongoose.Types.ObjectId.isValid(req.body.restaurantId)) {
          return res.status(400).json({ 
            success: false, 
            message: "Invalid restaurantId format. Must be a valid MongoDB ObjectId." 
          });
        }
        updateData.restaurantId = req.body.restaurantId;
      } else {
        updateData.restaurantId = existingBanner.restaurantId;
      }

      // Handle banner_1
      if (req.files?.banner_1) {
        updateData.banner_1 = req.files.banner_1[0].path;
      } else if (req.body.banner_1_url && req.body.banner_1_url !== 'undefined') {
        updateData.banner_1 = req.body.banner_1_url;
      } else {
        updateData.banner_1 = existingBanner.banner_1; // Keep existing
      }

      // Handle banner_2
      if (req.files?.banner_2) {
        updateData.banner_2 = req.files.banner_2[0].path;
      } else if (req.body.banner_2_url && req.body.banner_2_url !== 'undefined') {
        updateData.banner_2 = req.body.banner_2_url;
      } else {
        updateData.banner_2 = existingBanner.banner_2; // Keep existing
      }

      // Handle banner_3
      if (req.files?.banner_3) {
        updateData.banner_3 = req.files.banner_3[0].path;
      } else if (req.body.banner_3_url && req.body.banner_3_url !== 'undefined') {
        updateData.banner_3 = req.body.banner_3_url;
      } else {
        updateData.banner_3 = existingBanner.banner_3; // Keep existing
      }

      console.log('Update data:', updateData);

      const updatedBanner = await Banner.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      // Convert file paths to URLs
      const bannerWithUrls = {
        ...updatedBanner.toObject(),
        banner_1: getImageUrl(updatedBanner.banner_1),
        banner_2: getImageUrl(updatedBanner.banner_2),
        banner_3: getImageUrl(updatedBanner.banner_3),
      };

      console.log('Banner updated successfully');
      res.status(200).json({ success: true, data: bannerWithUrls });
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
    console.log('Delete banner request for ID:', id);

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
          console.log('Deleted file:', imagePath);
        } catch (fileErr) {
          console.error('Error deleting file:', imagePath, fileErr);
        }
      }
    });

    console.log('Banner deleted successfully');
    res.status(200).json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    console.error("Delete banner error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};