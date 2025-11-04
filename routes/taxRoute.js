const express = require('express')
const router = express.Router()
const { getTaxes, createTax, deleteTaxById, updateTaxById } = require('../controllers/TaxController')
const { authMiddleware } = require('../middleware/authMiddleware')

// Apply authentication middleware to all routes
router.use(authMiddleware)

// GET /api/tax - Get all taxes for the restaurant
router.get('/', getTaxes)

// POST /api/tax - Create new tax
router.post('/', createTax)

// PUT /api/tax/:id - Update specific tax
router.put('/:id', updateTaxById)

// DELETE /api/tax/:id - Delete specific tax
router.delete('/:id', deleteTaxById)

module.exports = router
