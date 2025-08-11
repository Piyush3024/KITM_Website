/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `email` VARCHAR(100) NOT NULL,
    ADD COLUMN `email_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `password_reset_expires` DATETIME(3) NULL,
    ADD COLUMN `password_reset_token` TEXT NULL,
    ADD COLUMN `verification_token` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `users`(`email`);
