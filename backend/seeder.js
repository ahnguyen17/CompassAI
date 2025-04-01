const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors'); // Optional: for colored console output

// Load env vars
dotenv.config({ path: './.env' });

// Load models
const User = require('./models/User');

// Connect to DB
mongoose.connect(process.env.MONGODB_URI);

// Function to import data
const importData = async () => {
  try {
    const userEmail = 'ahnguyen17@gmail.com';
    const userPassword = 'Summer23';

    // Check if user already exists by email
    const existingUser = await User.findOne({ email: userEmail });
    if (existingUser) {
      console.log(`User with email ${userEmail} already exists.`.yellow.inverse);
      process.exit();
    }

    // Create the user
    // Note: The password will be automatically hashed by the pre-save hook in the User model
    await User.create({
      username: userEmail, // Using email as username for simplicity
      email: userEmail,
      password: userPassword,
      role: 'admin' // Assign admin role
    });

    console.log(`User ${userEmail} created successfully.`.green.inverse);
    process.exit();
  } catch (err) {
    console.error(`${err}`.red.inverse);
    process.exit(1);
  }
};

// Function to delete data (optional, for cleanup)
const deleteData = async () => {
  try {
    // Delete the specific user or the old root user if needed
    await User.deleteMany({ email: 'ahnguyen17@gmail.com' });
    await User.deleteMany({ username: 'root' }); // Also remove the old root user if it exists
    console.log('Specified user(s) destroyed...'.red.inverse);
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
