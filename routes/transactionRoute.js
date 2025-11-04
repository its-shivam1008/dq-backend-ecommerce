const express = require("express");
const router = express.Router();
const TransactionController = require("../controllers/TranscationController");
const { authMiddleware } = require("../middleware/authMiddleware");

// CRUD routes
router.get("/get-all/transaction", authMiddleware, TransactionController.getAllTransactions);
router.get("/transactionById/:transactionId", authMiddleware, TransactionController.getTransactionById);
router.get("/get-by-restaurant/transaction/:restaurantId", authMiddleware, TransactionController.getTransactionsByRestaurant);
router.get("/get-by-year-restaurant/transaction/:restaurantId", authMiddleware, TransactionController.getTransactionsByYearRestaurant);

router.post("/create/transaction", authMiddleware, TransactionController.createTransaction);
router.put("/:id", authMiddleware, TransactionController.updateTransaction);
router.delete("/deleteTransaction/:id", authMiddleware, TransactionController.deleteTransaction);

// Extra routes
router.get("/customer/:id", authMiddleware, TransactionController.getTransactionByCustomer);
router.post("/by-payment-type", authMiddleware, TransactionController.getTransactionsByPaymentType);

// ------------------ NEW ROUTES ------------------
router.get("/get-daily-cash-balance/:restaurantId/:date", authMiddleware, TransactionController.getDailyCashBalance);

// Fix the cashin/cashout routes
router.post("/cashin", authMiddleware, async (req, res) => {
    req.body.type = "CashIn";
    TransactionController.createCashTransaction(req, res);
});

router.post("/cashout", authMiddleware, async (req, res) => {
    req.body.type = "CashOut"; 
    TransactionController.createCashTransaction(req, res);
});


router.post("/bankin", authMiddleware, async (req, res) => {
    req.body.type = "bank_in";  
    TransactionController.createCashTransaction(req, res);
});

 
router.post("/bankout", authMiddleware, async (req, res) => {
    req.body.type = "bank_out";  
    TransactionController.createCashTransaction(req, res);
});

module.exports = router;


// const express = require("express");
// const router = express.Router();
// const TransactionController = require("../controllers/TranscationController");
// const {authMiddleware} = require("../middleware/authMiddleware");

// // CRUD routes
// router.get("/get-all/transaction", authMiddleware, TransactionController.getAllTransactions);
// router.get("/transactionById/:transactionId", authMiddleware, TransactionController.getTransactionById);
// router.post("/create/transaction", authMiddleware, TransactionController.createTransaction);
// router.put("/:id", authMiddleware, TransactionController.updateTransaction);
// router.delete("/deleteTransaction/:id", authMiddleware, TransactionController.deleteTransaction);

// // Extra routes
// router.get("/customer/:id", authMiddleware, TransactionController.getTransactionByCustomer);
// router.post("/by-payment-type", authMiddleware, TransactionController.getTransactionsByPaymentType);

// module.exports = router;