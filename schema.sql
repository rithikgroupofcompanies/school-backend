-- ====================================================================
-- School Management Application Database Schema
-- Compatible with MySQL 5.7+, MySQL 8.0+, MariaDB, and phpMyAdmin
-- Hostinger VPS & Remote Database Ready
-- ====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'student',
  `full_name` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: classes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `classes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: sections
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sections` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL,
  `class_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_class_section` (`class_id`, `name`),
  CONSTRAINT `fk_sections_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: admin_classes
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_classes` (
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
-- Table: students
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_uid` VARCHAR(191) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `roll_number` VARCHAR(50) NULL,
  `class_id` INT NULL,
  `section_id` INT NULL,
  `parent_name` VARCHAR(255) NULL,
  `whatsapp_number` VARCHAR(50) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_students_uid` (`student_uid`),
  INDEX `idx_students_class_sec` (`class_id`, `section_id`),
  INDEX `idx_students_active` (`is_active`),
  CONSTRAINT `fk_students_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_students_section` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: subjects
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `class_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_subjects_class` (`class_id`),
  CONSTRAINT `fk_subjects_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: attendance
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Present',
  `marked_by` INT NULL,
  `modified_by` INT NULL,
  `is_locked` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_student_date` (`student_id`, `date`),
  INDEX `idx_attendance_date` (`date`),
  CONSTRAINT `fk_attendance_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: homework
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `homework` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(255) NULL,
  `description` TEXT NOT NULL,
  `due_date` DATE NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_homework_class` (`class_id`),
  CONSTRAINT `fk_homework_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_homework_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: tests
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `class_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `created_by` INT NULL,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tests_class` (`class_id`),
  CONSTRAINT `fk_tests_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_tests_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: test_marks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `test_marks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `test_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `subject_id` INT NULL,
  `marks_obtained` FLOAT NULL,
  `max_marks` FLOAT NOT NULL DEFAULT 100,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `entered_by` INT NULL,
  `entered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_test_student` (`test_id`, `student_id`),
  INDEX `idx_marks_student` (`student_id`),
  CONSTRAINT `fk_marks_test` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_marks_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: behaviour
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `behaviour` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `remarks` TEXT NOT NULL,
  `date` DATE NOT NULL,
  `admin_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_behaviour_student` (`student_id`),
  CONSTRAINT `fk_behaviour_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: whatsapp_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `whatsapp_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NULL,
  `message_type` VARCHAR(100) NOT NULL,
  `message_body` TEXT NOT NULL,
  `whatsapp_number` VARCHAR(50) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'sent',
  `sent_by` INT NULL,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `api_response` TEXT NULL,
  INDEX `idx_whatsapp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: audit_logs
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(100) NOT NULL,
  `record_id` INT NULL,
  `old_value` TEXT NULL,
  `new_value` TEXT NULL,
  `ip_address` VARCHAR(50) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: settings
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `whatsapp_api_key` VARCHAR(255) NOT NULL DEFAULT 'twi_live_98ab42c8d23e5904',
  `jwt_secret` VARCHAR(255) NOT NULL DEFAULT 'your_super_secret_key',
  `school_name` VARCHAR(255) NOT NULL DEFAULT 'Dyzen International School',
  `academic_year` VARCHAR(100) NOT NULL DEFAULT '2026-2027',
  `report_cards_released` TINYINT(1) NOT NULL DEFAULT 0,
  `last_backup` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- SEED DEFAULT DATA
-- ========================================================

-- 1. Default Super Admin (Email: superadmin@school.edu | Password: password123)
-- Bcrypt Hash for "password123": $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `is_active`, `created_at`)
VALUES (1, 'superadmin@school.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1, NOW());

-- Also add superadmin@school.com for compatibility
INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `role`, `full_name`, `is_active`, `created_at`)
VALUES (2, 'superadmin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'Super Administrator', 1, NOW());

-- 2. Seed Default Classes
INSERT IGNORE INTO `classes` (`id`, `name`) VALUES
(1, 'LKG'),
(2, 'UKG'),
(3, 'Class 1'),
(4, 'Class 2'),
(5, 'Class 3'),
(6, 'Class 4'),
(7, 'Class 5'),
(8, 'Class 6'),
(9, 'Class 7'),
(10, 'Class 8'),
(11, 'Class 9'),
(12, 'Class 10'),
(13, 'Class 11'),
(14, 'Class 12');

-- Also seed short names (1-12) for flexible dropdown selections
INSERT IGNORE INTO `classes` (`name`) VALUES
('1'), ('2'), ('3'), ('4'), ('5'), ('6'), ('7'), ('8'), ('9'), ('10'), ('11'), ('12');

-- 3. Seed Default Sections (A, B, C, D) for all classes
INSERT IGNORE INTO `sections` (`name`, `class_id`)
SELECT 'A', `id` FROM `classes`
UNION ALL
SELECT 'B', `id` FROM `classes`
UNION ALL
SELECT 'C', `id` FROM `classes`
UNION ALL
SELECT 'D', `id` FROM `classes`;

-- 4. Seed Standard Subjects
INSERT IGNORE INTO `subjects` (`name`, `class_id`)
SELECT 'Mathematics', `id` FROM `classes` WHERE `name` = 'Class 8'
UNION ALL
SELECT 'Science', `id` FROM `classes` WHERE `name` = 'Class 8'
UNION ALL
SELECT 'English', `id` FROM `classes` WHERE `name` = 'Class 8'
UNION ALL
SELECT 'Social Studies', `id` FROM `classes` WHERE `name` = 'Class 8'
UNION ALL
SELECT 'Mathematics', `id` FROM `classes` WHERE `name` = 'Class 10'
UNION ALL
SELECT 'Physics', `id` FROM `classes` WHERE `name` = 'Class 10'
UNION ALL
SELECT 'Chemistry', `id` FROM `classes` WHERE `name` = 'Class 10';

-- 5. Seed System Settings
INSERT IGNORE INTO `settings` (`id`, `whatsapp_api_key`, `jwt_secret`, `school_name`, `academic_year`, `report_cards_released`)
VALUES (1, 'twi_live_98ab42c8d23e5904', 'your_super_secret_key', 'Dyzen International School', '2026-2027', 0);

SET FOREIGN_KEY_CHECKS = 1;
