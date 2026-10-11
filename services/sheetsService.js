const db = require('../config/db');

class SheetsService {
  /**
   * Generates formatted spreadsheet datasets for non-technical school admins
   * Returns data structured for Google Sheets tabs
   */
  async exportSchoolDataToSheets(schoolId) {
    const isMySql = db.isMySqlConnected();
    const pool = db.getPool();
    const memDb = db.getMemoryDb();

    let students = [];
    let attendance = [];
    let marks = [];
    let staff = [];

    if (isMySql && pool) {
      const [stuRows] = await pool.query(
        `SELECT s.id, s.admission_number, s.name, c.name AS class_name, sec.name AS section_name, s.roll_number, s.dob, s.gender, s.is_active
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE s.school_id = ?`,
        [schoolId]
      );
      students = stuRows;

      const [attRows] = await pool.query(
        `SELECT a.date, s.name AS student_name, c.name AS class_name, sec.name AS section_name, a.status
         FROM attendance a
         JOIN students s ON a.student_id = s.id
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN sections sec ON s.section_id = sec.id
         WHERE a.school_id = ?
         ORDER BY a.date DESC LIMIT 500`,
        [schoolId]
      );
      attendance = attRows;

      const [markRows] = await pool.query(
        `SELECT t.name AS exam_name, s.name AS student_name, sub.name AS subject_name, tm.marks_obtained, tm.max_marks
         FROM test_marks tm
         JOIN tests t ON tm.test_id = t.id
         JOIN students s ON tm.student_id = s.id
         JOIN subjects sub ON t.subject_id = sub.id
         WHERE t.school_id = ?`,
        [schoolId]
      );
      marks = markRows;

      const [staffRows] = await pool.query(
        `SELECT u.id, u.full_name, u.username AS email, sm.role, sm.designation, sm.department
         FROM school_memberships sm
         JOIN users u ON sm.user_id = u.id
         WHERE sm.school_id = ?`,
        [schoolId]
      );
      staff = staffRows;
    } else if (memDb) {
      students = (memDb.students || []).filter(s => s.school_id === schoolId);
      attendance = memDb.attendance || [];
      marks = memDb.test_marks || [];
      staff = (memDb.users || []).filter(u => u.role === 'teacher' || u.role === 'school_admin');
    }

    // Structure data for Google Sheets Tabs
    const sheetsExport = {
      spreadsheetTitle: `EduNexus_School_${schoolId}_Master_Data`,
      generatedAt: new Date().toISOString(),
      tabs: {
        Students_Directory: {
          headers: ['Student ID', 'Admission No', 'Full Name', 'Class', 'Section', 'Roll No', 'DOB', 'Gender', 'Status'],
          rows: students.map(s => [
            s.id,
            s.admission_number || `ADM-${s.id}`,
            s.name || s.full_name || '',
            s.class_name || s.className || '',
            s.section_name || s.section || '',
            s.roll_number || s.rollNumber || '',
            s.dob || '',
            s.gender || 'Not Specified',
            s.is_active ? 'Active' : 'Inactive'
          ])
        },
        Daily_Attendance: {
          headers: ['Date', 'Student Name', 'Class', 'Section', 'Status'],
          rows: attendance.map(a => [
            a.date || '',
            a.student_name || '',
            a.class_name || '',
            a.section_name || '',
            a.status || 'Present'
          ])
        },
        Exams_Marksheets: {
          headers: ['Exam Name', 'Student Name', 'Subject', 'Marks Obtained', 'Max Marks', 'Percentage'],
          rows: marks.map(m => [
            m.exam_name || '',
            m.student_name || '',
            m.subject_name || '',
            m.marks_obtained || 0,
            m.max_marks || 100,
            `${Math.round(((m.marks_obtained || 0) / (m.max_marks || 100)) * 100)}%`
          ])
        },
        Staff_Registry: {
          headers: ['Staff ID', 'Full Name', 'Email', 'Role', 'Designation', 'Department'],
          rows: staff.map(st => [
            st.id,
            st.full_name || '',
            st.email || st.username || '',
            st.role || 'Teacher',
            st.designation || 'Staff',
            st.department || 'Academics'
          ])
        }
      }
    };

    return sheetsExport;
  }

  /**
   * Import and validate rows from Google Sheets
   * Supports row-by-row quarantine of invalid data
   */
  async importStudentsFromSheet(schoolId, rows, createdByUserId) {
    const isMySql = db.isMySqlConnected();
    const pool = db.getPool();
    const memDb = db.getMemoryDb();

    const imported = [];
    const quarantined = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Account for header row

      const name = row.name || row['Full Name'] || row[1];
      const email = row.email || row['Email'] || row[2] || `student_${Date.now()}_${i}@school.edu`;
      const className = row.className || row['Class'] || row[3] || 'Class 10';
      const section = row.section || row['Section'] || row[4] || 'A';
      const rollNumber = row.rollNumber || row['Roll No'] || row[5] || `${i + 1}`;

      if (!name || name.trim().length === 0) {
        quarantined.push({ row: rowNumber, error: 'Student Full Name is required' });
        continue;
      }

      try {
        if (isMySql && pool) {
          // Resolve class and section
          let [cls] = await pool.query('SELECT id FROM classes WHERE school_id = ? AND name = ?', [schoolId, className]);
          let classId = cls.length > 0 ? cls[0].id : null;
          if (!classId) {
            const [cRes] = await pool.query('INSERT INTO classes (school_id, name) VALUES (?, ?)', [schoolId, className]);
            classId = cRes.insertId;
          }

          let [sec] = await pool.query('SELECT id FROM sections WHERE school_id = ? AND class_id = ? AND name = ?', [schoolId, classId, section]);
          let sectionId = sec.length > 0 ? sec[0].id : null;
          if (!sectionId) {
            const [sRes] = await pool.query('INSERT INTO sections (school_id, class_id, name) VALUES (?, ?, ?)', [schoolId, classId, section]);
            sectionId = sRes.insertId;
          }

          const [insRes] = await pool.query(
            `INSERT INTO students (school_id, student_uid, admission_number, name, roll_number, class_id, section_id, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [schoolId, email.trim(), `ADM-${Date.now()}-${i}`, name.trim(), rollNumber.toString(), classId, sectionId]
          );

          imported.push({ id: insRes.insertId, name, rollNumber });
        } else if (memDb) {
          const newStudent = {
            id: Date.now() + i,
            school_id: schoolId,
            student_uid: email.trim(),
            admission_number: `ADM-${Date.now()}-${i}`,
            name: name.trim(),
            roll_number: rollNumber.toString(),
            className,
            section,
            is_active: 1
          };
          memDb.students.push(newStudent);
          imported.push(newStudent);
        }
      } catch (err) {
        quarantined.push({ row: rowNumber, error: err.message });
      }
    }

    if (!isMySql) db.saveLocalDb();

    return {
      totalRows: rows.length,
      successCount: imported.length,
      quarantinedCount: quarantined.length,
      quarantinedErrors: quarantined
    };
  }
}

module.exports = new SheetsService();
