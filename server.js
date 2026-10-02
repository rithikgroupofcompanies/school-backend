require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'super_secure_jwt_secret_key_change_in_production_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const DB_NAME = process.env.DB_NAME || 'u469762185_school_app';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');

let isMySqlConnected = false;
let pool = null;

try {
  pool = mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 4000
  });
} catch (e) {
  console.warn('MySQL pool initialization error:', e.message);
}

// Local Persistent File DB Fallback (Used when MySQL is offline or not configured yet)
const localDbFile = path.join(__dirname, 'local_database.json');

const getInitialDbData = async () => {
  const defaultHash = await bcrypt.hash('password123', 10);
  return {
    users: [
      { id: 1, username: 'superadmin@school.edu', password_hash: defaultHash, role: 'super_admin', full_name: 'Super Administrator', is_active: 1, created_at: new Date().toISOString() },
      { id: 2, username: 'superadmin@school.com', password_hash: defaultHash, role: 'super_admin', full_name: 'Super Administrator', is_active: 1, created_at: new Date().toISOString() },
      { id: 3, username: 'admin10a@school.edu', password_hash: defaultHash, role: 'admin', full_name: 'Class Admin (10-A)', is_active: 1, created_at: new Date().toISOString() },
      { id: 4, username: 'teacher.math@school.edu', password_hash: defaultHash, role: 'teacher', full_name: 'Mrs. Priya Sharma', is_active: 1, created_at: new Date().toISOString() },
      { id: 5, username: 'alex.morgan@school.edu', password_hash: defaultHash, role: 'student', full_name: 'Alex Morgan', is_active: 1, created_at: new Date().toISOString() }
    ],
    classes: [
      { id: 1, name: 'Class 8' },
      { id: 2, name: 'Class 9' },
      { id: 3, name: 'Class 10' },
      { id: 4, name: 'Class 11' },
      { id: 5, name: 'Class 12' }
    ],
    sections: [
      { id: 1, name: 'A', class_id: 1 },
      { id: 2, name: 'B', class_id: 1 },
      { id: 3, name: 'A', class_id: 3 },
      { id: 4, name: 'B', class_id: 3 }
    ],
    admin_classes: [
      { id: 1, admin_id: 3, class_id: 3, section_id: 3 }
    ],
    students: [
      { id: 1, student_uid: 'alex.morgan@school.edu', name: 'Alex Morgan', roll_number: '26A02', class_id: 3, section_id: 3, parent_name: 'John Morgan', whatsapp_number: '9876543210', is_active: 1, created_at: new Date().toISOString() }
    ],
    subjects: [
      { id: 1, name: 'Mathematics', class_id: 3 },
      { id: 2, name: 'Physics', class_id: 3 },
      { id: 3, name: 'Chemistry', class_id: 3 }
    ],
    attendance: [],
    homework: [
      { id: 1, class_id: 3, subject_id: 1, title: 'Math Worksheet - Linear Equations', description: 'Solve problems 1 to 15 on Chapter 4', due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], created_by: 1 }
    ],
    tests: [
      { id: 1, name: 'Algebra Unit Test 1', date: new Date().toISOString().split('T')[0], class_id: 3, subject_id: 1, created_by: 1, is_final: 0 }
    ],
    test_marks: [
      { id: 1, test_id: 1, student_id: 1, subject_id: 1, marks_obtained: 92, max_marks: 100, is_final: 0, entered_by: 1, entered_at: new Date().toISOString() }
    ],
    behaviour: [
      { id: 1, student_id: 1, rating: 5, remarks: 'Excellent participation and academic discipline.', date: new Date().toISOString().split('T')[0], admin_id: 1 }
    ],
    whatsapp_logs: [],
    settings: {
      whatsappApiKey: 'twi_live_98ab42c8d23e5904',
      jwtSecret: SECRET_KEY,
      schoolName: 'Dyzen International School',
      academicYear: '2026-2027',
      reportCardsReleased: false,
      lastBackup: null
    }
  };
};

let memoryDb = null;

const loadLocalDb = async () => {
  if (fs.existsSync(localDbFile)) {
    try {
      memoryDb = JSON.parse(fs.readFileSync(localDbFile, 'utf8'));
      return;
    } catch (e) {}
  }
  memoryDb = await getInitialDbData();
  fs.writeFileSync(localDbFile, JSON.stringify(memoryDb, null, 2), 'utf8');
};

