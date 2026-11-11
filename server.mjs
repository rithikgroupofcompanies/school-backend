import http from 'http';
import { parse } from 'url';

const PORT = 8000;

// In-Memory Database representing MySQL Schema for Rithik Group
const DB = {
  schools: [
    {
      id: 1,
      school_code: 'SCH-CHN-001',
      name: 'Rithik Matriculation Higher Secondary School, Chennai',
      short_name: 'RMHSS',
      board: 'State Board',
      school_type: 'private',
      medium: 'English / Tamil',
      city: 'Chennai',
      state: 'Tamil Nadu',
      official_email: 'chennai@rithikgroup.com',
      phone: '+91 44 28123456',
      principal_name: 'Dr. S. Rangarajan, M.Sc., B.Ed.',
      onboarding_status: 'approved',
      account_status: 'active',
      student_count: 1240,
      staff_count: 68
    },
    {
      id: 2,
      school_code: 'SCH-CBE-002',
      name: 'Rithik International Academy, Coimbatore',
      short_name: 'RIA',
      board: 'CBSE',
      school_type: 'international',
      medium: 'English',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      official_email: 'coimbatore@rithikgroup.com',
      phone: '+91 422 2567890',
      principal_name: 'Mrs. Jayanthi Natarajan, M.A., M.Ed.',
      onboarding_status: 'approved',
      account_status: 'active',
      student_count: 890,
      staff_count: 52
    },
    {
      id: 3,
      school_code: 'SCH-MDU-003',
      name: 'Rithik Global Public School, Madurai',
      short_name: 'RGPS',
      board: 'CBSE',
      school_type: 'private',
      medium: 'English / Tamil',
      city: 'Madurai',
      state: 'Tamil Nadu',
      official_email: 'madurai@rithikgroup.com',
      phone: '+91 452 2432100',
      principal_name: 'Mr. M. Anand, M.Sc., M.Phil.',
      onboarding_status: 'approved',
      account_status: 'active',
      student_count: 650,
      staff_count: 40
    },
    {
      id: 4,
      school_code: 'SCH-TRZ-004',
      name: 'Rithik Vidyalaya High School, Tiruchirappalli',
      short_name: 'RVHS',
      board: 'Matriculation',
      school_type: 'aided',
      medium: 'Tamil / English',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      official_email: 'trichy@rithikgroup.com',
      phone: '+91 431 2789123',
      principal_name: 'Mrs. K. Meenakshi, M.A., B.Ed.',
      onboarding_status: 'submitted',
      account_status: 'pending',
      student_count: 420,
      staff_count: 28
    }
  ],
  students: [
    { id: 101, school_id: 1, admission_no: 'SCH-CHN-001/101', full_name: 'Aarav Sharma', class: 'Grade 10', section: 'A', status: 'active', guardian_name: 'Mr. K. Raman', guardian_email: 'parent.aarav@greenwood.edu', guardian_phone: '+91 98401 99881', attendance_pct: 96, term_gpa: 'A+ (92%)', last_report_sent: '2026-10-20 09:30' },
    { id: 102, school_id: 1, admission_no: 'SCH-CHN-001/102', full_name: 'Ananya Raman', class: 'Grade 10', section: 'A', status: 'active', guardian_name: 'Mrs. V. Raman', guardian_email: 'raman.ananya.parent@gmail.com', guardian_phone: '+91 98401 99882', attendance_pct: 98, term_gpa: 'O (98%)', last_report_sent: '2026-10-20 09:30' },
    { id: 103, school_id: 1, admission_no: 'SCH-CHN-001/103', full_name: 'Dinesh Kumar', class: 'Grade 10', section: 'A', status: 'active', guardian_name: 'Mr. R. Kumar', guardian_email: 'dinesh.kumar.father@yahoo.com', guardian_phone: '+91 98401 99883', attendance_pct: 84, term_gpa: 'B+ (78%)', last_report_sent: null },
    { id: 204, school_id: 2, admission_no: 'SCH-CBE-002/204', full_name: 'Diya Natarajan', class: 'Grade 8', section: 'B', status: 'active', guardian_name: 'Mrs. Priya Natarajan', guardian_email: 'priya.natarajan@gmail.com', guardian_phone: '+91 98402 77665', attendance_pct: 94, term_gpa: 'A (88%)', last_report_sent: '2026-10-18 14:15' },
  ],
  teachers: [
    { id: 1, school_id: 1, employee_id: 'EMP-CHN-011', name: 'Mr. R. Suresh, M.Sc., B.Ed.', subject: 'Mathematics', phone: '+91 98401 23456', sections: ['Grade 10 - Section A'] },
    { id: 2, school_id: 1, employee_id: 'EMP-CHN-012', name: 'Dr. K. Meena, Ph.D.', subject: 'Physics', phone: '+91 98402 34567', sections: ['Grade 10 - Section A', 'Grade 11 - Science A'] },
    { id: 3, school_id: 1, employee_id: 'EMP-CHN-013', name: 'Mrs. S. Lakshmi, M.Sc.', subject: 'Chemistry', phone: '+91 98403 45678', sections: ['Grade 10 - Section A'] },
    { id: 4, school_id: 1, employee_id: 'EMP-CHN-014', name: 'Mr. M. Anand, M.A.', subject: 'English', phone: '+91 98404 56789', sections: ['Grade 10 - Section A'] },
  ],
  audit_logs: [
    { id: 1, action: 'auth.login_success', actor: 'Super Administrator', email: 'rithikgroupofcompanies@gmail.com', created_at: new Date().toISOString() },
    { id: 2, action: 'school.approved_and_provisioned', actor: 'Super Administrator', email: 'rithikgroupofcompanies@gmail.com', created_at: new Date().toISOString() },
  ]
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-School-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const { pathname } = parse(req.url, true);

  // Helper to send JSON
  const sendJSON = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Helper to parse JSON body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsedBody = {};
    if (body) {
      try { parsedBody = JSON.parse(body); } catch (_) {}
    }

    // 1. AUTH LOGIN
    if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
      const { email, role, school_id } = parsedBody;

      const targetSchool = DB.schools.find(s => s.id === Number(school_id)) || DB.schools[0];
      const token = 'rithik-bearer-jwt-' + Buffer.from(email || 'user').toString('base64');

      let userType = 'school';
      let userName = 'Staff Member';

      if (role === 'Super Admin') {
        userType = 'platform';
        userName = 'Super Administrator';
      } else if (role === 'Operations Staff') {
        userType = 'platform';
        userName = 'Platform Ops Auditor';
      } else if (role === 'School Admin') {
        userName = 'Campus Principal';
      } else if (role === 'Parent') {
        userName = email.includes('raman') ? 'Mr. K. Raman' : 'Mrs. Priya Natarajan';
      }

      DB.audit_logs.unshift({
        id: DB.audit_logs.length + 1,
        action: `auth.login_${role ? role.toLowerCase().replace(/ /g, '_') : 'success'}`,
        actor: userName,
        email: email,
        created_at: new Date().toISOString()
      });

      return sendJSON(200, {
        token,
        user: {
          id: 1,
          name: userName,
          email: email,
          user_type: userType
        },
        active_membership: {
          school: targetSchool,
          role: { name: role || 'School Admin', scope: userType === 'platform' ? 'platform' : 'school' }
        }
      });
    }

    // 2. AUTH ME
    if (pathname === '/api/v1/auth/me' && req.method === 'GET') {
      return sendJSON(200, {
        user: { id: 1, name: 'Active User', email: 'user@rithikgroup.com', user_type: 'school' },
        school: DB.schools[0],
        role: 'School Admin',
        permissions: ['*']
      });
    }

    // 3. PLATFORM DASHBOARD STATS
    if (pathname === '/api/v1/platform/dashboard/stats' && req.method === 'GET') {
      return sendJSON(200, {
        metrics: {
          total_schools: DB.schools.length,
          active_schools: DB.schools.filter(s => s.account_status === 'active').length,
          pending_approvals: DB.schools.filter(s => s.onboarding_status !== 'approved').length,
          total_platform_staff: 8,
        },
        recent_schools: DB.schools,
        recent_audit_logs: DB.audit_logs.slice(0, 10),
      });
    }

    // 4. PLATFORM SCHOOLS
    if (pathname === '/api/v1/platform/schools' && req.method === 'GET') {
      return sendJSON(200, DB.schools);
    }

    // 5. SCHOOL STUDENTS
    if (pathname === '/api/v1/school/students' && req.method === 'GET') {
      return sendJSON(200, DB.students);
    }

    // 5b. BULK INGEST STUDENTS (From CSV / Google Sheets)
    if (pathname === '/api/v1/school/students/bulk' && req.method === 'POST') {
      const incoming = parsedBody?.students || [];
      const schoolId = parseInt(req.headers['x-school-id']) || 1;
      let addedCount = 0;

      incoming.forEach(item => {
        if (!item.admission_no && !item.full_name) return;
        const existingIdx = DB.students.findIndex(s => s.admission_no === item.admission_no);
        const record = {
          id: existingIdx >= 0 ? DB.students[existingIdx].id : DB.students.length + 101,
          school_id: schoolId,
          admission_no: item.admission_no || `SCH-CHN-001/${DB.students.length + 101}`,
          full_name: item.full_name || 'Unnamed Student',
          class: item.class || 'Grade 10',
          section: item.section || 'A',
          status: 'active',
          guardian_name: item.guardian_name || '',
          guardian_email: item.guardian_email || '',
          guardian_phone: item.guardian_phone || '',
          attendance_pct: 95,
          term_gpa: 'A (85%)',
          last_report_sent: null
        };

        if (existingIdx >= 0) {
          DB.students[existingIdx] = { ...DB.students[existingIdx], ...record };
        } else {
          DB.students.push(record);
        }
        addedCount++;
      });

      DB.audit_logs.unshift({
        id: DB.audit_logs.length + 1,
        action: 'students.bulk_google_sheets_synced',
        actor: 'Google Sheets Integration',
        email: 'rithikgroupofcompanies@gmail.com',
        created_at: new Date().toISOString()
      });

      return sendJSON(200, {
        success: true,
        message: `Successfully synced ${addedCount} student record(s) into School ERP database.`,
        synced_count: addedCount,
        students: DB.students
      });
    }

    // 6. OPS ASSIGNED SCHOOLS
    if (pathname === '/api/v1/ops/my-assigned-schools' && req.method === 'GET') {
      return sendJSON(200, DB.schools.slice(0, 3));
    }

    // 7. SEND PARENT REPORT CARDS & ATTENDANCE DIGEST
    if (pathname === '/api/v1/academics/send-parent-reports' && req.method === 'POST') {
      const studentIds = parsedBody?.student_ids || [];
      const term = parsedBody?.term || 'Term 1 Mid-Term';
      const updatedStudents = [];

      DB.students.forEach(st => {
        if (studentIds.length === 0 || studentIds.includes(st.id)) {
          st.last_report_sent = new Date().toLocaleString();
          updatedStudents.push(st);
        }
      });

      DB.audit_logs.unshift({
        id: DB.audit_logs.length + 1,
        action: 'academics.parent_report_dispatched',
        actor: 'Academic Office',
        email: 'academics@rithikgroup.com',
        created_at: new Date().toISOString()
      });

      return sendJSON(200, {
        success: true,
        message: `Successfully dispatched academic report card and attendance summary to ${updatedStudents.length} parent(s).`,
        dispatched_count: updatedStudents.length,
        term: term,
        students: updatedStudents
      });
    }

    // 7b. DISPATCH PARENT WHATSAPP DIGEST & REPORT
    if (pathname === '/api/v1/academics/send-whatsapp-reports' && req.method === 'POST') {
      const { student_id, parent_phone, term } = parsedBody || {};
      const student = DB.students.find(s => s.id === Number(student_id));

      DB.audit_logs.unshift({
        id: DB.audit_logs.length + 1,
        action: 'academics.parent_whatsapp_dispatched',
        actor: 'Academic Office',
        email: parent_phone || 'WhatsApp Gateway',
        created_at: new Date().toISOString()
      });

      return sendJSON(200, {
        success: true,
        message: `WhatsApp academic summary queued and dispatched to ${parent_phone || 'Parent'}.`,
        student: student || null,
        term: term || 'Current Term'
      });
    }

    // 8. UPDATE PARENT CONTACT & EMAIL ID
    if (pathname.startsWith('/api/v1/school/students/') && pathname.endsWith('/parent-contact') && req.method === 'PUT') {
      const parts = pathname.split('/');
      const studentId = parseInt(parts[5]);
      const student = DB.students.find(s => s.id === studentId);

      if (!student) {
        return sendJSON(404, { message: 'Student record not found.' });
      }

      if (parsedBody.guardian_name) student.guardian_name = parsedBody.guardian_name;
      if (parsedBody.guardian_email) student.guardian_email = parsedBody.guardian_email;
      if (parsedBody.guardian_phone) student.guardian_phone = parsedBody.guardian_phone;

      DB.audit_logs.unshift({
        id: DB.audit_logs.length + 1,
        action: 'student.parent_contact_updated',
        actor: 'Staff Admin',
        email: student.guardian_email,
        created_at: new Date().toISOString()
      });

      return sendJSON(200, {
        success: true,
        message: 'Parent contact details updated successfully.',
        student
      });
    }

    // Fallback 404
    sendJSON(404, { message: 'API Endpoint Not Found' });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Rithik Group Multi-School ERP API Server active on http://127.0.0.1:${PORT}`);
});
