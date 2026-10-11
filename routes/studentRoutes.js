const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/students - List students scoped to tenant school
router.get('/', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section, role } = req.query;

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let students = [];

    if (isMySql && pool) {
      let query = `
        SELECT s.*, c.name AS className, sec.name AS section,
               g.name AS guardian_name, g.phone AS guardian_phone, g.relationship AS guardian_relation
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        LEFT JOIN student_guardians sg ON s.id = sg.student_id AND sg.is_primary = 1
        LEFT JOIN guardians g ON sg.guardian_id = g.id
        WHERE s.school_id = ? AND s.is_active = 1
      `;
      const params = [schoolId];

      if (className) {
        query += ' AND c.name = ?';
        params.push(className);
      }
      if (section) {
        query += ' AND sec.name = ?';
        params.push(section);
      }

      query += ' ORDER BY c.name ASC, sec.name ASC, s.roll_number ASC, s.name ASC';
      const [rows] = await pool.query(query, params);
      students = rows;
    } else if (memDb) {
      students = (memDb.students || []).filter(s => s.school_id === schoolId);
      if (className) students = students.filter(s => s.className === className);
      if (section) students = students.filter(s => s.section === section);
    }

    return res.json({
      success: true,
      students,
      users: students.map(s => ({ ...s, email: s.student_uid })) // Compatibility for ViewUsers
    });
  } catch (err) {
    console.error('Fetch students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
});

// POST /api/students/admit - Complete Multi-Step Student Admission Wizard
router.post('/admit', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const {
    name,
    email,
    password,
    admissionNumber,
    rollNumber,
    className,
    section,
    dob,
    gender,
    guardianName,
    guardianRelation,
    guardianPhone,
    guardianEmail,
    address
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Student Full Name is required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  const studentEmail = (email || `student_${Date.now()}@school.edu`).trim();
  const admNo = admissionNumber || `ADM-${Date.now().toString().slice(-6)}`;
  const roll = rollNumber || '';

  try {
    let newStudentId = null;

    if (isMySql && pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Resolve Class
        const targetClass = className || 'Class 10';
        let [cRows] = await conn.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, targetClass]);
        let classId = cRows.length > 0 ? cRows[0].id : null;
        if (!classId) {
          const [cIns] = await conn.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, targetClass]);
          classId = cIns.insertId;
        }

        // 2. Resolve Section
        const targetSection = section || 'A';
        let [sRows] = await conn.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, targetSection]);
        let sectionId = sRows.length > 0 ? sRows[0].id : null;
        if (!sectionId) {
          const [sIns] = await conn.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, targetSection]);
          sectionId = sIns.insertId;
        }

        // 3. Create Student User Account
        const defaultPassword = password || 'password123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        await conn.query(
          `INSERT INTO users (username, password_hash, role, full_name, is_active)
           VALUES (?, ?, 'student', ?, 1)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [studentEmail, passwordHash, name]
        );

        // 4. Insert Student Record
        const [stuRes] = await conn.query(
          `INSERT INTO students (school_id, student_uid, admission_number, name, roll_number, class_id, section_id, dob, gender, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [schoolId, studentEmail, admNo, name, roll, classId, sectionId, dob || null, gender || 'Not Specified']
        );
        newStudentId = stuRes.insertId;

        // 5. Insert Guardian & Link if provided
        if (guardianName || guardianPhone) {
          const [gRes] = await conn.query(
            `INSERT INTO guardians (school_id, name, relationship, phone, email)
             VALUES (?, ?, ?, ?, ?)`,
            [schoolId, guardianName || 'Parent', guardianRelation || 'Parent', guardianPhone || '', guardianEmail || '']
          );
          const guardianId = gRes.insertId;

          await conn.query(
            'INSERT INTO student_guardians (student_id, guardian_id, is_primary) VALUES (?, ?, 1)',
            [newStudentId, guardianId]
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
      newStudentId = Date.now();
      const newStudent = {
        id: newStudentId,
        school_id: schoolId,
        student_uid: studentEmail,
        admission_number: admNo,
        name,
        roll_number: roll,
        className: className || 'Class 10',
        section: section || 'A',
        guardian_name: guardianName,
        guardian_phone: guardianPhone,
        is_active: 1
      };
      memDb.students.push(newStudent);
      db.saveLocalDb();
    }

    return res.json({
      success: true,
      message: `Student "${name}" registered successfully with Admission No "${admNo}"!`,
      studentId: newStudentId
    });
  } catch (err) {
    console.error('Admit student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete student admission' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const studentId = req.params.id;

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      await pool.query('DELETE FROM students WHERE id = ? AND school_id = ?', [studentId, schoolId]);
    } else if (memDb) {
      memDb.students = (memDb.students || []).filter(s => s.id != studentId);
      db.saveLocalDb();
    }
    return res.json({ success: true, message: 'Student removed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove student' });
  }
});

module.exports = router;