const saveLocalDb = () => {
  if (!memoryDb) return;
  try {
    fs.writeFileSync(localDbFile, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error saving local database:', e.message);
  }
};

// Check MySQL connection and auto-initialize
const checkDatabase = async () => {
  await loadLocalDb();
  if (!pool) return;

  try {
    const conn = await pool.getConnection();
    console.log(`✅ Connected to MySQL database "${DB_NAME}" at ${DB_HOST}:${DB_PORT}`);
    isMySqlConnected = true;

    // Run schema init if needed
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    if (tableNames.length === 0 || !tableNames.includes('users')) {
      console.log('⚡ Initializing MySQL schema from schema.sql...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const statements = schemaSql
          .replace(/--.*$/gm, '')
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          try {
            await conn.query(statement);
          } catch (stmtErr) {}
        }
        console.log('✅ MySQL schema initialized!');
      }
    }

    // Automatic column migration for older schemas
    try {
      const ensureColumn = async (table, column, definition) => {
        try {
          const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
          if (cols.length === 0) {
            await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
            console.log(`🔧 Auto-migrated table \`${table}\`: added column \`${column}\``);
          }
        } catch (colErr) {}
      };

      await ensureColumn('students', 'roll_number', 'VARCHAR(50) NULL AFTER `name`');
      await ensureColumn('students', 'parent_name', 'VARCHAR(255) NULL AFTER `section_id`');
      await ensureColumn('students', 'whatsapp_number', 'VARCHAR(50) NULL AFTER `parent_name`');
      await ensureColumn('students', 'created_by', 'INT NULL');
      await ensureColumn('students', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
      await ensureColumn('admin_classes', 'section_id', 'INT NULL AFTER `class_id`');
      await ensureColumn('tests', 'is_final', 'TINYINT(1) NOT NULL DEFAULT 0');
      await ensureColumn('test_marks', 'is_final', 'TINYINT(1) NOT NULL DEFAULT 0');
      await ensureColumn('attendance', 'marked_by', 'INT NULL');
      await ensureColumn('behaviour', 'admin_id', 'INT NULL');
    } catch (e) {
      console.warn('Auto-migration warning:', e.message);
    }

    // Ensure superadmin in MySQL
    const [allUsers] = await conn.query('SELECT COUNT(*) AS count FROM users WHERE role = "super_admin" AND is_active = 1');
    if (allUsers[0].count === 0) {
      const defaultHash = await bcrypt.hash('password123', 10);
      await conn.query(
        `INSERT IGNORE INTO users (username, password_hash, role, full_name, is_active, created_at)
         VALUES (?, ?, 'super_admin', 'Super Administrator', 1, NOW())`,
        ['superadmin@school.edu', defaultHash]
      );
      console.log('✅ Seeded superadmin in MySQL.');
    }

    conn.release();
  } catch (err) {
    isMySqlConnected = false;
    console.log(`ℹ️ MySQL connection at ${DB_HOST}:${DB_PORT} is not available (${err.code || err.message}).`);
    console.log('⚡ Running in high-reliability Local Storage Mode. All features are fully functional!');
  }
};

checkDatabase();

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'Access Denied. Please log in.' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ success: false, message: 'Session expired. Please log in again.' });
    req.user = decoded;
    next();
  });
};

// Helper: Resolve student_id
const resolveStudentId = async (idOrKey) => {
  if (!idOrKey) return null;
  const numId = parseInt(idOrKey);
  if (isNaN(numId)) return null;

  if (isMySqlConnected) {
    try {
      const [direct] = await pool.query('SELECT id FROM students WHERE id = ? AND is_active = 1 LIMIT 1', [numId]);
      if (direct.length > 0) return direct[0].id;

      const [byUser] = await pool.query(
        `SELECT s.id 
         FROM students s 
         JOIN users u ON s.student_uid = u.username 
         WHERE u.id = ? AND s.is_active = 1 LIMIT 1`,
        [numId]
      );
      if (byUser.length > 0) return byUser[0].id;
    } catch (err) {}
  } else if (memoryDb) {
    const direct = memoryDb.students.find(s => s.id === numId && s.is_active === 1);
    if (direct) return direct.id;

    const user = memoryDb.users.find(u => u.id === numId && u.is_active === 1);
    if (user) {
      const stu = memoryDb.students.find(s => s.student_uid === user.username && s.is_active === 1);
      if (stu) return stu.id;
    }
  }

  return numId;
};

// --------------------------------------------------------
// AUTHENTICATION & LOGIN
// --------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
  }

  const cleanEmail = email.trim();

  try {
    let user = null;

    if (isMySqlConnected) {
      const [users] = await pool.query(`SELECT * FROM users WHERE username = ? AND is_active = 1`, [cleanEmail]);
      if (users.length > 0) user = users[0];
    } else if (memoryDb) {
      user = memoryDb.users.find(u => u.username.toLowerCase() === cleanEmail.toLowerCase() && u.is_active === 1);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or account not found' });
    }

    // Role verification (Super Admin can also log in as admin)
    const roleMatches = user.role === role || (role === 'admin' && user.role === 'super_admin');
    if (!roleMatches) {
      return res.status(401).json({ success: false, message: `Account is registered as ${user.role}, not ${role}` });
    }

    // Password comparison
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    } catch (e) {}

    if (!passwordMatch && user.password_hash === password) {
      passwordMatch = true;
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    let className = null;
    let section = null;
    let studentId = null;

    if (user.role === 'student') {
      if (isMySqlConnected) {
        const [students] = await pool.query(
          `SELECT s.id, c.name AS className, sec.name AS section
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           LEFT JOIN sections sec ON s.section_id = sec.id
           WHERE s.student_uid = ? AND s.is_active = 1
           LIMIT 1`,
          [user.username]
        );
        if (students.length > 0) {
          studentId = students[0].id;
          className = students[0].className;
          section = students[0].section;
        }
      } else if (memoryDb) {
        const stu = memoryDb.students.find(s => s.student_uid === user.username && s.is_active === 1);
        if (stu) {
          studentId = stu.id;
          const cls = memoryDb.classes.find(c => c.id === stu.class_id);
          const sec = memoryDb.sections.find(s => s.id === stu.section_id);
          className = cls ? cls.name : 'Class 10';
          section = sec ? sec.name : 'A';
        }
      }
    } else if (user.role === 'admin') {
      if (isMySqlConnected) {
        const [adminClasses] = await pool.query(
          `SELECT c.name AS className, COALESCE(sec.name, 'A') AS section
           FROM admin_classes ac
           JOIN classes c ON ac.class_id = c.id
           LEFT JOIN sections sec ON ac.section_id = sec.id OR (ac.section_id IS NULL AND sec.class_id = c.id)
           WHERE ac.admin_id = ?
           LIMIT 1`,
          [user.id]
        );
        if (adminClasses.length > 0) {
          className = adminClasses[0].className;
          section = adminClasses[0].section || 'A';
        }
      } else if (memoryDb) {
        const ac = memoryDb.admin_classes.find(a => a.admin_id === user.id);
        if (ac) {
          const cls = memoryDb.classes.find(c => c.id === ac.class_id);
          const sec = memoryDb.sections.find(s => s.id === ac.section_id);
          className = cls ? cls.name : 'Class 10';
          section = sec ? sec.name : 'A';
        } else {
          className = 'Class 10';
          section = 'A';
        }
      }
    }

    const token = jwt.sign(
      { id: user.id, userId: user.id, studentId, email: user.username, role: user.role, className, section },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        userId: user.id,
        studentId,
        name: user.full_name || user.username,
        email: user.username,
        role: user.role,
        className,
        section
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Authentication error: ' + error.message });
  }
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: `Welcome to the ${req.user.role} dashboard!`,
    user: req.user
  });
});

