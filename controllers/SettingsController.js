const Settings = require('../model/Settings')
const { generateResponse } = require('../utils/responseHelper')

// Helper functions for responses
const successResponse = (message, data) => generateResponse(true, message, data)
const errorResponse = (message, statusCode) => generateResponse(false, message, null, { statusCode })

// Get all settings for a restaurant
const getSettings = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400))
    }

    const settings = await Settings.find({ restaurantId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ createdAt: -1 }) // Sort by newest first

    res.json(successResponse('Settings retrieved successfully', settings))
  } catch (error) {
    console.error('Error getting settings:', error)
    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Create new settings (always creates new entry)
const createOrUpdateSettings = async (req, res) => {
  try {
    console.log('Settings creation request:', req.body)
    console.log('Request user:', req.user)
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId
    const userId = req.userId
    
    if (!userId) {
      console.log('No user ID found in request')
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }

    const { systemName, chargeOfSystem, willOccupy, color } = req.body

    console.log('Parsed data:', { restaurantId, userId, systemName, chargeOfSystem, willOccupy, color })

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400))
    }

    // Validation
    if (!systemName || !chargeOfSystem) {
      return res.status(400).json(errorResponse('System name and charge of system are required', 400))
    }

    // Always create new settings entry
    const newSettings = new Settings({
      systemName,
      chargeOfSystem,
      willOccupy: willOccupy === 'true' || willOccupy === true,
      color,
      restaurantId,
      createdBy: userId
    })

    console.log('Creating settings:', newSettings)
    const savedSettings = await newSettings.save()
    console.log('Settings saved:', savedSettings)
    
    await savedSettings.populate('createdBy', 'username email')
    console.log('Settings populated:', savedSettings)

    res.status(201).json(successResponse('Settings created successfully', savedSettings))
  } catch (error) {
    console.error('Error creating settings:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json(errorResponse('Validation error: ' + errors.join(', '), 400))
    }

    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Delete specific settings by ID
const deleteSettingsById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }

    const settings = await Settings.findByIdAndDelete(id)

    if (!settings) {
      return res.status(404).json(errorResponse('Settings not found', 404))
    }

    res.json(successResponse('Settings deleted successfully', null))
  } catch (error) {
    console.error('Error deleting settings:', error)
    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Update specific settings by ID
const updateSettingsById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }

    const { systemName, chargeOfSystem, willOccupy, color } = req.body

    // Validation
    if (!systemName || !chargeOfSystem) {
      return res.status(400).json(errorResponse('System name and charge of system are required', 400))
    }

    const updatedSettings = await Settings.findByIdAndUpdate(
      id,
      {
        systemName,
        chargeOfSystem,
        willOccupy: willOccupy === 'true' || willOccupy === true,
        color,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email')
     .populate('updatedBy', 'username email')

    if (!updatedSettings) {
      return res.status(404).json(errorResponse('Settings not found', 404))
    }

    res.json(successResponse('Settings updated successfully', updatedSettings))
  } catch (error) {
    console.error('Error updating settings:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json(errorResponse('Validation error: ' + errors.join(', '), 400))
    }

    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

module.exports = {
  getSettings,
  createOrUpdateSettings,
  deleteSettingsById,
  updateSettingsById
}