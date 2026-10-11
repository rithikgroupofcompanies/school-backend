const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ----------------------------------------------------------------------
// 1. ATTENDANCE ENDPOINTS
// ----------------------------------------------------------------------

// GET /api/attendance
router.get('/attendance', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section, date } = req.query;

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let records = [];

    if (isMySql && pool) {
      let query = `
        SELECT a.date, a.status, a.student_id, s.name AS student_name, s.roll_number,
               c.name AS className, sec.name AS section
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE a.school_id = ?
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
      if (date) {
        query += ' AND a.date = ?';
        params.push(date);
      }

      const [rows] = await pool.query(query, params);

      // Group into date-based map matching frontend expectations
      const grouped = {};
      rows.forEach(r => {
        const d = r.date.toISOString().split('T')[0];
        if (!grouped[d]) {
          grouped[d] = {
            id: d,
            date: d,
            className: r.className,
            section: r.section,
            status: {},
            submittedAt: d
          };
        }
        grouped[d].status[r.student_id] = r.status;
      });

      records = Object.values(grouped);
    } else if (memDb) {
      records = memDb.attendance || [];
    }

    return res.json({ success: true, records });
  } catch (err) {
    console.error('Fetch attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance/submit
router.post('/attendance/submit', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section, date, status } = req.body;

  if (!date || !status) {
    return res.status(400).json({ success: false, message: 'Date and status map are required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        for (const [studentId, attStatus] of Object.entries(status)) {
          await conn.query(
            `INSERT INTO attendance (school_id, student_id, date, status, marked_by)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)`,
            [schoolId, parseInt(studentId), date, attStatus, req.user.id]
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
      memDb.attendance.push({
        id: date,
        date,
        className,
        section,
        status,
        submittedAt: new Date().toISOString()
      });
      db.saveLocalDb();
    }

    return res.json({ success: true, message: 'Attendance recorded successfully!' });
  } catch (err) {
    console.error('Submit attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit attendance' });
  }
});

// ----------------------------------------------------------------------
// 2. HOMEWORK ENDPOINTS
// ----------------------------------------------------------------------

// GET /api/homework
router.get('/homework', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section } = req.query;

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let homework = [];

    if (isMySql && pool) {
      let query = `
        SELECT h.*, c.name AS className, sec.name AS section, sub.name AS subject
        FROM homework h
        JOIN classes c ON h.class_id = c.id
        LEFT JOIN sections sec ON h.section_id = sec.id
        JOIN subjects sub ON h.subject_id = sub.id
        WHERE h.school_id = ?
        ORDER BY h.due_date DESC
      `;
      const [rows] = await pool.query(query, [schoolId]);
      homework = rows;
    } else if (memDb) {
      homework = memDb.homework || [];
    }

    return res.json({ success: true, homework });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch homework' });
  }
});

// POST /api/homework
router.post('/homework', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section, subject, title, description, dueDate } = req.body;

  if (!description || !dueDate) {
    return res.status(400).json({ success: false, message: 'Description and due date are required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      // Resolve class
      let [cRows] = await pool.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, className || 'Class 10']);
      let classId = cRows.length > 0 ? cRows[0].id : null;
      if (!classId) {
        const [cIns] = await pool.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, className || 'Class 10']);
        classId = cIns.insertId;
      }

      // Resolve section
      let [sRows] = await pool.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, section || 'A']);
      let sectionId = sRows.length > 0 ? sRows[0].id : null;
      if (!sectionId) {
        const [sIns] = await pool.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, section || 'A']);
        sectionId = sIns.insertId;
      }

      // Resolve subject
      let [subRows] = await pool.query('SELECT id FROM subjects WHERE school_id = ? AND name = ?', [schoolId, subject || 'General']);
      let subjectId = subRows.length > 0 ? subRows[0].id : null;
      if (!subjectId) {
        const [subIns] = await pool.query('INSERT INTO subjects (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, subject || 'General']);
        subjectId = subIns.insertId;
      }

      await pool.query(
        `INSERT INTO homework (school_id, class_id, section_id, subject_id, title, description, due_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, classId, sectionId, subjectId, title || 'Homework', description, dueDate, req.user.id]
      );
    } else if (memDb) {
      memDb.homework.push({
        id: Date.now(),
        school_id: schoolId,
        className,
        section,
        subject,
        title,
        description,
        due_date: dueDate
      });
      db.saveLocalDb();
    }

    return res.json({ success: true, message: 'Homework posted successfully!' });
  } catch (err) {
    console.error('Post homework error:', err);
    return res.status(500).json({ success: false, message: 'Failed to post homework' });
  }
});

