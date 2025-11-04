const Tax = require('../model/Tax')
const { generateResponse } = require('../utils/responseHelper')

// Helper functions for responses
const successResponse = (message, data) => generateResponse(true, message, data)
const errorResponse = (message, statusCode) => generateResponse(false, message, null, { statusCode })

// Get all taxes for a restaurant
const getTaxes = async (req, res) => {
  try {
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400))
    }

    const taxes = await Tax.find({ restaurantId })
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email')
      .sort({ createdAt: -1 }) // Sort by newest first

    res.json(successResponse('Taxes retrieved successfully', taxes))
  } catch (error) {
    console.error('Error getting taxes:', error)
    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Create new tax (always creates new entry)
const createTax = async (req, res) => {
  try {
    console.log('Tax creation request:', req.body)
    console.log('Request user:', req.user)
    
    // 🔥 ALWAYS use req.userId (which is user.restaurantId from user collection)
    const restaurantId = req.userId
    const userId = req.userId
    
    if (!userId) {
      console.log('No user ID found in request')
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }
    
    const { taxName, taxCharge, taxType } = req.body

    console.log('Parsed data:', { restaurantId, userId, taxName, taxCharge, taxType })

    if (!restaurantId) {
      return res.status(400).json(errorResponse('Restaurant ID is required', 400))
    }

    // Validation
    if (!taxName || !taxCharge) {
      return res.status(400).json(errorResponse('Tax name and tax charge are required', 400))
    }

    if (!taxType || !['percentage', 'fixed'].includes(taxType)) {
      return res.status(400).json(errorResponse('Tax type must be either percentage or fixed', 400))
    }

    // Always create new tax entry
    const newTax = new Tax({
      taxName,
      taxCharge,
      taxType,
      restaurantId,
      createdBy: userId
    })

    console.log('Creating tax:', newTax)
    const savedTax = await newTax.save()
    console.log('Tax saved:', savedTax)
    
    await savedTax.populate('createdBy', 'username email')
    console.log('Tax populated:', savedTax)

    res.status(201).json(successResponse('Tax created successfully', savedTax))
  } catch (error) {
    console.error('Error creating tax:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json(errorResponse('Validation error: ' + errors.join(', '), 400))
    }

    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Delete specific tax by ID
const deleteTaxById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }

    const tax = await Tax.findByIdAndDelete(id)

    if (!tax) {
      return res.status(404).json(errorResponse('Tax not found', 404))
    }

    res.json(successResponse('Tax deleted successfully', null))
  } catch (error) {
    console.error('Error deleting tax:', error)
    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

// Update specific tax by ID
const updateTaxById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401))
    }
    
    const { taxName, taxCharge, taxType } = req.body

    // Validation
    if (!taxName || !taxCharge) {
      return res.status(400).json(errorResponse('Tax name and tax charge are required', 400))
    }

    if (!taxType || !['percentage', 'fixed'].includes(taxType)) {
      return res.status(400).json(errorResponse('Tax type must be either percentage or fixed', 400))
    }

    const updatedTax = await Tax.findByIdAndUpdate(
      id,
      {
        taxName,
        taxCharge,
        taxType,
        updatedBy: userId
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email')
     .populate('updatedBy', 'username email')

    if (!updatedTax) {
      return res.status(404).json(errorResponse('Tax not found', 404))
    }

    res.json(successResponse('Tax updated successfully', updatedTax))
  } catch (error) {
    console.error('Error updating tax:', error)
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json(errorResponse('Validation error: ' + errors.join(', '), 400))
    }

    res.status(500).json(errorResponse('Internal server error', 500))
  }
}

module.exports = {
  getTaxes,
  createTax,
  deleteTaxById,
  updateTaxById
}