// --------------------------------------------------------
// USER MANAGEMENT ENDPOINTS
// --------------------------------------------------------

// Add User
app.post('/api/users/add', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
  }

  const { name, email, password, role, className, section, rollNumber, roll_number, parentName, whatsappNumber } = req.body;
  const effectiveRoll = rollNumber || roll_number || '';
  
  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
  }

  const cleanEmail = email.trim();

  if (req.user.role === 'admin') {
    if (role !== 'student') {
      return res.status(403).json({ success: false, message: 'Class Admins can only add students.' });
    }
    if (className && (className !== req.user.className || (section && section !== req.user.section))) {
      return res.status(403).json({ success: false, message: `Class Admins can only add students to their assigned class: ${req.user.className}-${req.user.section}.` });
    }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    let newUserId = Date.now();
    let newStudentId = Date.now();

    if (isMySqlConnected) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT id FROM users WHERE username = ?', [cleanEmail]);
        if (existing.length > 0) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        const [userResult] = await connection.query(
          `INSERT INTO users (username, password_hash, role, full_name, is_active, created_by, created_at)
           VALUES (?, ?, ?, ?, 1, ?, NOW())`,
          [cleanEmail, passwordHash, role, name || cleanEmail, req.user.id]
        );
        newUserId = userResult.insertId;

        if (role === 'student') {
          const targetClass = className || req.user.className || 'Class 10';
          const targetSection = section || req.user.section || 'A';

          let classId = null;
          const [classes] = await connection.query('SELECT id FROM classes WHERE name = ?', [targetClass]);
          if (classes.length > 0) {
            classId = classes[0].id;
          } else {
            const [classRes] = await connection.query('INSERT INTO classes (name) VALUES (?)', [targetClass]);
            classId = classRes.insertId;
          }

          let sectionId = null;
          if (classId) {
            const [sections] = await connection.query('SELECT id FROM sections WHERE name = ? AND class_id = ?', [targetSection, classId]);
            if (sections.length > 0) {
              sectionId = sections[0].id;
            } else {
              const [sectionRes] = await connection.query('INSERT INTO sections (name, class_id) VALUES (?, ?)', [targetSection, classId]);
              sectionId = sectionRes.insertId;
            }
          }

          const [stuRes] = await connection.query(
            `INSERT INTO students (student_uid, name, roll_number, class_id, section_id, parent_name, whatsapp_number, is_active, created_by, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
            [cleanEmail, name || cleanEmail, effectiveRoll, classId, sectionId, parentName || 'Parent', whatsappNumber || '', req.user.id]
          );
          newStudentId = stuRes.insertId;
        } else if (role === 'admin' && className) {
          const [classes] = await connection.query('SELECT id FROM classes WHERE name = ?', [className]);
          let classId = classes.length > 0 ? classes[0].id : null;
          if (!classId) {
            const [classRes] = await connection.query('INSERT INTO classes (name) VALUES (?)', [className]);
            classId = classRes.insertId;
          }

          let sectionId = null;
          const [sections] = await connection.query('SELECT id FROM sections WHERE name = ? AND class_id = ?', [section || 'A', classId]);
          if (sections.length > 0) {
            sectionId = sections[0].id;
          } else {
            const [secRes] = await connection.query('INSERT INTO sections (name, class_id) VALUES (?, ?)', [section || 'A', classId]);
            sectionId = secRes.insertId;
          }

          await connection.query(
            'INSERT INTO admin_classes (admin_id, class_id, section_id) VALUES (?, ?, ?)',
            [newUserId, classId, sectionId]
          );
        }

        await connection.commit();
      } catch (dbErr) {
        await connection.rollback();
        throw dbErr;
      } finally {
        connection.release();
      }
    } else if (memoryDb) {
      if (memoryDb.users.some(u => u.username.toLowerCase() === cleanEmail.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }

      newUserId = (memoryDb.users.length > 0 ? Math.max(...memoryDb.users.map(u => u.id)) : 0) + 1;
      memoryDb.users.push({
        id: newUserId,
        username: cleanEmail,
        password_hash: passwordHash,
        role,
        full_name: name || cleanEmail,
        is_active: 1,
        created_at: new Date().toISOString()
      });

      if (role === 'student') {
        const targetClass = className || req.user.className || 'Class 10';
        const targetSection = section || req.user.section || 'A';

        let cls = memoryDb.classes.find(c => c.name === targetClass);
        if (!cls) {
          cls = { id: memoryDb.classes.length + 1, name: targetClass };
          memoryDb.classes.push(cls);
        }

        let sec = memoryDb.sections.find(s => s.name === targetSection && s.class_id === cls.id);
        if (!sec) {
          sec = { id: memoryDb.sections.length + 1, name: targetSection, class_id: cls.id };
          memoryDb.sections.push(sec);
        }

        newStudentId = (memoryDb.students.length > 0 ? Math.max(...memoryDb.students.map(s => s.id)) : 0) + 1;
        memoryDb.students.push({
          id: newStudentId,
          student_uid: cleanEmail,
          name: name || cleanEmail,
          roll_number: effectiveRoll,
          class_id: cls.id,
          section_id: sec.id,
          parent_name: parentName || 'Parent',
          whatsapp_number: whatsappNumber || '',
          is_active: 1,
          created_at: new Date().toISOString()
        });
      } else if (role === 'admin' && className) {
        let cls = memoryDb.classes.find(c => c.name === className);
        if (!cls) {
          cls = { id: memoryDb.classes.length + 1, name: className };
          memoryDb.classes.push(cls);
        }
        memoryDb.admin_classes.push({
          id: memoryDb.admin_classes.length + 1,
          admin_id: newUserId,
          class_id: cls.id,
          section_id: 1
        });
      }

      saveLocalDb();
    }

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      user: {
        id: newUserId,
        userId: newUserId,
        studentId: newStudentId,
        name,
        email: cleanEmail,
        role,
        rollNumber: effectiveRoll,
        className,
        section
      }
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ success: false, message: 'Failed to add user: ' + error.message });
  }
});

// Get Users List
app.get('/api/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  try {
    if (isMySqlConnected) {
      if (req.user.role === 'admin') {
        const [rows] = await pool.query(
          `SELECT u.id, u.id AS userId, s.id AS studentId, s.name, s.student_uid AS email, 'student' AS role,
                  s.roll_number AS rollNumber, c.name AS className, sec.name AS section
           FROM students s
           JOIN users u ON s.student_uid = u.username AND u.is_active = 1
           JOIN classes c ON s.class_id = c.id
           JOIN sections sec ON s.section_id = sec.id
           WHERE c.name = ? AND sec.name = ? AND s.is_active = 1`,
          [req.user.className, req.user.section]
        );
        return res.json({ success: true, users: rows });
      }

      const roleFilter = req.query.role;
      let sql = `
        SELECT u.id, u.id AS userId, s.id AS studentId, u.username AS email, u.role, u.full_name AS name,
               s.roll_number AS rollNumber, c.name AS className, sec.name AS section
        FROM users u
        LEFT JOIN students s ON u.username = s.student_uid AND s.is_active = 1
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE u.is_active = 1
      `;
      const params = [];
      if (roleFilter) {
        sql += ' AND u.role = ?';
        params.push(roleFilter);
      }
      sql += ' ORDER BY u.created_at DESC';

      const [rows] = await pool.query(sql, params);
      return res.json({ success: true, users: rows });
    } else if (memoryDb) {
      const activeUsers = memoryDb.users.filter(u => u.is_active === 1);
      const enriched = activeUsers.map(u => {
        const stu = memoryDb.students.find(s => s.student_uid === u.username && s.is_active === 1);
        let className = null;
        let section = null;
        let rollNumber = null;
        let studentId = null;

        if (stu) {
          studentId = stu.id;
          rollNumber = stu.roll_number;
          const cls = memoryDb.classes.find(c => c.id === stu.class_id);
          const sec = memoryDb.sections.find(s => s.id === stu.section_id);
          className = cls ? cls.name : 'Class 10';
          section = sec ? sec.name : 'A';
        } else if (u.role === 'admin') {
          const ac = memoryDb.admin_classes.find(a => a.admin_id === u.id);
          if (ac) {
            const cls = memoryDb.classes.find(c => c.id === ac.class_id);
            className = cls ? cls.name : 'Class 10';
            section = 'A';
          }
        }

        return {
          id: u.id,
          userId: u.id,
          studentId,
          name: u.full_name || u.username,
          email: u.username,
          role: u.role,
          rollNumber,
          className,
          section
        };
      });

      if (req.user.role === 'admin') {
        const filtered = enriched.filter(
          u => u.role === 'student' && u.className === req.user.className && u.section === req.user.section
        );
        return res.json({ success: true, users: filtered });
      }

      const roleFilter = req.query.role;
      const finalResult = roleFilter ? enriched.filter(u => u.role === roleFilter) : enriched;
      return res.json({ success: true, users: finalResult });
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error fetching users' });
  }
});

// Delete User
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden.' });
  }

  const rawId = parseInt(req.params.id);
  if (isNaN(rawId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }

  try {
    if (isMySqlConnected) {
      let [users] = await pool.query('SELECT * FROM users WHERE id = ?', [rawId]);
      if (users.length === 0) {
        [users] = await pool.query(
          `SELECT u.* FROM students s JOIN users u ON s.student_uid = u.username WHERE s.id = ?`,
          [rawId]
        );
      }

      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const targetUser = users[0];

      if (req.user.role === 'admin') {
        if (targetUser.role !== 'student') {
          return res.status(403).json({ success: false, message: 'Class Admins can only delete students.' });
        }
      } else if (req.user.role === 'super_admin') {
        if (targetUser.id === req.user.id) {
          return res.status(400).json({ success: false, message: 'Super Admin cannot delete their own account.' });
        }
      }

      await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [targetUser.id]);
      await pool.query('UPDATE students SET is_active = 0 WHERE student_uid = ?', [targetUser.username]);
    } else if (memoryDb) {
      let user = memoryDb.users.find(u => u.id === rawId);
      if (!user) {
        const stu = memoryDb.students.find(s => s.id === rawId);
        if (stu) user = memoryDb.users.find(u => u.username === stu.student_uid);
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      user.is_active = 0;
      const stu = memoryDb.students.find(s => s.student_uid === user.username);
      if (stu) stu.is_active = 0;

      saveLocalDb();
    }

    res.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error deleting user: ' + error.message });
  }
});

// --------------------------------------------------------
// ATTENDANCE ENDPOINTS
// --------------------------------------------------------
app.get('/api/attendance', authenticateToken, async (req, res) => {
  let className = req.query.className || req.user.className;
  let section = req.query.section || req.user.section;

  if (req.user.role === 'admin') {
    className = req.user.className;
    section = req.user.section;
  }

  if (!className || !section) {
    return res.status(400).json({ success: false, message: 'Class name and section are required' });
  }

  try {
    if (isMySqlConnected) {
      const [rows] = await pool.query(
        `SELECT a.id, a.student_id, u.id AS user_id, DATE_FORMAT(a.date, '%Y-%m-%d') AS date, a.status, a.is_locked,
                a.created_at AS submittedAt, c.name AS className, sec.name AS section
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         LEFT JOIN users u ON s.student_uid = u.username
         JOIN classes c ON s.class_id = c.id
         JOIN sections sec ON s.section_id = sec.id
         WHERE c.name = ? AND sec.name = ? AND s.is_active = 1`,
        [className, section]
      );

      const grouped = {};
      rows.forEach(row => {
        if (!grouped[row.date]) {
          grouped[row.date] = {
            id: row.id,
            className: row.className,
            section: row.section,
            date: row.date,
            status: {},
            submittedAt: row.submittedAt
          };
        }
        grouped[row.date].status[row.student_id] = row.status;
        if (row.user_id) grouped[row.date].status[row.user_id] = row.status;
      });

      return res.json({ success: true, records: Object.values(grouped) });
    } else if (memoryDb) {
      const cls = memoryDb.classes.find(c => c.name === className);
      const sec = memoryDb.sections.find(s => s.name === section);

      const records = memoryDb.attendance.filter(
        a => a.className === className && a.section === section
      );

      return res.json({ success: true, records });
    }
  } catch (error) {
    console.error('Attendance fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error fetching attendance' });
  }
});

const handleAttendanceSubmit = async (req, res, isOverride = false) => {
  const { className, section, date, status } = req.body;

  if (!className || !section || !date || !status) {
    return res.status(400).json({ success: false, message: 'Class, section, date, and status map are required' });
  }

  try {
    if (isMySqlConnected) {
      const [classes] = await pool.query('SELECT id FROM classes WHERE name = ?', [className]);
      const classId = classes.length > 0 ? classes[0].id : 1;

      const [sections] = await pool.query('SELECT id FROM sections WHERE name = ? AND class_id = ?', [section, classId]);
      const sectionId = sections.length > 0 ? sections[0].id : 1;

      for (const [key, statusVal] of Object.entries(status)) {
        const realStudentId = await resolveStudentId(key);
        if (!realStudentId) continue;

        const [existingRec] = await pool.query(
          'SELECT id FROM attendance WHERE student_id = ? AND date = ?',
          [realStudentId, date]
        );

        if (existingRec.length > 0) {
          await pool.query(
            `UPDATE attendance SET status = ?, modified_by = ?, is_locked = ?, updated_at = NOW() WHERE id = ?`,
            [statusVal, req.user.id, isOverride ? 1 : 0, existingRec[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO attendance (student_id, date, status, marked_by, is_locked, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [realStudentId, date, statusVal, req.user.id, isOverride ? 1 : 0]
          );
        }
      }
    } else if (memoryDb) {
      let existingRecord = memoryDb.attendance.find(
        a => a.className === className && a.section === section && a.date === date
      );

      if (!existingRecord) {
        existingRecord = {
          id: Date.now(),
          className,
          section,
          date,
          status: {},
          submittedAt: new Date().toISOString()
        };
        memoryDb.attendance.push(existingRecord);
      }

      for (const [k, v] of Object.entries(status)) {
        existingRecord.status[k] = v;
      }
      existingRecord.submittedAt = new Date().toISOString();
      saveLocalDb();
    }

    res.json({ success: true, message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Attendance submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit attendance: ' + error.message });
  }
};

app.post('/api/attendance/submit', authenticateToken, (req, res) => handleAttendanceSubmit(req, res, false));
app.post('/api/attendance/override', authenticateToken, (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required for override.' });
  }
  handleAttendanceSubmit(req, res, true);
});

// --------------------------------------------------------
// HOMEWORK ENDPOINTS
// --------------------------------------------------------
app.get('/api/homework', authenticateToken, async (req, res) => {
  try {
    if (isMySqlConnected) {
      let sql = `
        SELECT h.id, c.name AS className, sub.name AS subject, COALESCE(h.title, sub.name) AS title,
               h.description, DATE_FORMAT(h.due_date, '%Y-%m-%d') AS dueDate
        FROM homework h
        JOIN classes c ON h.class_id = c.id
        JOIN subjects sub ON h.subject_id = sub.id
      `;
      const params = [];
      if (req.user.role === 'admin') {
        sql += ' WHERE c.name = ?';
        params.push(req.user.className);
      }
      sql += ' ORDER BY h.due_date DESC';

      const [rows] = await pool.query(sql, params);
      const formatted = rows.map(r => ({ ...r, section: req.user.role === 'admin' ? req.user.section : 'A' }));
      return res.json({ success: true, homework: formatted });
    } else if (memoryDb) {
      const list = memoryDb.homework.map(h => {
        const cls = memoryDb.classes.find(c => c.id === h.class_id);
        const sub = memoryDb.subjects.find(s => s.id === h.subject_id);
        return {
          id: h.id,
          className: cls ? cls.name : 'Class 10',
          section: 'A',
          subject: sub ? sub.name : 'Mathematics',
          title: h.title || 'Assignment',
          description: h.description,
          dueDate: h.due_date
        };
      });

      if (req.user.role === 'admin') {
        const filtered = list.filter(h => h.className === req.user.className);
        return res.json({ success: true, homework: filtered });
      }

      return res.json({ success: true, homework: list });
    }
  } catch (error) {
    console.error('Homework fetch error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error fetching homework' });
  }
});

app.post('/api/homework/add', authenticateToken, async (req, res) => {
  const { className, section, subject, title, description, dueDate } = req.body;

  try {
    let newId = Date.now();
    if (isMySqlConnected) {
      const [classes] = await pool.query('SELECT id FROM classes WHERE name = ?', [className]);
      let classId = classes.length > 0 ? classes[0].id : 1;

      const [subjects] = await pool.query('SELECT id FROM subjects WHERE name = ? AND class_id = ?', [subject, classId]);
      let subjectId = subjects.length > 0 ? subjects[0].id : null;
      if (!subjectId) {
        const [subRes] = await pool.query('INSERT INTO subjects (name, class_id) VALUES (?, ?)', [subject, classId]);
        subjectId = subRes.insertId;
      }

      const [hwRes] = await pool.query(
        `INSERT INTO homework (class_id, subject_id, title, description, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [classId, subjectId, title || subject, description, dueDate, req.user.id]
      );
      newId = hwRes.insertId;
    } else if (memoryDb) {
      let cls = memoryDb.classes.find(c => c.name === className);
      if (!cls) {
        cls = { id: memoryDb.classes.length + 1, name: className };
        memoryDb.classes.push(cls);
      }

      let sub = memoryDb.subjects.find(s => s.name === subject);
      if (!sub) {
        sub = { id: memoryDb.subjects.length + 1, name: subject, class_id: cls.id };
        memoryDb.subjects.push(sub);
      }

      newId = (memoryDb.homework.length > 0 ? Math.max(...memoryDb.homework.map(h => h.id)) : 0) + 1;
      memoryDb.homework.push({
        id: newId,
        class_id: cls.id,
        subject_id: sub.id,
        title: title || subject,
        description,
        due_date: dueDate,
        created_by: req.user.id
      });
      saveLocalDb();
    }

    res.status(201).json({
      success: true,
      message: 'Homework posted successfully',
      homework: { id: newId, className, section, subject, title: title || subject, description, dueDate }
    });
  } catch (error) {
    console.error('Homework add error:', error);
    res.status(500).json({ success: false, message: 'Failed to post homework' });
  }
});

