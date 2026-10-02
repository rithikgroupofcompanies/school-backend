require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function showSummary() {
  console.log('Connecting to Hostinger MySQL database...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('✅ Connection established successfully!\n');
    console.log('====================================================');
    console.log('         HOSTINGER DATABASE STATUS REPORT            ');
    console.log('====================================================');

    // 1. Users count by role
    const [roles] = await connection.query(
      'SELECT role, COUNT(*) as count FROM users WHERE is_active = 1 GROUP BY role'
    );
    console.log('\n👥 ACTIVE USERS IN SYSTEM:');
    roles.forEach(r => {
      console.log(`   - ${r.role.toUpperCase()}: ${r.count} registered`);
    });

    // 2. Classes and Sections
    const [classes] = await connection.query('SELECT COUNT(*) as count FROM classes');
    const [sections] = await connection.query('SELECT COUNT(*) as count FROM sections');
    console.log(`\n🏫 STRUCTURE:`);
    console.log(`   - Classes: ${classes[0].count}`);
    console.log(`   - Sections: ${sections[0].count}`);

    // 3. Students List
    const [students] = await connection.query(`
      SELECT s.id, s.name, s.student_uid as email, c.name as className, sec.name as section
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.is_active = 1
    `);
    console.log(`\n👨‍🎓 STUDENTS REGISTRY (${students.length} Total):`);
    if (students.length === 0) {
      console.log('   (No active students registered yet)');
    } else {
      students.forEach((st, idx) => {
        console.log(`   ${idx + 1}. Name: "${st.name}" | Email: "${st.email}" | Class: ${st.className || 'N/A'}-${st.section || 'N/A'}`);
      });
    }

    // 4. Other Academic Logs
    const [attendance] = await connection.query('SELECT COUNT(*) as count FROM attendance');
    const [homework] = await connection.query('SELECT COUNT(*) as count FROM homework');
    const [tests] = await connection.query('SELECT COUNT(*) as count FROM tests');
    const [remarks] = await connection.query('SELECT COUNT(*) as count FROM behaviour');
    const [whatsapp] = await connection.query('SELECT COUNT(*) as count FROM whatsapp_logs');

    console.log('\n📊 ACADEMIC & COMMUNICATION DATA COUNTS:');
    console.log(`   - Attendance Records: ${attendance[0].count} entries`);
    console.log(`   - Homework Assignments: ${homework[0].count} entries`);
    console.log(`   - Created Tests: ${tests[0].count} entries`);
    console.log(`   - Behaviour Remarks Logged: ${remarks[0].count} entries`);
    console.log(`   - WhatsApp Messages Dispatched: ${whatsapp[0].count} log entries`);
    console.log('====================================================\n');

    await connection.end();
  } catch (error) {
    console.error('\n❌ Error connecting to database:', error.message);
  }
}

showSummary();
