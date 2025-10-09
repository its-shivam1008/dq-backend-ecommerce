const express = require("express");
const router = express.Router();
const socialController = require("../controllers/SocialMediaController");
const {authMiddleware} = require("../middleware/authMiddleware");

// Public routes
router.get("/", socialController.index);
router.get("/:id", socialController.show);

// Protected routes
router.post("/", authMiddleware, socialController.store);
router.put("/:id", authMiddleware, socialController.update);
router.delete("/:id", authMiddleware, socialController.destroy);

module.exports = router;
