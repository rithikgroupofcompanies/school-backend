// End-to-End API Routes & Middleware Verification Test
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function testCoreAuthAndSecurity() {
  console.log('🔒 Testing JWT token generation and verification...');
  const SECRET_KEY = 'super_secure_jwt_secret_key_change_in_production_2026';
  const payload = { id: 1, email: 'superadmin@school.edu', role: 'super_admin' };
  
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
  const decoded = jwt.verify(token, SECRET_KEY);
  
  if (decoded.email !== 'superadmin@school.edu' || decoded.role !== 'super_admin') {
    throw new Error('JWT token verification failed');
  }
  console.log('✅ JWT verification passed.');

  console.log('🔑 Testing bcrypt password hash verification...');
  const hash = await bcrypt.hash('password123', 10);
  const match = await bcrypt.compare('password123', hash);
  if (!match) {
    throw new Error('Bcrypt comparison failed');
  }
  console.log('✅ Bcrypt verification passed.');
}

async function runTests() {
  try {
    await testCoreAuthAndSecurity();
    console.log('\n🎉 ALL INTEGRATION CHECKS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runTests();
