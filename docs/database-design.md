# EduNexus V2 - Multi-Tenant Database Design

## 1. Relational Entity Overview
Every entity in EduNexus V2 connects back to a specific `school_id`, guaranteeing complete isolation between institutions.

```
┌──────────────────┐
│     schools      │
└────────┬─────────┘
         │ 1:N
         ├──────────────────────────┬──────────────────────────┬────────────────────────┐
         ▼                          ▼                          ▼                        ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐     ┌──────────────────┐
│   academic_years │       │     classes      │       │     subjects     │     │     students     │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘     └────────┬─────────┘
         │                          │ 1:N                      │                        │ 1:N
         │                          ▼                          │                        ├──────────────┐
         │                 ┌──────────────────┐                │                        ▼              ▼
         │                 │     sections     │                │                 ┌──────────────┐┌──────────────┐
         │                 └────────┬─────────┘                │                 │  attendance  ││  test_marks  │
         │                          │                          │                 └──────────────┘└──────────────┘
         └──────────────────────────┴─────────────┬────────────┘                                       ▲
                                                  ▼                                                    │
                                         ┌──────────────────┐                                          │
                                         │    timetables    │                                          │
                                         └──────────────────┘                                          │
                                                  │                                                    │
                                                  ▼                                                    │
                                         ┌──────────────────┐                                          │
                                         │      tests       │──────────────────────────────────────────┘
                                         └──────────────────┘
```

---

## 2. Table Specifications

### A. Core Multi-Tenant Tables
1. **`schools`**:
   - `id` (INT PK), `name` (VARCHAR 255), `code` (VARCHAR 50 UNIQUE), `logo_url` (VARCHAR 255), `board` (CBSE, ICSE, State), `email` (VARCHAR 191), `phone` (VARCHAR 50), `address` (TEXT), `city` (VARCHAR 100), `state` (VARCHAR 100), `status` (active/suspended), `created_at` (TIMESTAMP).

2. **`users`**:
   - `id` (INT PK), `username` (VARCHAR 191 UNIQUE), `password_hash` (VARCHAR 255), `role` (super_admin, school_admin, sub_admin, teacher, student, parent), `full_name` (VARCHAR 255), `is_active` (TINYINT 1), `created_at` (TIMESTAMP).

3. **`school_memberships`**:
   - `id` (INT PK), `school_id` (INT FK -> schools.id), `user_id` (INT FK -> users.id), `role` (VARCHAR 50), `designation` (VARCHAR 100), `department` (VARCHAR 100), `is_active` (TINYINT 1), `created_at` (TIMESTAMP).

4. **`guardians` & `student_guardians`**:
   - `guardians`: `id` (INT PK), `user_id` (INT FK -> users.id), `name` (VARCHAR 255), `relationship` (Father, Mother, Guardian), `phone` (VARCHAR 50), `email` (VARCHAR 191), `address` (TEXT).
   - `student_guardians`: `student_id` (INT FK -> students.id), `guardian_id` (INT FK -> guardians.id), `is_primary` (TINYINT 1).

### B. Academics & Structure
5. **`classes`**: `id` (INT PK), `school_id` (INT FK), `name` (VARCHAR 100).
6. **`sections`**: `id` (INT PK), `school_id` (INT FK), `class_id` (INT FK), `name` (VARCHAR 50).
7. **`subjects`**: `id` (INT PK), `school_id` (INT FK), `class_id` (INT FK), `name` (VARCHAR 100), `code` (VARCHAR 50).
8. **`students`**: `id` (INT PK), `school_id` (INT FK), `student_uid` (VARCHAR 191), `admission_number` (VARCHAR 50), `name` (VARCHAR 255), `roll_number` (VARCHAR 50), `class_id` (INT FK), `section_id` (INT FK), `dob` (DATE), `gender` (VARCHAR 20), `is_active` (TINYINT 1).

### C. Timetable Engine
9. **`timetables`**:
   - `id` (INT PK), `school_id` (INT FK), `academic_year` (VARCHAR 50), `class_id` (INT FK), `section_id` (INT FK), `subject_id` (INT FK), `teacher_id` (INT FK -> users.id), `day_of_week` (Monday-Saturday), `period_number` (INT), `start_time` (TIME), `end_time` (TIME), `room` (VARCHAR 50), `status` (draft/published).

### D. Daily Records & Marks
10. **`attendance`**: `id` (INT PK), `school_id` (INT FK), `student_id` (INT FK), `date` (DATE), `status` (Present/Absent/Late), `marked_by` (INT FK).
11. **`homework`**: `id` (INT PK), `school_id` (INT FK), `class_id` (INT FK), `section_id` (INT FK), `subject_id` (INT FK), `title` (VARCHAR 255), `description` (TEXT), `due_date` (DATE), `created_by` (INT FK).
12. **`tests`**: `id` (INT PK), `school_id` (INT FK), `name` (VARCHAR 255), `class_id` (INT FK), `subject_id` (INT FK), `date` (DATE), `max_marks` (FLOAT).
13. **`test_marks`**: `id` (INT PK), `test_id` (INT FK), `student_id` (INT FK), `marks_obtained` (FLOAT), `is_published` (TINYINT 1).
14. **`behaviour`**: `id` (INT PK), `school_id` (INT FK), `student_id` (INT FK), `rating` (INT 1-5), `remarks` (TEXT), `date` (DATE), `created_by` (INT FK).

### E. Integrations & Audit
15. **`google_sheets_sync`**: `id` (INT PK), `school_id` (INT FK), `sheet_id` (VARCHAR 255), `sync_type` (students/attendance/marks), `last_synced_at` (TIMESTAMP), `status` (success/failed), `rows_synced` (INT), `error_summary` (TEXT).
16. **`audit_logs`**: `id` (INT PK), `school_id` (INT FK), `user_id` (INT FK), `action` (VARCHAR 100), `details` (TEXT), `created_at` (TIMESTAMP).
