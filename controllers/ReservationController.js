const Reservation = require("../model/Reservation");
const Table = require("../model/Table");

async function listAllTables(restaurantId) {
  // Try DB tables; fallback to T1..T20 if none exist
  try {
    const rows = await Table.find({ restaurantId }).select("tableNumber").lean();
    if (rows?.length) return rows.map(r => r.tableNumber);
  } catch (_) {}
  return Array.from({ length: 20 }, (_, i) => `T${i + 1}`);
}

async function computeBookedTables(restaurantId, start, end) {
  const overlaps = await Reservation.find({
    restaurantId,
    startTime: { $lt: end },
    endTime: { $gt: start },
  }).select("tableNumber").lean();
  return new Set((overlaps || []).map(r => r.tableNumber).filter(Boolean));
}

// 📌 Create Reservation (auto-assign or validate table)
exports.createReservation = async (req, res) => {
  try {
    const {
      restaurantId,
      customerId,
      startTime,
      endTime,
      customerName,
      tableNumber,
      advance,
      payment,
      notes,
    } = req.body;

    if (!restaurantId) return res.status(400).json({ message: "restaurantId is required" });
    if (!startTime || !endTime) return res.status(400).json({ message: "startTime and endTime are required" });

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid startTime or endTime" });
    }\r
    if (start >= end) {
      return res.status(400).json({ message: "endTime must be after startTime" });
    }

    // Get full table list and current bookings for the time window
    const allTables = await listAllTables(restaurantId);
    const booked = await computeBookedTables(restaurantId, start, end);
    const available = allTables.filter(t => !booked.has(t));

    // Determine which table to use
    let selectedTable = tableNumber;
    if (!selectedTable || !selectedTable.trim()) {
      // Auto-assign first available table
      selectedTable = available[0];
      if (!selectedTable) {
        return res.status(409).json({
          success: false,
          message: "No tables available for the selected time window",
          bookedTables: Array.from(booked),
        });
      }
    } else {
      // Validate requested table is available
      if (!allTables.includes(selectedTable)) {
        return res.status(400).json({
          success: false,
          message: `Invalid tableNumber '${selectedTable}'`,
          availableTables: available,
        });
      }
      if (booked.has(selectedTable)) {
        return res.status(409).json({
          success: false,
          message: `Table ${selectedTable} is already booked in this time window`,
          availableTables: available,
          bookedTables: Array.from(booked),
        });
      }
    }

    const reservation = new Reservation({
      restaurantId,
      customerId,
      customerName,
      startTime: start,
      endTime: end,
      tableNumber: selectedTable,
      advance,
      payment,
      notes,
    });

    await reservation.save();
    return res.status(201).json({
      success: true,
      message: "Reservation created successfully",
      reservation,
      assignedTable: selectedTable,
    });
  } catch (err) {
    console.log("Error", err);
    res.status(500).json({ message: "Error creating reservation", error: err.message });
  }
};

// 📌 Get all reservations (Admin/Manager)
exports.getAllReservations = async (req, res) => {
  try {
    const restaurantId = req.query.restaurantId || req.userId;

    console.log("🔍 Searching for reservations with restaurantId:", restaurantId);

    // Populate customer data if you have a reference
    const reservations = await Reservation.find({ restaurantId })
      .populate('customerId', 'name phoneNumber address') // Adjust field names as per your Customer model
      .exec();

    console.log("📊 Found reservations:", reservations.length);

    // Transform data to match frontend expectations
    const transformedReservations = reservations.map(reservation => ({
      _id: reservation._id,
      id: reservation._id,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      payment: reservation.payment,
      advance: reservation.advance,
      notes: reservation.notes,
      tableNumber: reservation.tableNumber,
      customerId: reservation.customerId?._id || reservation.customerId,
      customerName: reservation.customerId?.name || reservation.customerName || 'N/A',
      customerPhoneNumber: reservation.customerId?.phoneNumber || 'N/A',
      customerAddress: reservation.customerId?.address || 'N/A',
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt
    }));

    res.json({ reservations: transformedReservations });
  } catch (err) {
    console.log(err, "reservation err");
    res.status(500).json({
      message: "Error fetching reservations",
      error: err.message,
    });
  }
};

// 📌 Update reservation (change date/time/guests)
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove undefined values and convert dates properly
    const cleanUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        cleanUpdateData[key] = updateData[key];
      }
    });

    const reservation = await Reservation.findByIdAndUpdate(
      id,
      cleanUpdateData,
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    res.json({
      success: true,
      message: "Reservation updated successfully",
      reservation
    });
  } catch (err) {
    console.log(err, "update reservation err");
    res.status(500).json({
      success: false,
      message: "Error updating reservation",
      error: err.message,
    });
  }
};

// 📌 Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await Reservation.findByIdAndDelete(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found"
      });
    }

    res.json({
      success: true,
      message: "Reservation cancelled successfully"
    });
  } catch (err) {
    console.log(err, "cancel reservation err");
    res.status(500).json({
      success: false,
      message: "Error cancelling reservation",
      error: err.message,
    });
  }
};