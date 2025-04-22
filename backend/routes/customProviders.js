const express = require('express');
const {
    getCustomProviders,
    createCustomProvider,
    deleteCustomProvider
    // updateCustomProvider // Uncomment if update functionality is added
} = require('../controllers/customProviders');

const router = express.Router();

// Include other resource routers if needed (e.g., for nested routes)
// const customModelRouter = require('./customModels');

const { protect, authorize } = require('../middleware/auth'); // Import protect and authorize middleware

// Apply protect middleware to all routes below
// Apply authorize middleware for 'admin' role to all routes below
router.use(protect);
router.use(authorize('admin')); // Ensure only admins can manage custom providers

// Define routes
router
    .route('/')
    .get(getCustomProviders)
    .post(createCustomProvider);

router
    .route('/:id')
    .delete(deleteCustomProvider);
    // .put(updateCustomProvider); // Uncomment if update functionality is added

// Re-route into other resource routers (if needed)
// router.use('/:providerId/custommodels', customModelRouter); // Example for nested routes

module.exports = router;
