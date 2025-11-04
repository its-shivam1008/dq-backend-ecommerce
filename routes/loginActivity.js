const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  createLoginActivity,
  getLoginActivities,
  getAllLoginActivities,
  updateLogoutTime,
  getCurrentSession,
  testEndpoint
} = require('../controllers/LoginActivityController');

// @route POST /api/login-activity
// @desc Create login activity
// @access Private
router.post('/', authMiddleware, createLoginActivity);

// @route GET /api/login-activity
// @desc Get current user's login activities
// @access Private
router.get('/', authMiddleware, getLoginActivities);

// @route GET /api/login-activity/all
// @desc Get all login activities (Admin only)
// @access Private
router.get('/all', authMiddleware, getAllLoginActivities);

// @route PUT /api/login-activity/logout
// @desc Update logout time
// @access Private
router.put('/logout', authMiddleware, updateLogoutTime);

// @route GET /api/login-activity/test
// @desc Test endpoint
// @access Public
router.get('/test', testEndpoint);

// @route GET /api/login-activity/current
// @desc Get current active session
// @access Private
router.get('/current', authMiddleware, getCurrentSession);

module.exports = router;
