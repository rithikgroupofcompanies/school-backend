const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// GET /api/staff - List all staff for the tenant school
router.get('/', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let staff = [];

    if (isMySql && pool) {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name AS name, u.username AS email, sm.role, sm.designation, sm.department,
                ac.class_id, c.name AS className, sec.name AS section
         FROM school_memberships sm
         JOIN users u ON sm.user_id = u.id
         LEFT JOIN admin_classes ac ON u.id = ac.admin_id
         LEFT JOIN classes c ON ac.class_id = c.id
         LEFT JOIN sections sec ON ac.section_id = sec.id
         WHERE sm.school_id = ? AND sm.is_active = 1`,
        [schoolId]
      );
      staff = rows;
    } else if (memDb) {
      staff = (memDb.users || [])
        .filter(u => u.role === 'teacher' || u.role === 'school_admin' || u.role === 'admin')
        .map(u => ({
          ...u,
          name: u.full_name,
          email: u.username,
          designation: u.role === 'teacher' ? 'Subject Teacher' : 'Class Admin'
        }));
    }

    return res.json({ success: true, staff, users: staff });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff members' });
  }
});

// POST /api/staff - Add new staff member
router.post('/', authenticate, authorizeRoles('super_admin', 'school_admin'), async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { name, email, password, role, designation, department, className, section } = req.body;

  if (!email || !name) {
    return res.status(400).json({ success: false, message: 'Full Name and Email are required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    const passwordHash = await bcrypt.hash(password || 'password123', 10);
    const assignedRole = role === 'admin' ? 'school_admin' : (role || 'teacher');

    if (isMySql && pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Create User
        const [uRes] = await conn.query(
          `INSERT INTO users (username, password_hash, role, full_name, is_active)
           VALUES (?, ?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [email.trim(), passwordHash, assignedRole, name.trim()]
        );
        const userId = uRes.insertId || (await conn.query('SELECT id FROM users WHERE username = ?', [email.trim()]))[0][0].id;

        // 2. Create School Membership
        await conn.query(
          `INSERT INTO school_memberships (school_id, user_id, role, designation, department)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE designation = VALUES(designation), department = VALUES(department)`,
          [schoolId, userId, assignedRole, designation || 'Staff', department || 'Academics']
        );

        // 3. Class Admin mapping if applicable
        if (assignedRole === 'school_admin' && className) {
          let [cRows] = await conn.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, className]);
          let classId = cRows.length > 0 ? cRows[0].id : null;
          if (!classId) {
            const [cIns] = await conn.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, className]);
            classId = cIns.insertId;
          }

          let [sRows] = await conn.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, section || 'A']);
          let sectionId = sRows.length > 0 ? sRows[0].id : null;
          if (!sectionId) {
            const [sIns] = await conn.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, section || 'A']);
            sectionId = sIns.insertId;
          }

          await conn.query(
            `INSERT INTO admin_classes (admin_id, class_id, section_id) VALUES (?, ?, ?)`,
            [userId, classId, sectionId]
          );
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else if (memDb) {
      const newStaff = {
        id: Date.now(),
        username: email.trim(),
        full_name: name.trim(),
        role: assignedRole,
        designation: designation || 'Staff',
        department: department || 'Academics',
        is_active: 1
      };
      memDb.users.push(newStaff);
      db.saveLocalDb();
    }

    return res.json({ success: true, message: `Staff member "${name}" added successfully!` });
  } catch (err) {
    console.error('Add staff error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add staff member' });
  }
});

module.exports = router;
