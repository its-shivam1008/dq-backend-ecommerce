const express = require("express");
const router = express.Router();
const { addFloor, getFloors } = require("../controllers/FloorController");
const { authMiddleware } = require('../middleware/authMiddleware');

router.post("/add/floors/:id", authMiddleware, addFloor);

// router.post("/add/floors", addFloor);
router.get("/get/floors/:restaurantId", authMiddleware, getFloors);

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const { addFloor, getFloors, countTablesPerFloor } = require("../controllers/FloorController");

// router.post("/add/floors", addFloor); // Add floor
// router.get("/get/floors/:restaurantId", getFloors); // Get all floors for a restaurant
// router.get("/:restaurantId/stats", countTablesPerFloor); // Get table count per floor

// module.exports = router;
