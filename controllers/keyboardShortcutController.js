const KeyboardShortcut = require('../model/KeyboardShortcut');

exports.createShortcut = async (req, res) => {
  try {
    // Added 'isActive' to the body
    const { restaurantId, action, keys, isActive } = req.body;

    if (!restaurantId || !action || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId, action, and keys are required'
      });
    }

    // Ensure the action is unique per restaurant
    const existing = await KeyboardShortcut.findOne({ restaurantId, action });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Shortcut for action "${action}" already exists for this restaurant`
      });
    }

    const shortcut = new KeyboardShortcut({
      restaurantId,
      action,
      keys,
      // Add isActive, defaulting to true if not provided
      isActive: isActive !== undefined ? isActive : true
    });
    await shortcut.save();

    res.status(201).json({
      success: true,
      message: 'Shortcut created successfully',
      data: shortcut
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ✅ Get all shortcuts for a restaurant
exports.getShortcuts = async (req, res) => {
  try {
    const { restaurantId } = req.query;

    if (!restaurantId) {
      return res.status(400).json({
        success: false,
        message: 'restaurantId is required in query'
      });
    }

    const shortcuts = await KeyboardShortcut.find({ restaurantId });
    res.status(200).json({
      success: true,
      data: shortcuts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ✅ Get a specific shortcut by ID
exports.getShortcutById = async (req, res) => {
  try {
    const shortcut = await KeyboardShortcut.findById(req.params.id);
    if (!shortcut) {
      return res.status(404).json({
        success: false,
        message: 'Shortcut not found'
      });
    }

    res.status(200).json({
      success: true,
      data: shortcut
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ✅ Update a shortcut
exports.updateShortcut = async (req, res) => {
  try {
    // Added 'isActive' to the body
    const { restaurantId, action, keys, isActive } = req.body;

    const shortcut = await KeyboardShortcut.findById(req.params.id);
    if (!shortcut) {
      return res.status(404).json({
        success: false,
        message: 'Shortcut not found'
      });
    }

    // Ensure the same restaurantId and unique action per restaurant
    if (restaurantId && action) {
      const duplicate = await KeyboardShortcut.findOne({
        restaurantId,
        action,
        _id: { $ne: req.params.id }
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another shortcut with action "${action}" already exists for this restaurant`
        });
      }
    }

    shortcut.restaurantId = restaurantId || shortcut.restaurantId;
    shortcut.action = action || shortcut.action;
    shortcut.keys = keys || shortcut.keys;

    // Add this to update the 'isActive' status
    if (typeof isActive === 'boolean') {
      shortcut.isActive = isActive;
    }

    await shortcut.save();

    res.status(200).json({
      success: true,
      message: 'Shortcut updated successfully',
      data: shortcut
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ✅ Delete a shortcut
exports.deleteShortcut = async (req, res) => {
  try {
    const shortcut = await KeyboardShortcut.findByIdAndDelete(req.params.id);

    if (!shortcut) {
      return res.status(404).json({
        success: false,
        message: 'Shortcut not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Shortcut deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};