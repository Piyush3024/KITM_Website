-- CreateTable
CREATE TABLE `applications` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `application_number` VARCHAR(20) NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('male', 'female', 'other') NOT NULL,
    `nationality` VARCHAR(50) NULL DEFAULT 'Nepali',
    `religion` VARCHAR(50) NULL,
    `blood_group` VARCHAR(5) NULL,
    `marital_status` ENUM('single', 'married', 'divorced', 'widowed') NULL DEFAULT 'single',
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `permanent_address` TEXT NOT NULL,
    `temporary_address` TEXT NULL,
    `emergency_contact_name` VARCHAR(100) NULL,
    `emergency_contact_phone` VARCHAR(20) NULL,
    `emergency_contact_relation` VARCHAR(50) NULL,
    `father_name` VARCHAR(100) NULL,
    `father_occupation` VARCHAR(100) NULL,
    `father_phone` VARCHAR(20) NULL,
    `mother_name` VARCHAR(100) NULL,
    `mother_occupation` VARCHAR(100) NULL,
    `mother_phone` VARCHAR(20) NULL,
    `guardian_name` VARCHAR(100) NULL,
    `guardian_relation` VARCHAR(50) NULL,
    `guardian_phone` VARCHAR(20) NULL,
    `guardian_address` TEXT NULL,
    `program_applied` VARCHAR(50) NOT NULL,
    `preferred_shift` ENUM('morning', 'day', 'evening') NULL DEFAULT 'day',
    `slc_see_board` VARCHAR(50) NULL,
    `slc_see_year` YEAR NULL,
    `slc_see_division` VARCHAR(20) NULL,
    `slc_see_percentage` DECIMAL(5, 2) NULL,
    `slc_see_school` VARCHAR(100) NULL,
    `plus2_intermediate_board` VARCHAR(50) NULL,
    `plus2_intermediate_year` YEAR NULL,
    `plus2_intermediate_division` VARCHAR(20) NULL,
    `plus2_intermediate_percentage` DECIMAL(5, 2) NULL,
    `plus2_intermediate_school` VARCHAR(100) NULL,
    `plus2_intermediate_faculty` VARCHAR(50) NULL,
    `bachelor_university` VARCHAR(100) NULL,
    `bachelor_year` YEAR NULL,
    `bachelor_division` VARCHAR(20) NULL,
    `bachelor_percentage` DECIMAL(5, 2) NULL,
    `bachelor_college` VARCHAR(100) NULL,
    `bachelor_faculty` VARCHAR(50) NULL,
    `photo` VARCHAR(255) NULL,
    `citizenship_copy` VARCHAR(255) NULL,
    `slc_see_certificate` VARCHAR(255) NULL,
    `plus2_intermediate_certificate` VARCHAR(255) NULL,
    `plus2_intermediate_transcript` VARCHAR(255) NULL,
    `bachelor_certificate` VARCHAR(255) NULL,
    `bachelor_transcript` VARCHAR(255) NULL,
    `character_certificate` VARCHAR(255) NULL,
    `migration_certificate` VARCHAR(255) NULL,
    `status` ENUM('pending', 'under_review', 'approved', 'rejected', 'enrolled', 'cancelled') NULL DEFAULT 'pending',
    `admission_test_required` BOOLEAN NULL DEFAULT false,
    `admission_test_date` DATE NULL,
    `admission_test_score` DECIMAL(5, 2) NULL,
    `interview_date` DATETIME(0) NULL,
    `interview_status` ENUM('not_scheduled', 'scheduled', 'completed', 'cancelled') NULL DEFAULT 'not_scheduled',
    `scholarship_applied` BOOLEAN NULL DEFAULT false,
    `scholarship_type` VARCHAR(50) NULL,
    `financial_assistance_needed` BOOLEAN NULL DEFAULT false,
    `annual_family_income` DECIMAL(12, 2) NULL,
    `extra_curricular_activities` TEXT NULL,
    `achievements` TEXT NULL,
    `work_experience` TEXT NULL,
    `reason_for_choosing_kitm` TEXT NULL,
    `career_goals` TEXT NULL,
    `medical_conditions` TEXT NULL,
    `declaration_agreed` BOOLEAN NOT NULL DEFAULT false,
    `terms_agreed` BOOLEAN NOT NULL DEFAULT false,
    `admin_notes` TEXT NULL,
    `rejection_reason` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `application_number`(`application_number`),
    INDEX `idx_created_at`(`created_at` DESC),
    INDEX `idx_email`(`email`),
    INDEX `idx_phone`(`phone`),
    INDEX `idx_status_program`(`status`, `program_applied`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `parent_id` INTEGER UNSIGNED NULL,
    `type` ENUM('post', 'event', 'download', 'gallery', 'notice') NOT NULL DEFAULT 'post',
    `color` VARCHAR(7) NULL DEFAULT '#3B82F6',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_parent_id`(`parent_id`),
    INDEX `idx_type_active`(`type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_inquiries` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `subject` VARCHAR(200) NULL,
    `message` TEXT NOT NULL,
    `inquiry_type` ENUM('admission', 'general', 'complaint', 'suggestion', 'partnership', 'technical') NULL DEFAULT 'general',
    `status` ENUM('new', 'in_progress', 'resolved', 'closed') NULL DEFAULT 'new',
    `assigned_to` INTEGER UNSIGNED NULL,
    `response` TEXT NULL,
    `responded_at` TIMESTAMP(0) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_inquiries_assigned_to`(`assigned_to`),
    INDEX `idx_created_at`(`created_at` DESC),
    INDEX `idx_status_type`(`status`, `inquiry_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_categories` (
    `event_id` INTEGER UNSIGNED NOT NULL,
    `category_id` INTEGER UNSIGNED NOT NULL,

    INDEX `fk_event_categories_category`(`category_id`),
    PRIMARY KEY (`event_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `excerpt` TEXT NULL,
    `featured_image` VARCHAR(255) NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `start_time` TIME(0) NULL,
    `end_time` TIME(0) NULL,
    `location` VARCHAR(255) NULL,
    `event_type` ENUM('seminar', 'workshop', 'conference', 'cultural', 'sports', 'graduation', 'other') NULL DEFAULT 'other',
    `registration_required` BOOLEAN NULL DEFAULT false,
    `registration_link` VARCHAR(500) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `view_count` INTEGER UNSIGNED NULL DEFAULT 0,
    `created_by` INTEGER UNSIGNED NOT NULL,
    `updated_by` INTEGER UNSIGNED NULL,
    `published_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `fk_events_created_by_idx`(`created_by`),
    INDEX `fk_events_updated_by`(`updated_by`),
    INDEX `idx_event_type`(`event_type`),
    INDEX `idx_featured`(`is_featured`),
    INDEX `idx_start_date_published`(`start_date`, `is_published`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `faculty` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `designation` VARCHAR(100) NULL,
    `department` VARCHAR(100) NULL,
    `qualification` TEXT NULL,
    `specialization` TEXT NULL,
    `experience_years` INTEGER UNSIGNED NULL,
    `bio` TEXT NULL,
    `profile_image` VARCHAR(255) NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(20) NULL,
    `research_interests` TEXT NULL,
    `publications` TEXT NULL,
    `social_links` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_active_featured`(`is_active`, `is_featured`),
    INDEX `idx_department`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `galleries` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `cover_image` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_by` INTEGER UNSIGNED NOT NULL,
    `updated_by` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `fk_galleries_created_by`(`created_by`),
    INDEX `idx_active_featured`(`is_active`, `is_featured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `gallery_id` INTEGER UNSIGNED NOT NULL,
    `media_id` INTEGER UNSIGNED NOT NULL,
    `caption` VARCHAR(500) NULL,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_gallery_items_media`(`media_id`),
    INDEX `idx_gallery_sort`(`gallery_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `original_name` VARCHAR(255) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INTEGER UNSIGNED NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `file_type` ENUM('image', 'document', 'video', 'audio', 'other') NULL DEFAULT 'other',
    `alt_text` VARCHAR(255) NULL,
    `caption` TEXT NULL,
    `uploaded_by` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_file_type`(`file_type`),
    INDEX `idx_uploaded_by`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notice_categories` (
    `notice_id` INTEGER UNSIGNED NOT NULL,
    `category_id` INTEGER UNSIGNED NOT NULL,

    INDEX `fk_notice_categories_category`(`category_id`),
    PRIMARY KEY (`notice_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notices` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `excerpt` TEXT NULL,
    `notice_type` ENUM('general', 'academic', 'exam', 'admission', 'result', 'event', 'urgent') NOT NULL DEFAULT 'general',
    `priority` ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
    `attachment` VARCHAR(255) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `valid_from` DATE NULL,
    `valid_until` DATE NULL,
    `view_count` INTEGER UNSIGNED NULL DEFAULT 0,
    `author_id` INTEGER UNSIGNED NOT NULL,
    `published_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `fk_notices_author_idx`(`author_id`),
    INDEX `idx_notice_type_published`(`notice_type`, `is_published`),
    INDEX `idx_priority_published`(`priority`, `is_published`),
    INDEX `idx_published_at`(`published_at` DESC),
    INDEX `idx_valid_dates`(`valid_from`, `valid_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NULL,
    `excerpt` TEXT NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` VARCHAR(255) NULL,
    `featured_image` VARCHAR(255) NULL,
    `template_type` VARCHAR(50) NULL DEFAULT 'default',
    `is_published` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_by` INTEGER UNSIGNED NOT NULL,
    `updated_by` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `fk_pages_created_by_idx`(`created_by`),
    INDEX `fk_pages_updated_by_idx`(`updated_by`),
    INDEX `idx_slug_published`(`slug`, `is_published`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partners` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_name` VARCHAR(100) NOT NULL,
    `logo` VARCHAR(255) NULL,
    `website_url` VARCHAR(255) NULL,
    `partnership_type` ENUM('internship', 'placement', 'training', 'research', 'mou', 'general') NULL DEFAULT 'general',
    `description` TEXT NULL,
    `contact_person` VARCHAR(100) NULL,
    `contact_email` VARCHAR(100) NULL,
    `contact_phone` VARCHAR(20) NULL,
    `partnership_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_active_featured`(`is_active`, `is_featured`),
    INDEX `idx_partnership_type`(`partnership_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `post_categories` (
    `post_id` INTEGER UNSIGNED NOT NULL,
    `category_id` INTEGER UNSIGNED NOT NULL,

    INDEX `fk_post_categories_category`(`category_id`),
    PRIMARY KEY (`post_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `excerpt` TEXT NULL,
    `featured_image` VARCHAR(255) NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` VARCHAR(255) NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `post_type` ENUM('blog', 'news', 'announcement') NOT NULL DEFAULT 'blog',
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `view_count` INTEGER UNSIGNED NULL DEFAULT 0,
    `author_id` INTEGER UNSIGNED NOT NULL,
    `published_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `slug`(`slug`),
    INDEX `fk_posts_author_idx`(`author_id`),
    INDEX `idx_featured`(`is_featured`),
    INDEX `idx_post_type`(`post_type`),
    INDEX `idx_status_published`(`status`, `published_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `short_description` TEXT NULL,
    `full_description` LONGTEXT NULL,
    `duration` VARCHAR(50) NULL,
    `degree_type` ENUM('bachelor', 'master', 'diploma', 'certificate') NULL DEFAULT 'bachelor',
    `affiliated_university` VARCHAR(100) NULL,
    `total_seats` INTEGER UNSIGNED NULL,
    `eligibility_criteria` TEXT NULL,
    `career_prospects` TEXT NULL,
    `featured_image` VARCHAR(255) NULL,
    `brochure_file` VARCHAR(255) NULL,
    `tuition_fee` DECIMAL(10, 2) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `code`(`code`),
    UNIQUE INDEX `slug`(`slug`),
    INDEX `idx_active_featured`(`is_active`, `is_featured`),
    INDEX `idx_degree_type`(`degree_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `setting_key` VARCHAR(100) NOT NULL,
    `setting_value` LONGTEXT NULL,
    `setting_type` ENUM('text', 'number', 'boolean', 'json', 'file', 'email', 'url') NULL DEFAULT 'text',
    `group_name` VARCHAR(50) NULL DEFAULT 'general',
    `description` TEXT NULL,
    `is_public` BOOLEAN NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `setting_key`(`setting_key`),
    INDEX `idx_group_public`(`group_name`, `is_public`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `student_name` VARCHAR(100) NOT NULL,
    `program_id` INTEGER UNSIGNED NULL,
    `program_name` VARCHAR(100) NULL,
    `graduation_year` YEAR NULL,
    `current_position` VARCHAR(100) NULL,
    `company` VARCHAR(100) NULL,
    `content` TEXT NOT NULL,
    `rating` TINYINT UNSIGNED NULL,
    `student_image` VARCHAR(255) NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `sort_order` INTEGER NULL DEFAULT 0,
    `created_by` INTEGER UNSIGNED NULL,
    `updated_by` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_testimonials_created_by_idx`(`created_by`),
    INDEX `fk_testimonials_program_idx`(`program_id`),
    INDEX `idx_program_id`(`program_id`),
    INDEX `idx_published_featured`(`is_published`, `is_featured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'editor', 'author') NOT NULL DEFAULT 'author',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `username`(`username`),
    INDEX `idx_role_active`(`role`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_inquiries` ADD CONSTRAINT `fk_inquiries_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_categories` ADD CONSTRAINT `fk_event_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_categories` ADD CONSTRAINT `fk_event_categories_event` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `fk_events_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `galleries` ADD CONSTRAINT `fk_galleries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_items` ADD CONSTRAINT `fk_gallery_items_gallery` FOREIGN KEY (`gallery_id`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_items` ADD CONSTRAINT `fk_gallery_items_media` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media` ADD CONSTRAINT `fk_media_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_categories` ADD CONSTRAINT `fk_notice_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notice_categories` ADD CONSTRAINT `fk_notice_categories_notice` FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notices` ADD CONSTRAINT `fk_notices_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pages` ADD CONSTRAINT `fk_pages_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pages` ADD CONSTRAINT `fk_pages_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_categories` ADD CONSTRAINT `fk_post_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_categories` ADD CONSTRAINT `fk_post_categories_post` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_author` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `fk_testimonials_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testimonials` ADD CONSTRAINT `fk_testimonials_program` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
