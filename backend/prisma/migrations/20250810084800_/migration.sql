/*
  Warnings:

  - The values [entrance_test_scheduled,entrance_test_completed,interview_scheduled,interview_completed,final_selection] on the enum `application_status_history_to_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [entrance_test_scheduled,entrance_test_completed,interview_scheduled,interview_completed,final_selection] on the enum `application_status_history_to_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `achievements` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `admission_test_date` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `admission_test_required` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `admission_test_score` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `annual_family_income` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `career_goals` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `extra_curricular_activities` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `father_occupation` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `financial_assistance_needed` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `guardian_address` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `guardian_name` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `guardian_phone` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `guardian_relation` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `interview_date` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `interview_status` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `medical_conditions` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `mother_occupation` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `reason_for_choosing_kitm` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `scholarship_applied` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `scholarship_type` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `applications` table. All the data in the column will be lost.
  - You are about to drop the column `work_experience` on the `applications` table. All the data in the column will be lost.
  - The values [entrance_test_scheduled,entrance_test_completed,interview_scheduled,interview_completed,final_selection] on the enum `application_status_history_to_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `faculty` on the `education_records` table. All the data in the column will be lost.
  - You are about to drop the column `major_subject` on the `education_records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `application_status_history` MODIFY `from_status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'provisionally_selected', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NULL,
    MODIFY `to_status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'provisionally_selected', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NOT NULL;

-- AlterTable
ALTER TABLE `applications` DROP COLUMN `achievements`,
    DROP COLUMN `admission_test_date`,
    DROP COLUMN `admission_test_required`,
    DROP COLUMN `admission_test_score`,
    DROP COLUMN `annual_family_income`,
    DROP COLUMN `career_goals`,
    DROP COLUMN `extra_curricular_activities`,
    DROP COLUMN `father_occupation`,
    DROP COLUMN `financial_assistance_needed`,
    DROP COLUMN `guardian_address`,
    DROP COLUMN `guardian_name`,
    DROP COLUMN `guardian_phone`,
    DROP COLUMN `guardian_relation`,
    DROP COLUMN `interview_date`,
    DROP COLUMN `interview_status`,
    DROP COLUMN `medical_conditions`,
    DROP COLUMN `mother_occupation`,
    DROP COLUMN `reason_for_choosing_kitm`,
    DROP COLUMN `scholarship_applied`,
    DROP COLUMN `scholarship_type`,
    DROP COLUMN `updated_at`,
    DROP COLUMN `work_experience`,
    ADD COLUMN `entrance_test_date` DATE NULL,
    ADD COLUMN `entrance_test_rollNumber` VARCHAR(20) NULL,
    ADD COLUMN `entrance_test_score` DECIMAL(5, 2) NULL,
    MODIFY `status` ENUM('draft', 'submitted', 'under_review', 'document_verification', 'provisionally_selected', 'enrollment_completed', 'rejected', 'cancelled', 'waitlisted') NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE `education_records` DROP COLUMN `faculty`,
    DROP COLUMN `major_subject`;
