-- ====================================================================
-- EDUNEXUS V2 - MULTI-TENANT SAAS DATABASE SCHEMA
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB & phpMyAdmin
-- Primary Source of Truth with Complete Tenant Isolation (school_id)
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Table: schools (Tenant Master Table)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `logo_url` VARCHAR(255) NULL,
  `board` VARCHAR(100) NULL DEFAULT 'CBSE',
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `status` ENUM('active', 'suspended', 'pending') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_schools_code` (`code`),
  INDEX `idx_schools_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: users (Global Auth & Account Identities)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'student',
  `full_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: school_memberships (Tenant-User Mapping)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `school_memberships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `designation` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_school_user` (`school_id`, `user_id`),
  INDEX `idx_memberships_school` (`school_id`),
  CONSTRAINT `fk_sm_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: classes (Academic Grades scoped to School)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_school_class` (`school_id`, `name`),
  CONSTRAINT `fk_classes_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table: sections (Sections scoped to Class & School)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_class_section` (`class_id`, `name`),
  INDEX `idx_sections_school` (`school_id`),
  CONSTRAINT `fk_sections_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sections_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table: subjects (Academic Subjects scoped to School)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `class_id` INT NULL,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_subjects_school` (`school_id`),
  CONSTRAINT `fk_subjects_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subjects_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table: students (Student Directory scoped to School)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `student_uid` VARCHAR(191) NOT NULL,
  `admission_number` VARCHAR(50) NULL,
  `name` VARCHAR(255) NOT NULL,
  `roll_number` VARCHAR(50) NULL,
  `class_id` INT NULL,
  `section_id` INT NULL,
  `dob` DATE NULL,
  `gender` VARCHAR(20) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_students_school` (`school_id`),
  INDEX `idx_students_uid` (`student_uid`),
  CONSTRAINT `fk_students_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_students_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table: guardians (Parent / Guardian Directory)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `guardians` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `school_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL DEFAULT 'Parent',
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(191) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_guardians_school` (`school_id`),
  CONSTRAINT `fk_guardians_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Table: student_guardians (Multi-Child / Guardian Linking)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `student_guardians` (
  `student_id` INT NOT NULL,
  `guardian_id` INT NOT NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`student_id`, `guardian_id`),
  CONSTRAINT `fk_sg_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sg_guardian` FOREIGN KEY (`guardian_id`) REFERENCES `guardians` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Table: timetables (Full Timetable Schedule Engine)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `timetables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `academic_year` VARCHAR(50) NOT NULL DEFAULT '2026-2027',
  `class_id` INT NOT NULL,
  `section_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `teacher_id` INT NULL,
  `day_of_week` ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
  `period_number` INT NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `room` VARCHAR(50) NULL,
  `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'published',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tt_school` (`school_id`),
  INDEX `idx_tt_schedule` (`school_id`, `class_id`, `section_id`, `day_of_week`),
  INDEX `idx_tt_teacher` (`school_id`, `teacher_id`, `day_of_week`),
  CONSTRAINT `fk_tt_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tt_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tt_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tt_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Table: attendance (Daily Attendance)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Present',
  `marked_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_attendance` (`student_id`, `date`),
  INDEX `idx_att_school` (`school_id`),
  CONSTRAINT `fk_att_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_att_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Table: homework (Homework & Assignments)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homework` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `section_id` INT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(255) NULL,
  `description` TEXT NOT NULL,
  `due_date` DATE NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_hw_school` (`school_id`),
  CONSTRAINT `fk_hw_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hw_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hw_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Table: tests (Examinations & Tests)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `class_id` INT NOT NULL,
  `section_id` INT NULL,
  `subject_id` INT NOT NULL,
  `max_marks` FLOAT NOT NULL DEFAULT 100,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tests_school` (`school_id`),
  CONSTRAINT `fk_tests_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tests_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tests_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 14. Table: test_marks (Exam Scores)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_marks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `test_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `marks_obtained` FLOAT NULL,
  `max_marks` FLOAT NOT NULL DEFAULT 100,
  `entered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_test_mark` (`test_id`, `student_id`),
  CONSTRAINT `fk_marks_test` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_marks_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 15. Table: behaviour (Student Discipline & Commendations)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `behaviour` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `remarks` TEXT NOT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_behaviour_school` (`school_id`),
  CONSTRAINT `fk_bh_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bh_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 16. Table: google_sheets_sync (Sheets 2-Way Sync Engine)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `google_sheets_sync` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `spreadsheet_id` VARCHAR(255) NOT NULL,
  `spreadsheet_url` VARCHAR(500) NULL,
  `sync_type` VARCHAR(50) NOT NULL DEFAULT 'all',
  `status` ENUM('idle', 'syncing', 'success', 'failed') NOT NULL DEFAULT 'idle',
  `rows_synced` INT NOT NULL DEFAULT 0,
  `last_synced_at` TIMESTAMP NULL,
  `error_details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gss_school` (`school_id`),
  CONSTRAINT `fk_gss_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 17. Table: audit_logs (Security & Action Trail)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NULL,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_school` (`school_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 18. Table: settings (School Settings)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NULL,
  `school_name` VARCHAR(255) NOT NULL DEFAULT 'EduNexus School',
  `academic_year` VARCHAR(100) NOT NULL DEFAULT '2026-2027',
  `whatsapp_api_key` VARCHAR(255) NOT NULL DEFAULT '',
  `jwt_secret` VARCHAR(255) NOT NULL DEFAULT 'super_secret_jwt_school_production_key_2026'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- SEED INITIAL DATA (Default Super Admin & First School)
-- ========================================================

-- 1. Default Super Admin
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `is_active`)
VALUES 
(1, 'superadmin@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1),
(2, 'superadmin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1);

-- 2. First School Tenant (Dyzen International School)
INSERT IGNORE INTO `schools` (`id`, `name`, `code`, `board`, `email`, `phone`, `city`, `state`, `status`)
VALUES 
(1, 'Dyzen International School', 'DYZEN-01', 'CBSE', 'info@dyzen.edu', '+91 9876543210', 'Bangalore', 'Karnataka', 'active');

-- Link Superadmin to Default School
INSERT IGNORE INTO `school_memberships` (`school_id`, `user_id`, `role`, `designation`, `department`)
VALUES (1, 1, 'super_admin', 'Platform Administrator', 'Management');

-- Seed Classes for School 1
INSERT IGNORE INTO `classes` (`id`, `school_id`, `name`) VALUES
(1, 1, 'Class 8'), (2, 1, 'Class 9'), (3, 1, 'Class 10'), (4, 1, 'Class 11'), (5, 1, 'Class 12');

-- Seed Sections
INSERT IGNORE INTO `sections` (`id`, `school_id`, `class_id`, `name`) VALUES
(1, 1, 1, 'A'), (2, 1, 1, 'B'),
(3, 1, 2, 'A'), (4, 1, 2, 'B'),
(5, 1, 3, 'A'), (6, 1, 3, 'B'),
(7, 1, 4, 'A'), (8, 1, 4, 'B'),
(9, 1, 5, 'A'), (10, 1, 5, 'B');

-- Seed Subjects
INSERT IGNORE INTO `subjects` (`id`, `school_id`, `class_id`, `name`, `code`) VALUES
(1, 1, 3, 'Mathematics', 'MATH-10'),
(2, 1, 3, 'Physics', 'PHY-10'),
(3, 1, 3, 'Chemistry', 'CHEM-10'),
(4, 1, 3, 'English', 'ENG-10');

SET FOREIGN_KEY_CHECKS = 1;
