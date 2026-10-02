require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function upgradeSuperAdmin() {
  console.log('Connecting to database...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });

    console.log('Connected.\n');

    // Step 1: Update the role to super_admin
    const [result] = await connection.query(
      "UPDATE users SET role = 'super_admin' WHERE username = 'superadmin@school.com'",
    );

    if (result.affectedRows > 0) {
      console.log('✅ Role updated: "admin" → "super_admin" for superadmin@school.com');
    } else {
      console.log('❌ User "superadmin@school.com" not found.');
    }

    // Step 2: Reset password to a known value
    const newPassword = 'password123';
    const hash = await bcrypt.hash(newPassword, 10);
    await connection.query(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hash, 'superadmin@school.com']
    );
    console.log(`✅ Password reset to: "${newPassword}"`);

    // Step 3: Verify
    const [users] = await connection.query(
      "SELECT id, username, role, full_name, is_active FROM users WHERE username = 'superadmin@school.com'"
    );
    if (users.length > 0) {
      console.log('\n--- Updated User ---');
      console.log(`  Email: ${users[0].username}`);
      console.log(`  Role:  ${users[0].role}`);
      console.log(`  Name:  ${users[0].full_name}`);
      console.log(`  Active: ${users[0].is_active}`);
    }

    console.log('\n🎉 Done! You can now log in with:');
    console.log('   Role:     Admin');
    console.log('   Email:    superadmin@school.com');
    console.log('   Password: password123');

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

upgradeSuperAdmin();
