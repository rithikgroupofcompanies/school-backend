const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// GET /api/schools - List all schools (Super Admin)
router.get('/', authenticate, async (req, res) => {
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let schools = [];
    if (isMySql && pool) {
      const [rows] = await pool.query(
        `SELECT s.*, 
                (SELECT COUNT(*) FROM students WHERE school_id = s.id) AS student_count,
                (SELECT COUNT(*) FROM school_memberships WHERE school_id = s.id AND role = 'teacher') AS teacher_count
         FROM schools s ORDER BY s.id DESC`
      );
      schools = rows;
    } else if (memDb) {
      schools = (memDb.schools || []).map(s => ({
        ...s,
        student_count: (memDb.students || []).filter(st => st.school_id === s.id).length,
        teacher_count: (memDb.users || []).filter(u => u.role === 'teacher').length
      }));
    }

    return res.json({ success: true, schools });
  } catch (err) {
    console.error('Fetch schools error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch schools' });
  }
});

// POST /api/schools/onboard - 5-Step School Onboarding Wizard
router.post('/onboard', authenticate, authorizeRoles('super_admin'), async (req, res) => {
  const {
    name,
    code,
    board,
    email,
    phone,
    address,
    city,
    state,
    adminName,
    adminEmail,
    adminPassword,
    gradesOffered
  } = req.body;

  if (!name || !code || !email) {
    return res.status(400).json({ success: false, message: 'School Name, Code, and Official Email are required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let newSchoolId = null;
    const cleanCode = code.toUpperCase().trim();

    if (isMySql && pool) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // 1. Check duplicate code
        const [existing] = await connection.query('SELECT id FROM schools WHERE code = ?', [cleanCode]);
        if (existing.length > 0) {
          await connection.rollback();
          return res.status(400).json({ success: false, message: `School code "${cleanCode}" is already in use.` });
        }

        // 2. Insert School
        const [schRes] = await connection.query(
          `INSERT INTO schools (name, code, board, email, phone, address, city, state, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [name, cleanCode, board || 'CBSE', email, phone || '', address || '', city || '', state || '']
        );
        newSchoolId = schRes.insertId;

        // 3. Seed Default Classes for the newly onboarded school
        const standardClasses = gradesOffered && gradesOffered.length > 0
          ? gradesOffered
          : ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

        for (const clsName of standardClasses) {
          const [clsRes] = await connection.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [newSchoolId, clsName]);
          const classId = clsRes.insertId;
          // Add default sections A and B
          await connection.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, "A"), (?, ?, "B")', [newSchoolId, classId, newSchoolId, classId]);
        }

        // 4. Create initial School Admin user if specified
        if (adminEmail && adminPassword) {
          const passwordHash = await bcrypt.hash(adminPassword, 10);
          const [userRes] = await connection.query(
            `INSERT INTO users (username, password_hash, role, full_name, is_active)
             VALUES (?, ?, 'school_admin', ?, 1)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
            [adminEmail.trim(), passwordHash, adminName || 'School Administrator']
          );
          const adminUserId = userRes.insertId || (await connection.query('SELECT id FROM users WHERE username = ?', [adminEmail.trim()]))[0][0].id;

          await connection.query(
            `INSERT INTO school_memberships (school_id, user_id, role, designation, department)
             VALUES (?, ?, 'school_admin', 'Principal / Head Admin', 'Administration')`,
            [newSchoolId, adminUserId]
          );
        }

        await connection.commit();
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else if (memDb) {
      newSchoolId = Date.now();
      const newSchool = {
        id: newSchoolId,
        name,
        code: cleanCode,
        board: board || 'CBSE',
        email,
        phone,
        address,
        city,
        state,
        status: 'active'
      };
      memDb.schools.push(newSchool);
      db.saveLocalDb();
    }

    return res.json({
      success: true,
      message: `School "${name}" onboarded successfully with code "${cleanCode}"!`,
      schoolId: newSchoolId
    });
  } catch (err) {
    console.error('Onboard school error:', err);
    return res.status(500).json({ success: false, message: 'Failed to onboard school' });
  }
});

module.exports = router;
