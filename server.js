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
app.use('/api/login', (req, res, next) => {
  req.url = '/login';
  return authRoutes(req, res, next);
});
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
    req.url = '/admit';
    return studentRoutes(req, res, next);
  }
  req.url = '/';
  return staffRoutes(req, res, next);
});

app.use('/api/users', async (req, res, next) => {
  if (req.method === 'DELETE') {
    return studentRoutes(req, res, next);
  }
  if (req.query && req.query.role === 'student') {
    req.url = '/';
    return studentRoutes(req, res, next);
  }
  
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();
  const schoolId = req.user ? req.user.schoolId : 1;

  try {
    let allUsers = [];
    if (isMySql && pool) {
      const [students] = await pool.query(
        `SELECT s.id, s.name, s.student_uid AS email, 'student' AS role, c.name AS className, sec.name AS section, s.roll_number AS rollNumber
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE s.school_id = ?`,
        [schoolId]
      );
      const [staff] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.username AS email, sm.role, sm.designation, sm.department,
                c.name AS className, sec.name AS section
         FROM school_memberships sm
         JOIN users u ON sm.user_id = u.id
         LEFT JOIN admin_classes ac ON u.id = ac.admin_id
         LEFT JOIN classes c ON ac.class_id = c.id
         LEFT JOIN sections sec ON ac.section_id = sec.id
         WHERE sm.school_id = ? AND sm.is_active = 1`,
        [schoolId]
      );
      allUsers = [...students, ...staff];
    } else if (memDb) {
      allUsers = (memDb.users || []).map(u => ({
        id: u.id,
        name: u.full_name || u.name,
        email: u.username || u.email,
        role: u.role,
        className: u.className || (u.role === 'student' ? 'Class 10' : undefined),
        section: u.section || (u.role === 'student' ? 'A' : undefined),
        rollNumber: u.rollNumber || (u.role === 'student' ? '10A01' : undefined)
      }));
    }
    return res.json({ success: true, users: allUsers });
  } catch (e) {
    req.url = '/';
    return staffRoutes(req, res, next);
  }
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
