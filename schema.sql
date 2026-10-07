-- ====================================================================
-- STREAMLINED SCHOOL MANAGEMENT SYSTEM DATABASE SCHEMA
-- Perfectly aligned 1-to-1 with Frontend UI Components
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB & phpMyAdmin
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Table: users (Auth & Role Profiles)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'student',
  `full_name` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: classes (Academic Grades)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: sections (Class Sections)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `sections`;
CREATE TABLE `sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `class_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_class_section` (`class_id`, `name`),
  CONSTRAINT `fk_sections_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: admin_classes (Class Admin Assignments)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `admin_classes`;
CREATE TABLE `admin_classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  `section_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_admin_classes_admin` (`admin_id`),
  CONSTRAINT `fk_admin_classes_user` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_admin_classes_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table: students (Student Records)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_uid` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `roll_number` VARCHAR(50) NULL,
  `class_id` INT NULL,
  `section_id` INT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_students_uid` (`student_uid`),
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_students_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 6. Table: subjects (Academic Subjects)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `class_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_subjects_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. Table: attendance (Daily Attendance)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Present',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_date` (`student_id`, `date`),
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. Table: homework (Homework & Assignments)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `homework`;
CREATE TABLE `homework` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(255) NULL,
  `description` TEXT NOT NULL,
  `due_date` DATE NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_homework_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_homework_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Table: tests (Tests & Examinations)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `tests`;
CREATE TABLE `tests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `class_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tests_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tests_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 10. Table: test_marks (Exam Scores & Marks)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `test_marks`;
CREATE TABLE `test_marks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `test_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `marks_obtained` FLOAT NULL,
  `max_marks` FLOAT NOT NULL DEFAULT 100,
  `entered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_test_student` (`test_id`, `student_id`),
  CONSTRAINT `fk_marks_test` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_marks_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 11. Table: behaviour (Student Discipline & Ratings)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `behaviour`;
CREATE TABLE `behaviour` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `remarks` TEXT NOT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_behaviour_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 12. Table: whatsapp_logs (WhatsApp Alerts & Logs)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `whatsapp_logs`;
CREATE TABLE `whatsapp_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `message_body` TEXT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'sent',
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 13. Table: settings (School Configuration)
-- --------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `school_name` VARCHAR(255) NOT NULL DEFAULT 'Dyzen International School',
  `academic_year` VARCHAR(100) NOT NULL DEFAULT '2026-2027',
  `whatsapp_api_key` VARCHAR(255) NOT NULL DEFAULT '',
  `jwt_secret` VARCHAR(255) NOT NULL DEFAULT 'super_secret_jwt_school_production_key_2026'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- SEED DEFAULT DATA
-- ========================================================

-- 1. Default Super Admin (Email: superadmin@school.edu | Password: password123)
INSERT INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `is_active`)
VALUES 
(1, 'superadmin@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1),
(2, 'superadmin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1);

-- 2. Seed Default Classes
INSERT INTO `classes` (`id`, `name`) VALUES
(1, 'Class 1'), (2, 'Class 2'), (3, 'Class 3'), (4, 'Class 4'), (5, 'Class 5'),
(6, 'Class 6'), (7, 'Class 7'), (8, 'Class 8'), (9, 'Class 9'), (10, 'Class 10'),
(11, 'Class 11'), (12, 'Class 12');

-- 3. Seed Default Sections (A, B, C, D for each class)
INSERT INTO `sections` (`class_id`, `name`) VALUES
(1, 'A'), (1, 'B'), (2, 'A'), (2, 'B'), (3, 'A'), (3, 'B'),
(4, 'A'), (4, 'B'), (5, 'A'), (5, 'B'), (6, 'A'), (6, 'B'),
(7, 'A'), (7, 'B'), (8, 'A'), (8, 'B'), (9, 'A'), (9, 'B'),
(10, 'A'), (10, 'B'), (11, 'A'), (11, 'B'), (12, 'A'), (12, 'B');

-- 4. Seed Standard Subjects
INSERT INTO `subjects` (`name`, `class_id`) VALUES
('Mathematics', 8), ('Science', 8), ('English', 8), ('Social Science', 8),
('Mathematics', 9), ('Physics', 9), ('Chemistry', 9), ('Biology', 9), ('English', 9),
('Mathematics', 10), ('Physics', 10), ('Chemistry', 10), ('Biology', 10), ('English', 10),
('Physics', 11), ('Chemistry', 11), ('Mathematics', 11), ('Computer Science', 11),
('Physics', 12), ('Chemistry', 12), ('Mathematics', 12), ('Computer Science', 12);

-- 5. Seed Default Settings
INSERT INTO `settings` (`id`, `school_name`, `academic_year`, `whatsapp_api_key`, `jwt_secret`)
VALUES (1, 'Dyzen International School', '2026-2027', 'twi_live_key', 'super_secret_jwt_school_production_key_2026');

SET FOREIGN_KEY_CHECKS = 1;
