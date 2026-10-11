# Google Sheets Integration Guide for Non-Technical School Admins

## 1. Purpose
Non-technical administrators often prefer managing and reviewing student, attendance, and exam marks in **Google Sheets**.
EduNexus V2 provides an automated, secure Google Sheets synchronization layer that bridges the Hostinger MySQL database and Google Sheets.

---

## 2. Supported Google Sheets Tabs

When a school enables Google Sheets sync, EduNexus automatically structures a dedicated Google Spreadsheet with standardized sheets:

| Sheet Tab | Primary Function | Columns |
| :--- | :--- | :--- |
| **`Students_Directory`** | Master list of all admitted students | Admission No, Full Name, Class, Section, Roll No, DOB, Gender, Primary Guardian, Phone, Status |
| **`Daily_Attendance`** | Attendance logs by date | Date, Student ID, Student Name, Class, Section, Status (Present/Absent/Late), Marked By |
| **`Exams_Marksheets`** | Consolidated student marksheets | Exam Name, Student ID, Student Name, Class, Subject, Marks Obtained, Max Marks, Percentage |
| **`Staff_Registry`** | Directory of teachers & administrators | Staff ID, Full Name, Role, Email, Designation, Department, Assigned Subjects, Status |

---

## 3. Two-Way Synchronization Architecture

### A. Database ➔ Google Sheets (Outbound Sync)
- **Automatic Sync**: Triggers on scheduled intervals or on-demand when an admin clicks **"Sync to Google Sheets"** in the portal.
- **Header Formatting**: Automatically locks header rows, applies filters, and bolds summary rows.
- **Safety**: Generates read/write links only for authorized school administrators.

### B. Google Sheets ➔ Database (Bulk Import with Quarantine)
- **Row-by-Row Validation**:
  - Checks for valid Class and Section names.
  - Ensures Roll Numbers and Admission Numbers are unique within the school.
  - Formats phone numbers and dates safely.
- **Quarantine on Error**: If row 14 has an invalid date or duplicate email, the system imports rows 1-13 safely, skips row 14, and logs the specific cell error in the **Sync Audit Report**.
- **Idempotency**: Prevents duplicate entries on repeated imports.

---

## 4. Setup Instructions for School Admins
1. Navigate to **School Admin Portal > Google Sheets Sync**.
2. Click **"Connect Google Sheet"** and provide the Google Spreadsheet URL or Service Account email.
3. Choose the sync direction:
   - **Export to Sheets**: Writes current database state into the spreadsheet.
   - **Import from Sheets**: Validates spreadsheet rows and updates MySQL records.
4. View the real-time **Sync History & Audit Log** to verify row counts and any quarantined errors.