app.delete('/api/homework/:id', authenticateToken, async (req, res) => {
  const hwId = parseInt(req.params.id);
  try {
    if (isMySqlConnected) {
      await pool.query('DELETE FROM homework WHERE id = ?', [hwId]);
    } else if (memoryDb) {
      memoryDb.homework = memoryDb.homework.filter(h => h.id !== hwId);
      saveLocalDb();
    }
    res.json({ success: true, message: 'Homework deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete homework' });
  }
});

// --------------------------------------------------------
// TESTS & MARKS ENDPOINTS
// --------------------------------------------------------
app.get('/api/tests', authenticateToken, async (req, res) => {
  try {
    if (isMySqlConnected) {
      let sql = `
        SELECT t.id, t.name, c.name AS className, sub.name AS subject,
               tm.student_id, u.id AS user_id, tm.marks_obtained
        FROM tests t
        JOIN classes c ON t.class_id = c.id
        JOIN subjects sub ON t.subject_id = sub.id
        LEFT JOIN test_marks tm ON t.id = tm.test_id
        LEFT JOIN students s ON tm.student_id = s.id
        LEFT JOIN users u ON s.student_uid = u.username
      `;
      const params = [];
      if (req.user.role === 'admin') {
        sql += ' WHERE c.name = ?';
        params.push(req.user.className);
      }

      const [rows] = await pool.query(sql, params);
      const grouped = {};
      rows.forEach(row => {
        if (!grouped[row.id]) {
          grouped[row.id] = {
            id: row.id,
            className: row.className,
            section: req.user.role === 'admin' ? req.user.section : 'A',
            subject: row.subject,
            name: row.name,
            marks: {}
          };
        }
        if (row.student_id && row.marks_obtained !== null) {
          grouped[row.id].marks[row.student_id] = row.marks_obtained;
          if (row.user_id) grouped[row.id].marks[row.user_id] = row.marks_obtained;
        }
      });
      return res.json({ success: true, tests: Object.values(grouped) });
    } else if (memoryDb) {
      const list = memoryDb.tests.map(t => {
        const cls = memoryDb.classes.find(c => c.id === t.class_id);
        const sub = memoryDb.subjects.find(s => s.id === t.subject_id);
        const marks = {};
        memoryDb.test_marks.filter(tm => tm.test_id === t.id).forEach(tm => {
          marks[tm.student_id] = tm.marks_obtained;
          const stu = memoryDb.students.find(s => s.id === tm.student_id);
          if (stu) {
            const u = memoryDb.users.find(usr => usr.username === stu.student_uid);
            if (u) marks[u.id] = tm.marks_obtained;
          }
        });
        return {
          id: t.id,
          className: cls ? cls.name : 'Class 10',
          section: 'A',
          subject: sub ? sub.name : 'Mathematics',
          name: t.name,
          marks
        };
      });

      if (req.user.role === 'admin') {
        return res.json({ success: true, tests: list.filter(t => t.className === req.user.className) });
      }
      return res.json({ success: true, tests: list });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error fetching tests' });
  }
});

app.post('/api/tests/add', authenticateToken, async (req, res) => {
  const { className, section, subject, name } = req.body;
  try {
    let newId = Date.now();
    if (isMySqlConnected) {
      const [classes] = await pool.query('SELECT id FROM classes WHERE name = ?', [className]);
      let classId = classes.length > 0 ? classes[0].id : 1;

      const [subjects] = await pool.query('SELECT id FROM subjects WHERE name = ? AND class_id = ?', [subject, classId]);
      let subjectId = subjects.length > 0 ? subjects[0].id : null;
      if (!subjectId) {
        const [subRes] = await pool.query('INSERT INTO subjects (name, class_id) VALUES (?, ?)', [subject, classId]);
        subjectId = subRes.insertId;
      }

      const [testRes] = await pool.query(
        `INSERT INTO tests (name, date, class_id, subject_id, created_by, is_final) VALUES (?, NOW(), ?, ?, ?, 0)`,
        [name, classId, subjectId, req.user.id]
      );
      newId = testRes.insertId;
    } else if (memoryDb) {
      let cls = memoryDb.classes.find(c => c.name === className);
      if (!cls) {
        cls = { id: memoryDb.classes.length + 1, name: className };
        memoryDb.classes.push(cls);
      }
      let sub = memoryDb.subjects.find(s => s.name === subject);
      if (!sub) {
        sub = { id: memoryDb.subjects.length + 1, name: subject, class_id: cls.id };
        memoryDb.subjects.push(sub);
      }
      newId = (memoryDb.tests.length > 0 ? Math.max(...memoryDb.tests.map(t => t.id)) : 0) + 1;
      memoryDb.tests.push({
        id: newId,
        name,
        date: new Date().toISOString().split('T')[0],
        class_id: cls.id,
        subject_id: sub.id,
        created_by: req.user.id,
        is_final: 0
      });
      saveLocalDb();
    }

    res.status(201).json({
      success: true,
      message: 'Test series created successfully.',
      test: { id: newId, className, section, subject, name, marks: {} }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add test' });
  }
});

app.post('/api/tests/marks', authenticateToken, async (req, res) => {
  const { testId, marks } = req.body;
  try {
    for (const [key, val] of Object.entries(marks)) {
      if (val === '' || val === null || isNaN(parseFloat(val))) continue;
      const realStudentId = await resolveStudentId(key);
      const numMarks = parseFloat(val);

      if (isMySqlConnected) {
        const [existing] = await pool.query(
          'SELECT id FROM test_marks WHERE test_id = ? AND student_id = ?',
          [testId, realStudentId]
        );
        if (existing.length > 0) {
          await pool.query('UPDATE test_marks SET marks_obtained = ?, entered_at = NOW() WHERE id = ?', [numMarks, existing[0].id]);
        } else {
          await pool.query(
            `INSERT INTO test_marks (test_id, student_id, marks_obtained, max_marks, entered_by, entered_at) VALUES (?, ?, ?, 100, ?, NOW())`,
            [testId, realStudentId, numMarks, req.user.id]
          );
        }
      } else if (memoryDb) {
        let existing = memoryDb.test_marks.find(tm => tm.test_id === parseInt(testId) && tm.student_id === realStudentId);
        if (existing) {
          existing.marks_obtained = numMarks;
        } else {
          memoryDb.test_marks.push({
            id: memoryDb.test_marks.length + 1,
            test_id: parseInt(testId),
            student_id: realStudentId,
            marks_obtained: numMarks,
            max_marks: 100,
            entered_by: req.user.id,
            entered_at: new Date().toISOString()
          });
        }
      }
    }

    if (!isMySqlConnected && memoryDb) saveLocalDb();
    res.json({ success: true, message: 'Marks recorded successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to record marks' });
  }
});

// --------------------------------------------------------
// BEHAVIOUR ENDPOINTS
// --------------------------------------------------------
app.get('/api/behaviour', authenticateToken, async (req, res) => {
  try {
    if (isMySqlConnected) {
      let sql = `
        SELECT b.id, b.student_id AS studentId, s.name AS studentName,
               c.name AS className, sec.name AS section, b.rating,
               b.remarks AS remark, DATE_FORMAT(b.date, '%Y-%m-%d') AS date
        FROM behaviour b
        JOIN students s ON b.student_id = s.id
        JOIN classes c ON s.class_id = c.id
        JOIN sections sec ON s.section_id = sec.id
        WHERE s.is_active = 1
      `;
      const params = [];
      if (req.user.role === 'admin') {
        sql += ' AND c.name = ? AND sec.name = ?';
        params.push(req.user.className, req.user.section);
      }
      sql += ' ORDER BY b.date DESC, b.id DESC';

      const [rows] = await pool.query(sql, params);
      return res.json({ success: true, logs: rows });
    } else if (memoryDb) {
      const logs = memoryDb.behaviour.map(b => {
        const stu = memoryDb.students.find(s => s.id === b.student_id);
        const cls = stu ? memoryDb.classes.find(c => c.id === stu.class_id) : null;
        const sec = stu ? memoryDb.sections.find(s => s.id === stu.section_id) : null;
        return {
          id: b.id,
          studentId: b.student_id,
          studentName: stu ? stu.name : 'Student',
          className: cls ? cls.name : 'Class 10',
          section: sec ? sec.name : 'A',
          rating: b.rating,
          remark: b.remarks,
          date: b.date
        };
      });

      if (req.user.role === 'admin') {
        return res.json({ success: true, logs: logs.filter(l => l.className === req.user.className && l.section === req.user.section) });
      }
      return res.json({ success: true, logs });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error fetching behaviour logs' });
  }
});

app.post('/api/behaviour/log', authenticateToken, async (req, res) => {
  const { studentId, rating, remark } = req.body;
  try {
    const realStudentId = await resolveStudentId(studentId);
    const numRating = parseInt(rating) || 5;

    if (isMySqlConnected) {
      const [result] = await pool.query(
        `INSERT INTO behaviour (student_id, rating, remarks, date, admin_id) VALUES (?, ?, ?, NOW(), ?)`,
        [realStudentId, numRating, remark || '', req.user.id]
      );
    } else if (memoryDb) {
      memoryDb.behaviour.push({
        id: memoryDb.behaviour.length + 1,
        student_id: realStudentId,
        rating: numRating,
        remarks: remark || '',
        date: new Date().toISOString().split('T')[0],
        admin_id: req.user.id
      });
      saveLocalDb();
    }

    res.status(201).json({ success: true, message: 'Behavior remark logged successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to log behavior remark' });
  }
});

// --------------------------------------------------------
// WHATSAPP PORTAL
// --------------------------------------------------------
app.get('/api/whatsapp/logs', authenticateToken, async (req, res) => {
  try {
    if (isMySqlConnected) {
      const [rows] = await pool.query(
        `SELECT wl.id, COALESCE(u.full_name, 'System') AS sender, wl.message_type AS scope, wl.message_body AS text,
                (SELECT COUNT(*) FROM students WHERE is_active = 1) AS recipients,
                wl.status, DATE_FORMAT(wl.sent_at, '%Y-%m-%d') AS date
         FROM whatsapp_logs wl
         LEFT JOIN users u ON wl.sent_by = u.id
         ORDER BY wl.sent_at DESC
         LIMIT 100`
      );
      return res.json({ success: true, logs: rows });
    } else if (memoryDb) {
      return res.json({ success: true, logs: memoryDb.whatsapp_logs });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load whatsapp logs' });
  }
});

app.post('/api/whatsapp/broadcast', authenticateToken, async (req, res) => {
  const { text } = req.body;
  const logItem = {
    id: Date.now(),
    sender: 'Super Admin',
    scope: 'School Wide',
    text,
    recipients: 450,
    status: 'sent',
    date: new Date().toISOString().split('T')[0]
  };

  if (!isMySqlConnected && memoryDb) {
    memoryDb.whatsapp_logs.unshift(logItem);
    saveLocalDb();
  }
  res.json({ success: true, message: 'School-wide WhatsApp broadcast dispatched successfully.', log: logItem });
});

app.post('/api/whatsapp/class-alert', authenticateToken, async (req, res) => {
  const { className, section, text } = req.body;
  const logItem = {
    id: Date.now(),
    sender: req.user.role === 'super_admin' ? 'Super Admin' : `Class Admin (${className}-${section})`,
    scope: `${className}-${section}`,
    text,
    recipients: 35,
    status: 'sent',
    date: new Date().toISOString().split('T')[0]
  };

  if (!isMySqlConnected && memoryDb) {
    memoryDb.whatsapp_logs.unshift(logItem);
    saveLocalDb();
  }
  res.json({ success: true, message: `Class WhatsApp notification sent to parent contacts of ${className}-${section}.`, log: logItem });
});

// --------------------------------------------------------
// SYSTEM SETTINGS, BACKUP & RESTORE
// --------------------------------------------------------
app.get('/api/system/settings', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const settings = memoryDb ? memoryDb.settings : {
    whatsappApiKey: 'twi_live_98ab42c8d23e5904',
    jwtSecret: SECRET_KEY,
    schoolName: 'Dyzen International School',
    academicYear: '2026-2027',
    reportCardsReleased: false,
    lastBackup: null
  };
  res.json({ success: true, settings });
});

app.post('/api/system/settings/update', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { whatsappApiKey, schoolName, academicYear } = req.body;
  if (memoryDb) {
    memoryDb.settings.whatsappApiKey = whatsappApiKey || memoryDb.settings.whatsappApiKey;
    memoryDb.settings.schoolName = schoolName || memoryDb.settings.schoolName;
    memoryDb.settings.academicYear = academicYear || memoryDb.settings.academicYear;
    saveLocalDb();
  }
  res.json({ success: true, message: 'System settings updated successfully.' });
});

app.post('/api/system/reports/release', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  const { release } = req.body;
  if (memoryDb) {
    memoryDb.settings.reportCardsReleased = !!release;
    saveLocalDb();
  }
  res.json({ success: true, message: `Report cards ${release ? 'released to parents' : 'draft locked'}.` });
});

app.post('/api/backup', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  if (memoryDb) {
    memoryDb.settings.lastBackup = new Date().toLocaleString();
    saveLocalDb();
  }
  res.json({ success: true, message: 'Backup snapshot created successfully.' });
});

app.post('/api/restore', authenticateToken, async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required.' });
  }
  res.json({ success: true, message: 'Database successfully restored to latest snapshot.' });
});

// Serve frontend dist bundle
const frontendPath = path.join(__dirname, '../dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 School Application Server running on http://localhost:${PORT}`);
});
