const express = require("express");
const router = express.Router();
const {authMiddleware} = require('../middleware/authMiddleware')
const {
  checkRestaurantPermission,
  // deleteProfile,
  getProfile,
  updateProfile,
  getAllUsers
} = require('../controllers/UserProfile')
// ------------------- ROUTES -------------------

// router.post("/create", createProfile);
// router.get("/all", getAllProfiles);

router.get("/account/:userId",authMiddleware , getProfile);
router.get('/all/users' , authMiddleware , getAllUsers)
router.put("/user/update/:userId",authMiddleware , updateProfile);

// router.delete("/user/delete/:userId",authMiddleware , deleteProfile);

router.get('/check-permission/:userId', authMiddleware, checkRestaurantPermission, (req, res) => {
  res.json({ 
    message: "Permission granted", 
    user: req.userProfile 
  });
});


module.exports = router;
