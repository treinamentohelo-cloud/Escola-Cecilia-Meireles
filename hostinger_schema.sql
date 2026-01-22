
-- ====================================================================================
-- SCRIPT DE CRIAÇÃO DE TABELAS - MYSQL (HOSTINGER)
-- Execute este script no phpMyAdmin da Hostinger
-- Base de Dados: u850687847_database
-- ====================================================================================

USE `u850687847_database`;

-- 1. TABELA DE TURMAS (classes)
CREATE TABLE IF NOT EXISTS `classes` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `grade` VARCHAR(100),
    `year` INT,
    `shift` VARCHAR(50),
    `status` VARCHAR(20) DEFAULT 'active',
    `is_remediation` TINYINT(1) DEFAULT 0,
    `teacher_id` VARCHAR(36),
    `teacher_ids` JSON,
    `focus_skills` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABELA DE ALUNOS (students)
CREATE TABLE IF NOT EXISTS `students` (
    `id` VARCHAR(36) NOT NULL,
    `class_id` VARCHAR(36),
    `name` VARCHAR(255) NOT NULL,
    `avatar_url` TEXT,
    `registration_number` VARCHAR(50),
    `birth_date` DATE,
    `parent_name` VARCHAR(255),
    `phone` VARCHAR(50),
    `status` VARCHAR(20) DEFAULT 'active',
    `remediation_entry_date` DATETIME,
    `remediation_exit_date` DATETIME,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_class_id` (`class_id`),
    CONSTRAINT `fk_student_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABELA DE USUÁRIOS (users)
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255),
    `role` VARCHAR(50) NOT NULL DEFAULT 'professor',
    `status` VARCHAR(20) DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABELA DE HABILIDADES (skills)
CREATE TABLE IF NOT EXISTS `skills` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` TEXT,
    `subject` VARCHAR(100),
    `year` VARCHAR(50),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABELA DE AVALIAÇÕES (assessments)
CREATE TABLE IF NOT EXISTS `assessments` (
    `id` VARCHAR(36) NOT NULL,
    `student_id` VARCHAR(36),
    `skill_id` VARCHAR(36),
    `date` DATE NOT NULL,
    `status` VARCHAR(50),
    `term` VARCHAR(50),
    `notes` TEXT,
    `participation_score` DECIMAL(4, 2),
    `behavior_score` DECIMAL(4, 2),
    `exam_score` DECIMAL(4, 2),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_student_id` (`student_id`),
    KEY `idx_skill_id` (`skill_id`),
    CONSTRAINT `fk_assessment_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_assessment_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABELA DE DISCIPLINAS (subjects)
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABELA DE DIÁRIO DE CLASSE (class_daily_logs)
CREATE TABLE IF NOT EXISTS `class_daily_logs` (
    `id` VARCHAR(36) NOT NULL,
    `class_id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `content` TEXT NOT NULL,
    `attendance` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_log_class_id` (`class_id`),
    CONSTRAINT `fk_log_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABELA DE CONFIGURAÇÕES (settings)
CREATE TABLE IF NOT EXISTS `settings` (
    `id` VARCHAR(50) NOT NULL,
    `value` TEXT NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. DADOS PADRÃO
INSERT IGNORE INTO `subjects` (`id`, `name`) VALUES 
('sub-lp', 'Língua Portuguesa'),
('sub-mat', 'Matemática'),
('sub-cie', 'Ciências'),
('sub-his', 'História'),
('sub-geo', 'Geografia'),
('sub-art', 'Arte'),
('sub-ing', 'Inglês'),
('sub-edfis', 'Educação Física'),
('sub-ensrel', 'Ensino Religioso');

INSERT IGNORE INTO `settings` (`id`, `value`) VALUES ('school_name', 'Escola Olavo Bilac');

-- Cria um admin padrão caso a tabela esteja vazia (Senha: 123456)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`) 
VALUES ('admin-01', 'Administrador', 'admin@escola.com', '123456', 'admin', 'active');