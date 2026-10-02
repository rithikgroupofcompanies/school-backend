require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  console.log('Connecting to database to reset password...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    const newPassword = 'password123';
    const hash = await bcrypt.hash(newPassword, 10);
    
    const [result] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hash, 'superadmin@school.com']
    );
    
    if (result.affectedRows > 0) {
      console.log(`\n✅ SUCCESS: Password for "superadmin@school.com" has been reset to "${newPassword}"`);
    } else {
      console.log('\n❌ ERROR: User "superadmin@school.com" not found in database.');
    }
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ ERROR: Password reset failed!');
    console.error(error.message);
  }
}

resetPassword();
