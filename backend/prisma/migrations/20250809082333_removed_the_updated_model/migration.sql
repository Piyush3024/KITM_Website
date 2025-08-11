/*
  Warnings:

  - You are about to drop the column `breadcrumb_title` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `canonical_url` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `focus_keyword` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `index_status` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `schema_markup` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `seo_score` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `breadcrumb_title` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `canonical_url` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `categories` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `focus_keyword` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `index_status` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `reading_time` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `schema_markup` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `seo_score` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `word_count` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the `redirects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seo_analytics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX `idx_index_status` ON `pages`;

-- DropIndex
DROP INDEX `idx_seo_score` ON `pages`;

-- DropIndex
DROP INDEX `idx_index_status` ON `posts`;

-- DropIndex
DROP INDEX `idx_seo_score` ON `posts`;

-- AlterTable
ALTER TABLE `pages` DROP COLUMN `breadcrumb_title`,
    DROP COLUMN `canonical_url`,
    DROP COLUMN `focus_keyword`,
    DROP COLUMN `index_status`,
    DROP COLUMN `schema_markup`,
    DROP COLUMN `seo_score`;

-- AlterTable
ALTER TABLE `posts` DROP COLUMN `breadcrumb_title`,
    DROP COLUMN `canonical_url`,
    DROP COLUMN `categories`,
    DROP COLUMN `focus_keyword`,
    DROP COLUMN `index_status`,
    DROP COLUMN `reading_time`,
    DROP COLUMN `schema_markup`,
    DROP COLUMN `seo_score`,
    DROP COLUMN `tags`,
    DROP COLUMN `word_count`;

-- DropTable
DROP TABLE `redirects`;

-- DropTable
DROP TABLE `seo_analytics`;
