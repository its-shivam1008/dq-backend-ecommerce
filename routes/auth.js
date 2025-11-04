const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const {authMiddleware} = require('../middleware/authMiddleware')

router.post("/signup", AuthController.signup);
router.post("/signin", AuthController.login);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/forgot-password", AuthController.forgotPassword);
router.post('/reset-password' , AuthController.resetOtp);
router.post("/logout", authMiddleware, AuthController.logout);
router.post("/force-logout", AuthController.forceLogoutByUserId);
router.get("/user-profile/:userId", authMiddleware, AuthController.getUserProfile);
router.get('/rest-profile/:restaurantId' , authMiddleware , AuthController.getRestaurantProfile)
router.get('/getall/user', authMiddleware , AuthController.getAllUsers)
router.put('/users/role/:id/', authMiddleware, AuthController.updateUserRole);

module.exports = router;