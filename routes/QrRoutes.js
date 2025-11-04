const express = require("express");
const router = express.Router();
const QrController = require("../controllers/QrControllers");
const { authMiddleware } = require('../middleware/authMiddleware');

router.post("/create/qrcode", authMiddleware, QrController.addTable);

router.get("/qrcodes/all", authMiddleware, QrController.getQrs);

router.delete("/delete/qrcodes/:id", authMiddleware, QrController.deleteQr);

router.get("/floor/:floorId", QrController.getTablesByFloor);

router.get("/stats/:restaurantId", QrController.countTablesPerFloor);

// Keep generic routes at the end to avoid matching specific routes
router.get("/:id", QrController.getQrById);

module.exports = router;