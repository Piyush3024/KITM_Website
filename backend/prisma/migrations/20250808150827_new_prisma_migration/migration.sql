/*
  Warnings:

  - You are about to drop the column `publications` on the `faculty` table. All the data in the column will be lost.
  - You are about to drop the column `research_interests` on the `faculty` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `faculty` DROP COLUMN `publications`,
    DROP COLUMN `research_interests`;
