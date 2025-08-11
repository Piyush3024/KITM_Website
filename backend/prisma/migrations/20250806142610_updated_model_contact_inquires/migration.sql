/*
  Warnings:

  - You are about to drop the column `assigned_to` on the `contact_inquiries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `contact_inquiries` DROP FOREIGN KEY `fk_inquiries_assigned_to`;

-- DropIndex
DROP INDEX `fk_inquiries_assigned_to` ON `contact_inquiries`;

-- AlterTable
ALTER TABLE `contact_inquiries` DROP COLUMN `assigned_to`;
