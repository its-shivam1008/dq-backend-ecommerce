const express = require('express');
const router = express.Router();
const controller = require('../controllers/keyboardShortcutController');
const {authMiddleware} = require('../middleware/authMiddleware');
router.post('/create/shortcutkey', authMiddleware, controller.createShortcut);
router.get('/all/keys', authMiddleware, controller.getShortcuts);         
router.get('/:id', authMiddleware, controller.getShortcutById);
router.put('/keys/updating/:id', authMiddleware, controller.updateShortcut);
router.delete('/keys/deleting/:id', authMiddleware, controller.deleteShortcut);

module.exports = router;
