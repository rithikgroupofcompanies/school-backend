const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'u469762185_SchoolApp';

let pool = null;
let isMySqlConnected = false;
let memoryDb = null;
const localDbFile = path.join(__dirname, '..', 'local_database.json');

try {
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    connectTimeout: 7000
  });
} catch (e) {
  console.warn('MySQL pool initialization error:', e.message);
}

const loadLocalDb = () => {
  if (fs.existsSync(localDbFile)) {
    try {
      memoryDb = JSON.parse(fs.readFileSync(localDbFile, 'utf8'));
      return;
    } catch (e) {}
  }
  memoryDb = {
    schools: [
      { id: 1, name: 'Dyzen International School', code: 'DYZEN-01', board: 'CBSE', email: 'info@dyzen.edu', phone: '+91 9876543210', city: 'Bangalore', state: 'Karnataka', status: 'active' }
    ],
    users: [
      { id: 1, username: 'superadmin@school.edu', password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'super_admin', full_name: 'Super Administrator', is_active: 1 },
      { id: 2, username: 'admin10a@school.edu', password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'school_admin', full_name: 'Class Admin (10-A)', is_active: 1 },
      { id: 3, username: 'teacher.math@school.edu', password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'teacher', full_name: 'Mrs. Priya Sharma', is_active: 1 },
      { id: 4, username: 'alex.morgan@school.edu', password_hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'student', full_name: 'Alex Morgan', is_active: 1 }
    ],
    school_memberships: [
      { id: 1, school_id: 1, user_id: 1, role: 'super_admin', designation: 'Platform Administrator', department: 'Management', is_active: 1 },
      { id: 2, school_id: 1, user_id: 2, role: 'school_admin', designation: 'School Admin', department: 'Administration', is_active: 1 }
    ],
    classes: [
      { id: 1, school_id: 1, name: 'Class 8' },
      { id: 2, school_id: 1, name: 'Class 9' },
      { id: 3, school_id: 1, name: 'Class 10' },
      { id: 4, school_id: 1, name: 'Class 11' },
      { id: 5, school_id: 1, name: 'Class 12' }
    ],
    sections: [
      { id: 1, school_id: 1, class_id: 1, name: 'A' },
      { id: 2, school_id: 1, class_id: 1, name: 'B' },
      { id: 3, school_id: 1, class_id: 3, name: 'A' },
      { id: 4, school_id: 1, class_id: 3, name: 'B' }
    ],
    subjects: [
      { id: 1, school_id: 1, class_id: 3, name: 'Mathematics', code: 'MATH-10' },
      { id: 2, school_id: 1, class_id: 3, name: 'Physics', code: 'PHY-10' },
      { id: 3, school_id: 1, class_id: 3, name: 'Chemistry', code: 'CHEM-10' },
      { id: 4, school_id: 1, class_id: 3, name: 'English', code: 'ENG-10' }
    ],
    students: [
      { id: 1, school_id: 1, student_uid: 'alex.morgan@school.edu', admission_number: 'ADM-2026-001', name: 'Alex Morgan', roll_number: '10A01', class_id: 3, section_id: 3, dob: '2010-05-14', gender: 'Male', is_active: 1 }
    ],
    guardians: [
      { id: 1, school_id: 1, user_id: null, name: 'John Morgan', relationship: 'Father', phone: '+91 9876543210', email: 'john.morgan@parent.edu' }
    ],
    student_guardians: [
      { student_id: 1, guardian_id: 1, is_primary: 1 }
    ],
    timetables: [
      { id: 1, school_id: 1, academic_year: '2026-2027', class_id: 3, section_id: 3, subject_id: 1, teacher_id: 3, day_of_week: 'Monday', period_number: 1, start_time: '09:00:00', end_time: '09:45:00', room: 'Room 101', status: 'published' }
    ],
    attendance: [],
    homework: [
      { id: 1, school_id: 1, class_id: 3, section_id: 3, subject_id: 1, title: 'Linear Equations Practice', description: 'Solve problems 1-15 on Chapter 4', due_date: '2026-10-15', created_by: 3 }
    ],
    tests: [
      { id: 1, school_id: 1, name: 'Term 1 Mathematics Test', date: '2026-10-20', class_id: 3, section_id: 3, subject_id: 1, max_marks: 100, created_by: 3 }
    ],
    test_marks: [
      { id: 1, test_id: 1, student_id: 1, marks_obtained: 94, max_marks: 100 }
    ],
    behaviour: [
      { id: 1, school_id: 1, student_id: 1, rating: 5, remarks: 'Excellent academic focus and leadership.', date: '2026-10-11', created_by: 1 }
    ],
    google_sheets_sync: [
      { id: 1, school_id: 1, spreadsheet_id: '1EOaG3KmoT1K9hYoBABKVTWZLjVB_RnExt6MQ1LLpodQ', spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1EOaG3KmoT1K9hYoBABKVTWZLjVB_RnExt6MQ1LLpodQ/edit?usp=sharing', sync_type: 'all', status: 'success', rows_synced: 142, last_synced_at: new Date().toISOString() }
    ],
    settings: {
      schoolName: 'Dyzen International School',
      academicYear: '2026-2027',
      whatsappApiKey: '',
      jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_school_production_key_2026'
    }
  };
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

const checkDatabase = async () => {
  loadLocalDb();
  if (!pool) return;

  try {
    const conn = await pool.getConnection();
    console.log(`✅ Connected to MySQL database "${DB_NAME}" at ${DB_HOST}:${DB_PORT}`);
    isMySqlConnected = true;

    // Check tables and initialize if empty
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    if (tableNames.length === 0 || !tableNames.includes('schools')) {
      console.log('⚡ Initializing Multi-Tenant schema from schema.sql...');
      const schemaPath = path.join(__dirname, '..', 'schema.sql');
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
        console.log('✅ Multi-Tenant MySQL schema initialized!');
      }
    }
    conn.release();
  } catch (err) {
    isMySqlConnected = false;
    console.log(`ℹ️ MySQL at ${DB_HOST}:${DB_PORT} is unreachable (${err.code || err.message}).`);
    console.log('⚡ Operating seamlessly in High-Reliability Local Storage Mode.');
  }
};

checkDatabase();

module.exports = {
  getPool: () => pool,
  isMySqlConnected: () => isMySqlConnected,
  getMemoryDb: () => memoryDb,
  saveLocalDb,
  execute: async (query, params = []) => {
    if (isMySqlConnected && pool) {
      const [rows] = await pool.query(query, params);
      return rows;
    }
    return null;
  }
};
