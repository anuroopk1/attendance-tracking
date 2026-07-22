const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendtrack';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB database at:', MONGODB_URI);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

module.exports = {
  connectDB,
  mongoose
};
