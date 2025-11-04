const express = require('express');
const router = express();
const DueTransactionController = require('../controllers/dueTransactionController');

// 1. Import your authMiddleware (adjust path if needed)
const { authMiddleware } = require('../middleware/authMiddleware');

// 2. Add authMiddleware to ALL your routes

router.post('/due/add', authMiddleware, DueTransactionController.createDueTransaction);
router.get("/alldue/due", authMiddleware, DueTransactionController.getAllDueTransactions);
router.get('/dues/customer/:customer_id', authMiddleware, DueTransactionController.getDueTransactionsByCustomer);

router.put('/dues/:id', authMiddleware, DueTransactionController.updateDueTransaction);
router.delete('/dues/:id', authMiddleware, DueTransactionController.deleteDueTransaction);

module.exports = router;