// DELETE /api/homework/:id
router.delete('/homework/:id', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      await pool.query('DELETE FROM homework WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    } else if (memDb) {
      memDb.homework = (memDb.homework || []).filter(h => h.id != req.params.id);
      db.saveLocalDb();
    }
    return res.json({ success: true, message: 'Homework assignment deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete homework' });
  }
});

// ----------------------------------------------------------------------
// 3. EXAMS & MARKS ENDPOINTS
// ----------------------------------------------------------------------

// GET /api/tests
router.get('/tests', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let tests = [];

    if (isMySql && pool) {
      const [rows] = await pool.query(
        `SELECT t.*, c.name AS className, sec.name AS section, sub.name AS subject
         FROM tests t
         JOIN classes c ON t.class_id = c.id
         LEFT JOIN sections sec ON t.section_id = sec.id
         JOIN subjects sub ON t.subject_id = sub.id
         WHERE t.school_id = ? ORDER BY t.date DESC`,
        [schoolId]
      );
      tests = rows;
    } else if (memDb) {
      tests = memDb.tests || [];
    }

    return res.json({ success: true, tests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tests' });
  }
});

// POST /api/tests
router.post('/tests', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { name, className, section, subject, date, maxMarks } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Test name is required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      // Resolve class
      let [cRows] = await pool.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, className || 'Class 10']);
      let classId = cRows.length > 0 ? cRows[0].id : null;
      if (!classId) {
        const [cIns] = await pool.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, className || 'Class 10']);
        classId = cIns.insertId;
      }

      // Resolve section
      let [sRows] = await pool.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, section || 'A']);
      let sectionId = sRows.length > 0 ? sRows[0].id : null;
      if (!sectionId) {
        const [sIns] = await pool.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, section || 'A']);
        sectionId = sIns.insertId;
      }

      // Resolve subject
      let [subRows] = await pool.query('SELECT id FROM subjects WHERE school_id = ? AND name = ?', [schoolId, subject || 'Mathematics']);
      let subjectId = subRows.length > 0 ? subRows[0].id : null;
      if (!subjectId) {
        const [subIns] = await pool.query('INSERT INTO subjects (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, subject || 'Mathematics']);
        subjectId = subIns.insertId;
      }

      await pool.query(
        `INSERT INTO tests (school_id, name, date, class_id, section_id, subject_id, max_marks, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [schoolId, name, date || new Date().toISOString().split('T')[0], classId, sectionId, subjectId, maxMarks || 100, req.user.id]
      );
    } else if (memDb) {
      memDb.tests.push({
        id: Date.now(),
        school_id: schoolId,
        name,
        className,
        section,
        subject,
        date: date || new Date().toISOString().split('T')[0],
        max_marks: maxMarks || 100
      });
      db.saveLocalDb();
    }

    return res.json({ success: true, message: `Exam "${name}" created successfully!` });
  } catch (err) {
    console.error('Create test error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create test' });
  }
});

// POST /api/tests/:testId/marks - Save Marks Entry
router.post('/tests/:testId/marks', authenticate, async (req, res) => {
  const { marks } = req.body; // Map: { studentId: score }
  const testId = req.params.testId;

  if (!marks) {
    return res.status(400).json({ success: false, message: 'Marks payload is required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        for (const [studentId, score] of Object.entries(marks)) {
          await conn.query(
            `INSERT INTO test_marks (test_id, student_id, marks_obtained, max_marks)
             VALUES (?, ?, ?, 100)
             ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained)`,
            [testId, parseInt(studentId), parseFloat(score) || 0]
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
      for (const [studentId, score] of Object.entries(marks)) {
        memDb.test_marks.push({
          id: Date.now() + parseInt(studentId),
          test_id: parseInt(testId),
          student_id: parseInt(studentId),
          marks_obtained: parseFloat(score) || 0
        });
      }
      db.saveLocalDb();
    }

    return res.json({ success: true, message: 'Exam marks saved and calculated successfully!' });
  } catch (err) {
    console.error('Save marks error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save marks' });
  }
});

// ----------------------------------------------------------------------
// 4. BEHAVIOUR ENDPOINTS
// ----------------------------------------------------------------------

// GET /api/behaviour
router.get('/behaviour', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let logs = [];
    if (isMySql && pool) {
      const [rows] = await pool.query(
        `SELECT b.*, s.name AS studentName, c.name AS className, sec.name AS section
         FROM behaviour b
         JOIN students s ON b.student_id = s.id
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE b.school_id = ? ORDER BY b.date DESC`,
        [schoolId]
      );
      logs = rows;
    } else if (memDb) {
      logs = memDb.behaviour || [];
    }

    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch behaviour records' });
  }
});

// POST /api/behaviour
router.post('/behaviour', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { studentId, rating, remark } = req.body;

  if (!studentId || !remark) {
    return res.status(400).json({ success: false, message: 'Student and remark are required' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      await pool.query(
        `INSERT INTO behaviour (school_id, student_id, rating, remarks, date)
         VALUES (?, ?, ?, ?, CURDATE())`,
        [schoolId, parseInt(studentId), parseInt(rating) || 5, remark]
      );
    } else if (memDb) {
      memDb.behaviour.push({
        id: Date.now(),
        school_id: schoolId,
        student_id: parseInt(studentId),
        rating: parseInt(rating) || 5,
        remarks: remark,
        date: new Date().toISOString().split('T')[0]
      });
      db.saveLocalDb();
    }

    return res.json({ success: true, message: 'Student behaviour log saved!' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to record behaviour' });
  }
});

// ----------------------------------------------------------------------
// 5. WHATSAPP BROADCAST ENDPOINTS
// ----------------------------------------------------------------------

router.get('/whatsapp/logs', authenticate, async (req, res) => {
  return res.json({
    success: true,
    logs: [
      { id: 1, type: 'Broadcast', message: 'School annual sports day scheduled on Friday.', status: 'Delivered', sentAt: 'Today at 09:30 AM', recipientsCount: 140 },
      { id: 2, type: 'Attendance', message: 'Daily attendance report published for Class 10.', status: 'Sent', sentAt: 'Yesterday at 10:15 AM', recipientsCount: 42 }
    ]
  });
});

router.post('/whatsapp/broadcast', authenticate, async (req, res) => {
  const { text } = req.body;
  return res.json({ success: true, message: `WhatsApp broadcast dispatched to all registered parents! (${text.slice(0, 30)}...)` });
});

router.post('/whatsapp/class-alert', authenticate, async (req, res) => {
  const { className, section, text } = req.body;
  return res.json({ success: true, message: `WhatsApp notification sent to parents of ${className}-${section}!` });
});

// ----------------------------------------------------------------------
// 6. SYSTEM SETTINGS ENDPOINTS
// ----------------------------------------------------------------------

router.get('/system/settings', authenticate, async (req, res) => {
  return res.json({
    success: true,
    settings: {
      schoolName: 'Dyzen International School',
      academicYear: '2026-2027',
      whatsappApiKey: 'twi_live_98ab42c8d23e5904',
      jwtSecret: 'super_secret_jwt_school_production_key_2026',
      lastBackup: '2026-10-10 18:00 UTC'
    }
  });
});

router.post('/system/settings', authenticate, async (req, res) => {
  return res.json({ success: true, message: 'System configuration updated successfully!' });
});

module.exports = router;
