# EduNexus V2 - Multi-School Management SaaS Architecture

## 1. System Overview
EduNexus V2 is an enterprise-grade, multi-tenant School Management SaaS platform designed to manage multiple educational institutions under a unified, secure infrastructure.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        EduNexus V2 Ecosystem                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌─────────────────────────┐                       ┌──────────────────────┐
│    Frontend App         │                       │    Backend API       │
│  (school-application)   │ ◄── HTTPS/REST/JWT ──►│   (school-backend)   │
│  React 18 + Vite        │                       │  Node.js + Express   │
│  Glassmorphic UI        │                       │  RBAC + Multi-Tenant │
└─────────────────────────┘                       └──────────┬───────────┘
                                                             │
                  ┌──────────────────────────────────────────┼─────────────────────┐
                  ▼                                          ▼                     ▼
      ┌─────────────────────────┐               ┌────────────────────────┐  ┌──────────────┐
      │     MySQL Database      │               │   Google Sheets Sync   │  │  WhatsApp    │
      │     (Hostinger VPS)     │               │   Non-technical Admins │  │  Cloud API   │
      │ Primary Source of Truth │               │ 2-way Data Integration │  │ Notification │
      └─────────────────────────┘               └────────────────────────┘  └──────────────┘
```

---

## 2. Multi-Tenant Architecture & Security
- **Tenant Scope Enforcement**: Every school is assigned a unique `school_id` and unique human-readable `school_code` (e.g., `DYZEN-01`, `OAKRIDGE-02`).
- **Server-Side Enforcement**: The backend server—never client requests—resolves and enforces tenant scope using authenticated JWT tokens and `school_memberships`.
- **Query Scoping**: Every SQL query on school-owned entities (`students`, `staff`, `classes`, `attendance`, `timetables`, `exams`, `marks`) is scoped to `school_id`.

---

## 3. Google Sheets Integration for Non-Technical Admins
School administrators often prefer managing records through spreadsheets. EduNexus V2 provides an integrated Google Sheets synchronization layer:

1. **Database to Sheets (Outbound / Sync)**:
   - Synchronizes database tables (`Students Directory`, `Daily Attendance`, `Exam Marksheets`, `Staff Directory`) into dedicated Google Sheet tabs.
   - Allows school leaders to review data, generate charts, and print reports without touching SQL or complex dashboards.

2. **Sheets to Database (Inbound / Bulk Import)**:
   - Validates rows, data types, and duplicates before importing.
   - Rows with errors are quarantined with readable error descriptions.
   - Successful rows are imported within an atomic database transaction.

---

## 4. Role Hierarchy & Access Boundaries
1. **Super Admin**: Global school onboarding, subscription plans, platform health, global audit logs.
2. **School Admin**: Full management of the single school (classes, sections, staff, students, timetable, exams, fees, sheets sync).
3. **School Sub-Admin**: Delegated management of specific modules (e.g., Admissions only, or Attendance only).
4. **Teacher / Staff**: Assigned classes, daily attendance, marks entry, homework, schedule.
5. **Student**: Profile, timetable, homework, published exam results, attendance.
6. **Parent / Guardian**: Multi-child view for linked children's attendance, marks, homework, and teacher remarks.
