/*
  Warnings:

  - You are about to drop the `categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `event_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notice_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `categories` DROP FOREIGN KEY `fk_categories_parent`;

-- DropForeignKey
ALTER TABLE `event_categories` DROP FOREIGN KEY `fk_event_categories_category`;

-- DropForeignKey
ALTER TABLE `event_categories` DROP FOREIGN KEY `fk_event_categories_event`;

-- DropForeignKey
ALTER TABLE `notice_categories` DROP FOREIGN KEY `fk_notice_categories_category`;

-- DropForeignKey
ALTER TABLE `notice_categories` DROP FOREIGN KEY `fk_notice_categories_notice`;

-- DropForeignKey
ALTER TABLE `post_categories` DROP FOREIGN KEY `fk_post_categories_category`;

-- DropForeignKey
ALTER TABLE `post_categories` DROP FOREIGN KEY `fk_post_categories_post`;

-- DropTable
DROP TABLE `categories`;

-- DropTable
DROP TABLE `event_categories`;

-- DropTable
DROP TABLE `notice_categories`;

-- DropTable
DROP TABLE `post_categories`;
