const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");


const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary storage

// Upload API
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { type } = req.body; 
    let folder = "mMenu"; 

    if (type === "category") folder = "category";
    if (type === "banner") folder = "Banner";

    
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder, // <-- Cloudinary folder
      public_id: `${Date.now()}-${req.file.originalname.split(".")[0]}`,
    });

   
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      folder: result.folder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
