const express = require("express");
const router = express.Router();
const memberController = require("../controllers/memberController");
const {authMiddleware} = require('../middleware/authMiddleware')
// Routes
router.get("/all/members",authMiddleware , memberController.getAllMembers);    
router.get("/:id",authMiddleware ,  memberController.getMemberById);  
router.post("/add/members",authMiddleware ,  memberController.createMember);    
router.put("/update/member/:id",authMiddleware ,  memberController.updateMember);    
router.delete("/delete/member/:id",authMiddleware ,  memberController.deleteMember); 

module.exports = router;
