const express = require('express');
const {
  getUserMemory,
  updateUserMemorySettings,
  addContext,
  updateContext,
  deleteContext,
  clearAllContexts,
} = require('../controllers/userMemoryController');
const { protect } = require('../middleware/auth'); // Assuming standard auth middleware

const router = express.Router();

// All routes under this router will be protected
router.use(protect);

router.route('/')
  .get(getUserMemory); // Renamed from getContexts to getUserMemory for clarity

router.route('/settings')
  .put(updateUserMemorySettings);

router.route('/contexts')
  .post(addContext);

router.route('/contexts/clear')
  .post(clearAllContexts); // Using POST for an action that modifies data significantly

router.route('/contexts/:contextId')
  .put(updateContext)
  .delete(deleteContext);

module.exports = router;
