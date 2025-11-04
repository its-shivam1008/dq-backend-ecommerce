const QrCode = require("../model/QrCode");
const Floor = require("../model/Floor");
const { generateQRCode } = require('../utils/qrCodeGenerator');
// Create QR for a table
exports.addTable = async (req, res) => {
  try {
    const { restaurantId, floorId, tableNumber } = req.body;
    // ... validation code ...
    // const qrData = `${process.env.FRONTEND_URL}/table/${restaurantId}/${floorId}/${tableNumber}`;
    const qrData = `${process.env.FRONTEND_URL}/table?restaurantId=${restaurantId}&floorId=${floorId}&tableNumber=${tableNumber}`
    const qrImage = await generateQRCode(qrData);

    const isTableAlreadyPresent = await QrCode.findOne({restaurantId, tableNumber})

    if(isTableAlreadyPresent) return res.status(400).json({ success: false, message: "QR with this name is already present in this restaurant" });

    const qrCode = new QrCode({
      restaurantId,
      floorId,
      tableNumber,
      qrImage
    });

    const savedQrCode = await qrCode.save();
    res.status(201).json({ success: true, data: savedQrCode });
  } catch (error) {
    console.error("addTable error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Table already exists on this floor"
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get all QR codes (with optional filters)
exports.getQrs = async (req, res) => {
  try {
    console.log('🔍 QR API Debug:');
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

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: "Restaurant ID is required"
      });
    }

    const { floorId } = req.query;

    let filter = { restaurantId };
    if (floorId) filter.floorId = floorId;

    const qrs = await QrCode.find(filter).populate("floorId");

    res.status(200).json({ success: true, data: qrs });
  } catch (error) {
    console.error("getQrs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get QR by ID
exports.getQrById = async (req, res) => {
  try {
    const qr = await QrCode.findById(req.params.id).populate("floorId");
    if (!qr) {
      return res.status(404).json({ success: false, message: "QR not found" });
    }
    res.status(200).json({ success: true, data: qr });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete QR
exports.deleteQr = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ Delete QR request received for ID:", id);
    console.log("📋 Request params:", req.params);
    console.log("👤 User ID:", req.userId);

    if (!id) {
      console.error("❌ No ID provided in request");
      return res.status(400).json({ success: false, message: "QR ID is required" });
    }

    const qr = await QrCode.findByIdAndDelete(id);
    
    if (!qr) {
      console.error("❌ QR not found with ID:", id);
      return res.status(404).json({ success: false, message: "QR not found" });
    }

    console.log("✅ QR deleted successfully:", qr._id);
    res.status(200).json({ success: true, message: "QR deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting QR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get tables by floor
exports.getTablesByFloor = async (req, res) => {
  try {
    const { floorId } = req.params;
    const tables = await QrCode.find({ floorId }).populate("floorId");
    res.status(200).json({ success: true, data: tables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Count tables per floor (per restaurant)
exports.countTablesPerFloor = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const stats = await QrCode.aggregate([
      { $match: { restaurantId: require("mongoose").Types.ObjectId(restaurantId) } },
      { $group: { _id: "$floorId", totalTables: { $sum: 1 } } },
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// const QRCode = require("qrcode");
// const Qr = require("../model/QrCode");

// // Generate QR Code for a URL/Text
// exports.generateQr = async (req, res) => {
//   try {
//     const { tableNumber, restaurantId, qrCodeUrl } = req.body;

//     if (!tableNumber || !restaurantId) {
//       return res.status(400).json({ message: "Table number and restaurant ID are required" });
//     }

//     const qrContent = qrCodeUrl || `${tableNumber}`;
//     const qrImage = await QRCode.toDataURL(qrContent);

//     // ✅ use Qr (the imported model), not QrCode
//     const qrCode = await Qr.create({
//       restaurantId,
//       tableNumber,
//       qrImage,
//       qrCodeUrl: qrCodeUrl || null,
//     });

//     res.status(201).json(qrCode);
//   } catch (error) {
//     console.error("QR generation error:", error);
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// // Get all QR Codes
// exports.getQrs = async (req, res) => {
//   try {
//     const qrs = await Qr.find();
//     res.json({ data: qrs });
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching QR codes", error: err.message });
//   }
// };


// // Get QR Code by ID
// exports.getQrById = async (req, res) => {
//   try {
//     const qr = await Qr.findById(req.params.id);
//     if (!qr) return res.status(404).json({ message: "QR Code not found" });
//     res.json({ data: qr });
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching QR code", error: err.message });
//   }
// };

// // Delete QR Code
// exports.deleteQr = async (req, res) => {
//   try {
//     const qr = await Qr.findByIdAndDelete(req.params.id);
//     if (!qr) return res.status(404).json({ message: "QR Code not found" });
//     res.json({ message: "QR Code deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: "Error deleting QR code", error: err.message });
//   }
// };