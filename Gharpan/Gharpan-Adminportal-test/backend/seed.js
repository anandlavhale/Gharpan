require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const users = [
  // Admin users (no delete access)
  { username: 'admin1', password: 'Gharpan', role: 'admin' },
  { username: 'admin2', password: 'Gharpan', role: 'admin' },
  { username: 'admin3', password: 'Gharpan', role: 'admin' },
  { username: 'admin4', password: 'Gharpan', role: 'admin' },
  { username: 'admin5', password: 'Gharpan', role: 'admin' },

  // Superadmin users (full access including delete)
  { username: 'superadmin1', password: 'superadmin1atgharpan', role: 'superadmin' },
  { username: 'superadmin2', password: 'superadmin2atgharpan', role: 'superadmin' }
];

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Create new users
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${userData.username} (${userData.role})`);
    }

    console.log('🎉 All users seeded successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();