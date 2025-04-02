const express = require('express');
const {
  getDisabledModels,
  getAllModelsStatus,
  disableModel,
  enableModel
} = require('../controllers/disabledModels');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// All routes below are private and require admin role
router.use(protect);
router.use(authorize('admin'));

router
  .route('/')
  .get(getDisabledModels)    // Get list of disabled model names
  .post(disableModel);       // Add a model name to the disabled list

router.route('/status').get(getAllModelsStatus); // Get all models with their disabled status

router
  .route('/:modelName')
  .delete(enableModel);      // Remove a model name from the disabled list

module.exports = router;
