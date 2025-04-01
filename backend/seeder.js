const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors'); // Optional: for colored console output

// Load env vars
dotenv.config({ path: './.env' });

// Load models
const User = require('./models/User');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI);

// Function to import data (creates default admin if not exists)
const importData = async () => {
  try {
    const adminUsername = 'admin';
    const adminEmail = 'admin@example.com'; // Placeholder email
    const adminPassword = 'password'; // Default password - CHANGE IMMEDIATELY

    // Check if admin user already exists by username
    const existingAdmin = await User.findOne({ username: adminUsername });
    if (existingAdmin) {
      console.log(`Admin user '${adminUsername}' already exists.`.yellow.inverse);
    } else {
      // Create the admin user
      // Note: The password will be automatically hashed by the pre-save hook in the User model
      await User.create({
        username: adminUsername,
        email: adminEmail, // Ensure email is unique if required by schema
        password: adminPassword,
        role: 'admin' // Assign admin role
      });
      console.log(`Default admin user '${adminUsername}' created successfully.`.green.inverse);
      console.log('IMPORTANT: Change the default password immediately!'.yellow.bold);
    }

    // Optional: Add other seed data here if needed (e.g., referral codes)

    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Function to delete data (optional, for cleanup - adjust as needed)
const deleteData = async () => {
  try {
    // Example: Delete the default admin user
    await User.deleteMany({ username: 'admin' });
    console.log(`Default admin user 'admin' destroyed...`.red.inverse);

    // Example: Delete all users (use with caution!)
    // await User.deleteMany();
    // console.log('All users destroyed...'.red.inverse);

    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
    console.log('Please use the -i flag to import data or -d to delete data'.blue);
    process.exit();
}

// Install colors package if using it: npm install colors
