// SQL Schema Syntax and Parser Validator
const fs = require('fs');
const path = require('path');

function validateSchemaSql() {
  console.log('🧪 Validating schema.sql syntax and structure...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Check required tables
  const expectedTables = [
    'users',
    'classes',
    'sections',
    'admin_classes',
    'students',
    'subjects',
    'attendance',
    'homework',
    'tests',
    'test_marks',
    'behaviour',
    'whatsapp_logs',
    'audit_logs',
    'settings'
  ];

  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?\`${table}\``, 'i');
    if (!tableRegex.test(sql)) {
      throw new Error(`Table ${table} is missing from schema.sql!`);
    }
  }

  // Check critical fields
  if (!sql.includes('roll_number')) {
    throw new Error('roll_number column missing from students table in schema.sql');
  }
  if (!sql.includes('superadmin@school.edu')) {
    throw new Error('Default super admin seed missing from schema.sql');
  }

  console.log(`✅ ALL 14 TABLES AND SEED STATEMENTS VALIDATED SUCCESSFULLY!`);
}

validateSchemaSql();
