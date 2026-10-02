require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function dumpUsers() {
  console.log('🔍 Checking User Database...');

  // Try MySQL connection first
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
      database: process.env.DB_NAME || 'u469762185_school_app',
      port: parseInt(process.env.DB_PORT || '3306'),
      connectTimeout: 2000
    });
    
    console.log('✅ Connected to MySQL Database.');
    const [users] = await connection.query(`
      SELECT u.id, u.username, u.role, u.full_name, u.is_active, u.password_hash,
             s.roll_number, c.name AS className, sec.name AS section
      FROM users u
      LEFT JOIN students s ON u.username = s.student_uid AND s.is_active = 1
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE u.is_active = 1
      ORDER BY u.id ASC
    `);

    printUsers(users, 'MySQL Database');
    await connection.end();
    return;
  } catch (error) {
    // Fallback to local storage JSON
    const localDbPath = path.join(__dirname, 'local_database.json');
    if (fs.existsSync(localDbPath)) {
      try {
        const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
        const users = (db.users || []).filter(u => u.is_active === 1).map(u => {
          const s = (db.students || []).find(stu => stu.student_uid === u.username && stu.is_active === 1);
          const c = s ? (db.classes || []).find(cls => cls.id === s.class_id) : null;
          const sec = s ? (db.sections || []).find(sc => sc.id === s.section_id) : null;
          return {
            id: u.id,
            username: u.username,
            role: u.role,
            full_name: u.full_name,
            is_active: u.is_active,
            password_hash: u.password_hash,
            roll_number: s ? s.roll_number : null,
            className: c ? c.name : null,
            section: sec ? sec.name : null
          };
        });
        printUsers(users, 'Local Database (File Storage)');
        return;
      } catch (e) {}
    }
    console.error('❌ Could not retrieve user records:', error.message);
  }
}

function printUsers(users, source) {
  console.log(`\n======================================================`);
  console.log(`          ACTIVE USERS IN ${source.toUpperCase()}        `);
  console.log(`======================================================`);
  if (!users || users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach((user, idx) => {
      const isBcrypt = user.password_hash && (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$'));
      console.log(`[${idx + 1}] ID: ${user.id} | Name: "${user.full_name}"`);
      console.log(`    Email/Username: ${user.username}`);
      console.log(`    Role:           ${user.role.toUpperCase()}`);
      if (user.role === 'student') {
        console.log(`    Class & Section:${user.className || 'N/A'}-${user.section || 'N/A'}`);
        console.log(`    Roll Number:    ${user.roll_number || 'N/A'}`);
      }
      console.log(`    Password:       ${isBcrypt ? 'Encrypted (Bcrypt)' : user.password_hash}`);
      console.log(`------------------------------------------------------`);
    });
    console.log(`Total Active Users: ${users.length}\n`);
  }
}

dumpUsers();
