const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware")
const {
  createCoupon,
  getCoupons,
  getCouponById,
  validateCouponByCode,
  applyCoupon,
  updateCoupon,
  deleteCoupon,
} = require("../controllers/CoupenController");

const router = express.Router();

// ⚡ Order matters: fixed routes before dynamic
router.post("/create/coupen", authMiddleware, createCoupon);
router.get("/all/coupons", authMiddleware, getCoupons);
router.post("/validate", authMiddleware, validateCouponByCode);
router.get("/:id", authMiddleware, getCouponById);
router.post("/apply", authMiddleware, applyCoupon);
router.put("/coupon/update/:id", authMiddleware, updateCoupon);
router.delete("/coupon/delete/:id", authMiddleware, deleteCoupon);

module.exports = router;