const express = require('express');
const {
    getCustomModels,
    getCustomModel,
    createCustomModel,
    updateCustomModel,
    deleteCustomModel
} = require('../controllers/customModels');

// Create router, allowing parameter merging from parent routers (like customProviders)
const router = express.Router({ mergeParams: true }); 

const { protect, authorize } = require('../middleware/auth'); // Import middleware

// Apply protect and admin authorization middleware to all routes in this file
router.use(protect);
router.use(authorize('admin'));

// Define routes
router
    .route('/')
    .get(getCustomModels) // Handles both GET /api/v1/custommodels and GET /api/v1/customproviders/:providerId/custommodels
    .post(createCustomModel);

router
    .route('/:id')
    .get(getCustomModel)
    .put(updateCustomModel)
    .delete(deleteCustomModel);

module.exports = router;
