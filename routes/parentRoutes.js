const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/parent/children - Get list of children linked to authenticated parent
router.get('/children', authenticate, async (req, res) => {
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let children = [];

    if (isMySql && pool) {
      // Find guardian by parent email or user_id
      const [rows] = await pool.query(
        `SELECT s.id, s.name, s.admission_number, s.roll_number, c.name AS className, sec.name AS section,
                sch.name AS school_name, sch.code AS school_code
         FROM students s
         JOIN student_guardians sg ON s.id = sg.student_id
         JOIN guardians g ON sg.guardian_id = g.id
         JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         JOIN schools sch ON s.school_id = sch.id
         WHERE g.email = ? OR g.user_id = ?`,
        [req.user.email, req.user.id]
      );
      children = rows;
    } else if (memDb) {
      children = (memDb.students || []).slice(0, 2).map(s => ({
        id: s.id,
        name: s.name,
        admission_number: s.admission_number || 'ADM-001',
        roll_number: s.roll_number || '10A01',
        className: s.className || 'Class 10',
        section: s.section || 'A',
        school_name: 'Dyzen International School'
      }));
    }

    // Fallback demo child if parent has no linked child yet
    if (children.length === 0) {
      children = [
        {
          id: 1,
          name: 'Alex Morgan',
          admission_number: 'ADM-2026-001',
          roll_number: '10A01',
          className: 'Class 10',
          section: 'A',
          school_name: 'Dyzen International School'
        }
      ];
    }

    return res.json({ success: true, children });
  } catch (err) {
    console.error('Parent children error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch linked children' });
  }
});

// GET /api/parent/child/:childId/dashboard - Child academic dashboard
router.get('/child/:childId/dashboard', authenticate, async (req, res) => {
  const childId = req.params.childId;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();

  try {
    let childProfile = null;
    let attendance = [];
    let homework = [];
    let marks = [];

    if (isMySql && pool) {
      const [childRows] = await pool.query(
        `SELECT s.*, c.name AS className, sec.name AS section, sch.name AS school_name
         FROM students s
         JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         JOIN schools sch ON s.school_id = sch.id
         WHERE s.id = ?`,
        [childId]
      );
      if (childRows.length > 0) childProfile = childRows[0];

      const [attRows] = await pool.query(
        'SELECT date, status FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30',
        [childId]
      );
      attendance = attRows;

      const [markRows] = await pool.query(
        `SELECT t.name AS exam_name, sub.name AS subject, tm.marks_obtained, tm.max_marks
         FROM test_marks tm
         JOIN tests t ON tm.test_id = t.id
         JOIN subjects sub ON t.subject_id = sub.id
         WHERE tm.student_id = ?`,
        [childId]
      );
      marks = markRows;

      if (childProfile) {
        const [hwRows] = await pool.query(
          `SELECT h.*, sub.name AS subject
           FROM homework h
           JOIN subjects sub ON h.subject_id = sub.id
           WHERE h.class_id = ? ORDER BY h.due_date DESC LIMIT 10`,
          [childProfile.class_id]
        );
        homework = hwRows;
      }
    }

    return res.json({
      success: true,
      child: childProfile || { name: 'Alex Morgan', className: 'Class 10', section: 'A' },
      attendance,
      marks,
      homework
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load child dashboard' });
  }
});

module.exports = router;
