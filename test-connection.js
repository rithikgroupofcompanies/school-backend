require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('Testing MySQL Connection...');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  console.log(`Port: ${process.env.DB_PORT || 3306}`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('\n✅ SUCCESS: Connected to the database successfully!');
    
    const [rows] = await connection.query('SHOW TABLES');
    console.log(`Found ${rows.length} tables in database.`);
    
    await connection.end();
  } catch (error) {
    console.error('\n❌ ERROR: Connection failed!');
    console.error(error.message);
    console.log('\n💡 Tip: If you are connecting remotely to Hostinger, make sure you have:');
    console.log('1. Allowed your IP address or "%" in the Hostinger Remote MySQL settings.');
    console.log('2. Entered the correct Host/IP. Hostinger remote hosts are often specific IP addresses or domain names (check your Hostinger database dashboard).');
  }
}

testConnection();
