const express = require('express')
const router = express.Router()
const { getSettings, createOrUpdateSettings, deleteSettingsById, updateSettingsById } = require('../controllers/SettingsController')
const { authMiddleware } = require('../middleware/authMiddleware')

// Apply authentication middleware to all routes
router.use(authMiddleware)

// GET /api/settings - Get all settings for the restaurant
router.get('/', getSettings)

// POST /api/settings - Create new settings
router.post('/', createOrUpdateSettings)

// PUT /api/settings/:id - Update specific settings
router.put('/:id', updateSettingsById)

// DELETE /api/settings/:id - Delete specific settings
router.delete('/:id', deleteSettingsById)

module.exports = router