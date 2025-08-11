/*
  Warnings:

  - You are about to drop the column `bachelor_certificate` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_college` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_division` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_faculty` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_percentage` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_transcript` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_university` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `bachelor_year` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `character_certificate` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `citizenship_copy` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_name` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_phone` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `emergency_contact_relation` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `migration_certificate` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `photo` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_board` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_certificate` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_division` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_faculty` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_percentage` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_school` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_transcript` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `plus2_intermediate_year` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `preferred_shift` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_board` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_certificate` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_division` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_percentage` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_school` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `slc_see_year` on the `applications` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `applications` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(15))` to `Enum(EnumId(7))`.
  - You are about to alter the column `meta_title` on the `pages` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(60)`.
  - You are about to alter the column `meta_description` on the `pages` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(160)`.
  - You are about to alter the column `meta_title` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(60)`.
  - You are about to alter the column `meta_description` on the `posts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(160)`.

*/
-- AlterTable
ALTER TABLE `applications` DROP COLUMN `bachelor_certificate`,
    DROP COLUMN `bachelor_college`,
    DROP COLUMN `bachelor_division`,
    DROP COLUMN `bachelor_faculty`,
    DROP COLUMN `bachelor_percentage`,
    DROP COLUMN `bachelor_transcript`,
    DROP COLUMN `bachelor_university`,
    DROP COLUMN `bachelor_year`,
    DROP COLUMN `character_certificate`,
    DROP COLUMN `citizenship_copy`,
    DROP COLUMN `emergency_contact_name`,
    DROP COLUMN `emergency_contact_phone`,
    DROP COLUMN `emergency_contact_relation`,
    DROP COLUMN `migration_certificate`,
    DROP COLUMN `photo`,
    DROP COLUMN `plus2_intermediate_board`,
    DROP COLUMN `plus2_intermediate_certificate`,
    DROP COLUMN `plus2_intermediate_division`,
    DROP COLUMN `plus2_intermediate_faculty`,
    DROP COLUMN `plus2_intermediate_percentage`,
    DROP COLUMN `plus2_intermediate_school`,
    DROP COLUMN `plus2_intermediate_transcript`,
    DROP COLUMN `plus2_intermediate_year`,
    DROP COLUMN `preferred_shift`,
    DROP COLUMN `slc_see_board`,
    DROP COLUMN `slc_see_certificate`,
    DROP COLUMN `slc_see_division`,
    DROP COLUMN `slc_see_percentage`,
    DROP COLUMN `slc_see_school`,
    DROP COLUMN `slc_see_year`,
    ADD COLUMN `deleted_at` TIMESTAMP(0) NULL,
    ADD COLUMN `reviewed_at` TIMESTAMP(0) NULL,
    ADD COLUMN `reviewed_by` INTEGER UNSIGNED NULL,
    MODIFY `status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'entrance_test_scheduled', 'entrance_test_completed', 'interview_scheduled', 'interview_completed', 'provisionally_selected', 'final_selection', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE `pages` ADD COLUMN `breadcrumb_title` VARCHAR(100) NULL,
    ADD COLUMN `canonical_url` VARCHAR(500) NULL,
    ADD COLUMN `focus_keyword` VARCHAR(100) NULL,
    ADD COLUMN `index_status` ENUM('index', 'noindex', 'nofollow', 'noindex_nofollow') NULL DEFAULT 'index',
    ADD COLUMN `schema_markup` JSON NULL,
    ADD COLUMN `seo_score` TINYINT UNSIGNED NULL DEFAULT 0,
    MODIFY `meta_title` VARCHAR(60) NULL,
    MODIFY `meta_description` VARCHAR(160) NULL;

-- AlterTable
ALTER TABLE `posts` ADD COLUMN `breadcrumb_title` VARCHAR(100) NULL,
    ADD COLUMN `canonical_url` VARCHAR(500) NULL,
    ADD COLUMN `categories` JSON NULL,
    ADD COLUMN `focus_keyword` VARCHAR(100) NULL,
    ADD COLUMN `index_status` ENUM('index', 'noindex', 'nofollow', 'noindex_nofollow') NULL DEFAULT 'index',
    ADD COLUMN `reading_time` INTEGER NULL,
    ADD COLUMN `schema_markup` JSON NULL,
    ADD COLUMN `seo_score` TINYINT UNSIGNED NULL DEFAULT 0,
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `word_count` INTEGER NULL DEFAULT 0,
    MODIFY `meta_title` VARCHAR(60) NULL,
    MODIFY `meta_description` VARCHAR(160) NULL;

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `is_required` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `label` VARCHAR(100) NULL,
    ADD COLUMN `options` JSON NULL,
    ADD COLUMN `placeholder` VARCHAR(255) NULL,
    ADD COLUMN `sort_order` INTEGER NULL DEFAULT 0,
    ADD COLUMN `validation` JSON NULL;

-- CreateTable
CREATE TABLE `education_records` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_id` INTEGER UNSIGNED NOT NULL,
    `level` ENUM('slc_see', 'plus2_intermediate', 'bachelor', 'master', 'phd', 'diploma', 'certificate') NOT NULL,
    `board` VARCHAR(100) NULL,
    `institution` VARCHAR(200) NULL,
    `year_completed` YEAR NULL,
    `division` VARCHAR(20) NULL,
    `percentage` DECIMAL(5, 2) NULL,
    `cgpa` DECIMAL(4, 2) NULL,
    `faculty` VARCHAR(100) NULL,
    `major_subject` VARCHAR(100) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_application_id`(`application_id`),
    INDEX `idx_level`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_documents` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_id` INTEGER UNSIGNED NOT NULL,
    `document_type` ENUM('photo', 'citizenship', 'slc_certificate', 'plus2_certificate', 'plus2_transcript', 'bachelor_certificate', 'bachelor_transcript', 'character_certificate', 'migration_certificate', 'medical_certificate', 'other') NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INTEGER UNSIGNED NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `is_submitted` BOOLEAN NOT NULL DEFAULT false,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` INTEGER UNSIGNED NULL,
    `verified_at` TIMESTAMP(0) NULL,
    `rejection_reason` TEXT NULL,
    `uploaded_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_application_id`(`application_id`),
    INDEX `idx_document_type`(`document_type`),
    INDEX `idx_is_verified`(`is_verified`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application_status_history` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_id` INTEGER UNSIGNED NOT NULL,
    `from_status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'entrance_test_scheduled', 'entrance_test_completed', 'interview_scheduled', 'interview_completed', 'provisionally_selected', 'final_selection', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NULL,
    `to_status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'entrance_test_scheduled', 'entrance_test_completed', 'interview_scheduled', 'interview_completed', 'provisionally_selected', 'final_selection', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NOT NULL,
    `changed_by` INTEGER UNSIGNED NULL,
    `reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_application_id`(`application_id`),
    INDEX `idx_created_at`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seo_analytics` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `url` VARCHAR(500) NOT NULL,
    `page_type` VARCHAR(50) NOT NULL,
    `entity_id` INTEGER UNSIGNED NULL,
    `impressions` INTEGER NULL DEFAULT 0,
    `clicks` INTEGER NULL DEFAULT 0,
    `ctr` DECIMAL(5, 4) NULL,
    `position` DECIMAL(6, 2) NULL,
    `primary_keyword` VARCHAR(100) NULL,
    `ranking_keywords` JSON NULL,
    `page_speed_score` TINYINT UNSIGNED NULL,
    `core_web_vitals` JSON NULL,
    `date_recorded` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_page_entity`(`page_type`, `entity_id`),
    INDEX `idx_date_recorded`(`date_recorded`),
    UNIQUE INDEX `seo_analytics_url_date_recorded_key`(`url`, `date_recorded`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `redirects` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `from_url` VARCHAR(500) NOT NULL,
    `to_url` VARCHAR(500) NOT NULL,
    `status_code` SMALLINT UNSIGNED NOT NULL DEFAULT 301,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `hit_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `last_hit` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `redirects_from_url_key`(`from_url`),
    INDEX `idx_from_url`(`from_url`),
    INDEX `idx_is_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_deleted_at` ON `applications`(`deleted_at`);

-- CreateIndex
CREATE INDEX `idx_seo_score` ON `pages`(`seo_score`);

-- CreateIndex
CREATE INDEX `idx_index_status` ON `pages`(`index_status`);

-- CreateIndex
CREATE INDEX `idx_seo_score` ON `posts`(`seo_score`);

-- CreateIndex
CREATE INDEX `idx_index_status` ON `posts`(`index_status`);

-- CreateIndex
CREATE INDEX `idx_sort_order` ON `settings`(`sort_order`);

-- AddForeignKey
ALTER TABLE `applications` ADD CONSTRAINT `applications_reviewed_by_fkey` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `education_records` ADD CONSTRAINT `education_records_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_documents` ADD CONSTRAINT `application_documents_verified_by_fkey` FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_application_id_fkey` FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `application_status_history` ADD CONSTRAINT `application_status_history_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
