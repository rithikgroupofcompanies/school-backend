const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');

// Route Modules
const authRoutes = require('./routes/authRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const studentRoutes = require('./routes/studentRoutes');
const staffRoutes = require('./routes/staffRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const academicRoutes = require('./routes/academicRoutes');
const sheetsRoutes = require('./routes/sheetsRoutes');
const parentRoutes = require('./routes/parentRoutes');

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'EduNexus V2 Multi-School SaaS',
    timestamp: new Date().toISOString(),
    mysqlConnected: db.isMySqlConnected()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api', academicRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/parent', parentRoutes);

// Compatibility aliases for legacy frontend routes
app.use('/api/users/add', (req, res, next) => {
  if (req.body && req.body.role === 'student') {
    return req.app._router.handle(Object.assign(req, { url: '/admit', originalUrl: '/api/students/admit' }), res, next);
  }
  return req.app._router.handle(Object.assign(req, { url: '/', originalUrl: '/api/staff' }), res, next);
});

app.use('/api/users', (req, res, next) => {
  if (req.method === 'DELETE') {
    return req.app._router.handle(Object.assign(req, { url: req.url, originalUrl: `/api/students${req.url}` }), res, next);
  }
  if (req.query && req.query.role === 'student') {
    return req.app._router.handle(Object.assign(req, { url: '/', originalUrl: '/api/students' }), res, next);
  }
  return req.app._router.handle(Object.assign(req, { url: '/', originalUrl: '/api/staff' }), res, next);
});

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EduNexus V2 API Server running at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Google Sheets Sync Engine initialized`);
});
