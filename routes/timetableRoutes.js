const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/timetables - Get timetable grid scoped to tenant, class, section or teacher
router.get('/', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const { className, section, teacherId, day } = req.query;

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    let entries = [];

    if (isMySql && pool) {
      let query = `
        SELECT tt.*, c.name AS className, sec.name AS section, sub.name AS subject_name, sub.code AS subject_code,
               u.full_name AS teacher_name
        FROM timetables tt
        JOIN classes c ON tt.class_id = c.id
        JOIN sections sec ON tt.section_id = sec.id
        JOIN subjects sub ON tt.subject_id = sub.id
        LEFT JOIN users u ON tt.teacher_id = u.id
        WHERE tt.school_id = ?
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
      if (teacherId) {
        query += ' AND tt.teacher_id = ?';
        params.push(teacherId);
      }
      if (day) {
        query += ' AND tt.day_of_week = ?';
        params.push(day);
      }

      query += ' ORDER BY FIELD(tt.day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"), tt.period_number ASC';
      const [rows] = await pool.query(query, params);
      entries = rows;
    } else if (memDb) {
      entries = memDb.timetables || [];
    }

    return res.json({ success: true, entries });
  } catch (err) {
    console.error('Fetch timetable error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch timetable' });
  }
});

// POST /api/timetables/entry - Add/Update period with Conflict Detection
router.post('/entry', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const {
    className,
    section,
    subjectName,
    teacherId,
    dayOfWeek,
    periodNumber,
    startTime,
    endTime,
    room
  } = req.body;

  if (!className || !section || !subjectName || !dayOfWeek || !periodNumber) {
    return res.status(400).json({ success: false, message: 'Class, Section, Subject, Day, and Period Number are required.' });
  }

  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      // 1. Resolve Class
      let [cRows] = await pool.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, className]);
      let classId = cRows.length > 0 ? cRows[0].id : null;
      if (!classId) {
        const [cIns] = await pool.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, className]);
        classId = cIns.insertId;
      }

      // 2. Resolve Section
      let [sRows] = await pool.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, section]);
      let sectionId = sRows.length > 0 ? sRows[0].id : null;
      if (!sectionId) {
        const [sIns] = await pool.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, section]);
        sectionId = sIns.insertId;
      }

      // 3. Resolve Subject
      let [subRows] = await pool.query('SELECT id FROM subjects WHERE school_id = ? AND name = ?', [schoolId, subjectName]);
      let subjectId = subRows.length > 0 ? subRows[0].id : null;
      if (!subjectId) {
        const [subIns] = await pool.query('INSERT INTO subjects (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, subjectName]);
        subjectId = subIns.insertId;
      }

      // 4. CONFLICT DETECTION: Teacher double-booking check
      if (teacherId) {
        const [teacherConflict] = await pool.query(
          `SELECT tt.*, c.name AS className, sec.name AS section
           FROM timetables tt
           JOIN classes c ON tt.class_id = c.id
           JOIN sections sec ON tt.section_id = sec.id
           WHERE tt.school_id = ? AND tt.teacher_id = ? AND tt.day_of_week = ? AND tt.period_number = ?
             AND (tt.class_id != ? OR tt.section_id != ?)`,
          [schoolId, teacherId, dayOfWeek, periodNumber, classId, sectionId]
        );
        if (teacherConflict.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Conflict Detected: This teacher is already scheduled for ${teacherConflict[0].className}-${teacherConflict[0].section} during Period ${periodNumber} on ${dayOfWeek}!`
          });
        }
      }

      // 5. CONFLICT DETECTION: Room double-booking check
      if (room && room.trim().length > 0) {
        const [roomConflict] = await pool.query(
          `SELECT tt.*, c.name AS className, sec.name AS section
           FROM timetables tt
           JOIN classes c ON tt.class_id = c.id
           JOIN sections sec ON tt.section_id = sec.id
           WHERE tt.school_id = ? AND tt.room = ? AND tt.day_of_week = ? AND tt.period_number = ?
             AND (tt.class_id != ? OR tt.section_id != ?)`,
          [schoolId, room.trim(), dayOfWeek, periodNumber, classId, sectionId]
        );
        if (roomConflict.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Conflict Detected: Room "${room}" is already reserved for ${roomConflict[0].className}-${roomConflict[0].section} during Period ${periodNumber} on ${dayOfWeek}!`
          });
        }
      }

      // 6. Upsert Period
      const [existing] = await pool.query(
        'SELECT id FROM timetables WHERE school_id = ? AND class_id = ? AND section_id = ? AND day_of_week = ? AND period_number = ?',
        [schoolId, classId, sectionId, dayOfWeek, periodNumber]
      );

      const start = startTime || '09:00:00';
      const end = endTime || '09:45:00';

      if (existing.length > 0) {
        await pool.query(
          `UPDATE timetables SET subject_id = ?, teacher_id = ?, start_time = ?, end_time = ?, room = ?, status = 'published'
           WHERE id = ?`,
          [subjectId, teacherId || null, start, end, room || '', existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO timetables (school_id, class_id, section_id, subject_id, teacher_id, day_of_week, period_number, start_time, end_time, room, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
          [schoolId, classId, sectionId, subjectId, teacherId || null, dayOfWeek, periodNumber, start, end, room || '']
        );
      }
    } else if (memDb) {
      memDb.timetables.push({
        id: Date.now(),
        school_id: schoolId,
        className,
        section,
        subject_name: subjectName,
        day_of_week: dayOfWeek,
        period_number: periodNumber,
        start_time: startTime || '09:00:00',
        end_time: endTime || '09:45:00',
        room: room || 'Room 101'
      });
      db.saveLocalDb();
    }

    return res.json({ success: true, message: `Period ${periodNumber} scheduled successfully with zero conflicts!` });
  } catch (err) {
    console.error('Timetable entry error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save timetable period' });
  }
});

// DELETE /api/timetables/entry/:id
router.delete('/entry/:id', authenticate, async (req, res) => {
  const schoolId = req.user.schoolId || 1;
  const isMySql = db.isMySqlConnected();
  const pool = db.getPool();
  const memDb = db.getMemoryDb();

  try {
    if (isMySql && pool) {
      await pool.query('DELETE FROM timetables WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
    } else if (memDb) {
      memDb.timetables = (memDb.timetables || []).filter(t => t.id != req.params.id);
      db.saveLocalDb();
    }
    return res.json({ success: true, message: 'Period removed from schedule' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete period' });
  }
});

module.exports = router;
