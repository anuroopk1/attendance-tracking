require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./db');

const { router: authRouter } = require('./routes/auth');
const batchesRouter = require('./routes/batches');
const studentsRouter = require('./routes/students');
const attendanceRouter = require('./routes/attendance');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend client calls
// Always include Capacitor/Ionic native origins so iOS/Android apps can reach the API
const CAPACITOR_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
];

let corsOrigins;
if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*') {
  corsOrigins = true; // allow all
} else {
  corsOrigins = [
    ...process.env.CORS_ORIGIN.split(',').map(o => o.trim()),
    ...CAPACITOR_ORIGINS,
  ];
}

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Parse incoming JSON and urlencoded payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static route for uploaded images/avatars (if needed in future)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/analytics', analyticsRouter);

// Fallback/Healthcheck Route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start DB & Web Server
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(` AttendTrack Backend running at http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
