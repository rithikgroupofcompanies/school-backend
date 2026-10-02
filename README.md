# School Management System - Backend API

Robust REST API backend built with Express.js, MySQL (phpMyAdmin), and JWT authentication.

## 🚀 Features
- **Authentication**: JWT-based login with bcrypt password hashing for Super Admin, Admin, Teacher, Student, and Parent.
- **Database Support**: Full MySQL database with automated table verification and fallback storage for offline development.
- **Modules**:
  - Student Management & Roll Numbers
  - Classes & Sections (1–12, Sections A–D)
  - Daily Attendance Tracking
  - Exams, Tests & Marksheets
  - Homework & Assignment Submissions
  - Student Behaviour & Discipline Tracking
  - WhatsApp Notification Logs & Audit Logs

---

## 🛠️ Local Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your MySQL database credentials:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=school_management
   JWT_SECRET=your_jwt_secret_key_here
   ```

3. **Import Database Schema**:
   Import `schema.sql` into phpMyAdmin or run:
   ```bash
   mysql -u root -p school_management < schema.sql
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

---

## 🌐 Hostinger VPS Deployment

1. Clone this repository into `/var/www/school-backend`:
   ```bash
   git clone https://github.com/rithikgroupofcompanies/school-backend.git /var/www/school-backend
   cd /var/www/school-backend
   npm install --production
   ```
2. Create your `.env` file with production MySQL credentials.
3. Start and persist using PM2:
   ```bash
   pm2 start server.js --name "school-backend"
   pm2 save
   pm2 startup
   ```
