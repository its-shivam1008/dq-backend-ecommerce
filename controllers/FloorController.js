const Floor = require("../model/Floor");
const QrCode = require("../model/QrCode");

// ✅ Add new floor
exports.addFloor = async (req, res) => {
  try {
    const { id } = req.params;  
    const { name } = req.body;

    if (!id || !name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID and floor name are required"
      });
    }

    const floor = new Floor({
      restaurantId: id,  // ✅ use param id as restaurantId
      name: name.trim()
    });

    const savedFloor = await floor.save();

    return res.status(201).json({
      success: true,
      data: savedFloor,
      message: "Floor created successfully"
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Floor with this name already exists for this restaurant"
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create floor"
    });
  }
};



// ✅ Get all floors for a restaurant
exports.getFloors = async (req, res) => {
  try {
    console.log('🔍 Floor API Debug:');
    console.log('req.params.restaurantId:', req.params.restaurantId);
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

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    const floors = await Floor.find({ restaurantId });
    res.status(200).json({ success: true, data: floors });
  } catch (error) {
    console.error("Get floors error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Count tables per floor
exports.countTablesPerFloor = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const stats = await QrCode.aggregate([
      { $match: { restaurantId: require("mongoose").Types.ObjectId(restaurantId) } },
      {
        $group: {
          _id: "$floorId",
          totalTables: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
