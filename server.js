const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Only load dotenv in development (Railway provides env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Debug: Check what environment variables are available
console.log('🔍 Debugging ALL environment variables:');
console.log('Total env vars:', Object.keys(process.env).length);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Available vars:', Object.keys(process.env).filter(key => 
  !key.startsWith('npm_') && !key.startsWith('_')
).slice(0, 10));

// Try all possible MongoDB URI variable names
const possibleMongoVars = [
  'MONGO_URI',
  'MONGODB_URI', 
  'DATABASE_URL',
  'DB_URI',
  'MONGO_URL'
];

console.log('🔍 Checking MongoDB variables:');
possibleMongoVars.forEach(varName => {
  console.log(`${varName}:`, process.env[varName] ? 'Found' : 'Not found');
});

const MONGODB_URI =
  process.env.MONGO_URI ||   
  process.env.DATABASE_URL || 
  process.env.MONGODB_URI || 
  process.env.DB_URI ||
  process.env.MONGO_URL ||
  'mongodb://localhost:27017/microblog';

console.log('📍 Using MongoDB URI:', MONGODB_URI.startsWith('mongodb://localhost') ? MONGODB_URI : MONGODB_URI.slice(0, 30) + '...');

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');
    console.log('Database URI:', MONGODB_URI.startsWith('mongodb://localhost') ? MONGODB_URI : MONGODB_URI.slice(0, 30) + '...');

  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // exit if DB connection fails
  }
};

// Event listeners for debugging connection
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('♻️ MongoDB reconnected');
});

// Connect
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
