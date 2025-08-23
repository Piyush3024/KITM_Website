import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

const generateSlug = async (title, prisma, excludeId = null) => {
    let slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    let uniqueSlug = slug;
    let counter = 1;

    while (
        await prisma.notices.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};

export const createNotice = async (req, res) => {
    try {
        const {
            title,
            content,
            excerpt,
            notice_type = "general",
            priority = "normal",
            valid_from,
            valid_until,
            is_published = false,
            is_featured = false,
        } = req.body;

        const IsPublished = is_published === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;


        // Check for existing slug
        const existing = await prisma.notices.findFirst({
            where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Notice slug already exists",
            });
        }

        // Handle file uploads - Enhanced version
        let attachmentPath = null;

        // Check different possible file structures
        if (req.file) {
            // Single file upload (uploadSingle)
            attachmentPath = req.file.path;
            console.log("Found single file:", attachmentPath);
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                // Files array format
                const attachmentFile = req.files.find(file => file.fieldname === 'attachment');
                if (attachmentFile) {
                    attachmentPath = attachmentFile.path;
                    console.log("Found attachment in array:", attachmentPath);
                }
            } else if (typeof req.files === 'object') {
                // Files object format
                if (req.files.attachment && req.files.attachment[0]) {
                    attachmentPath = req.files.attachment[0].path;
                    console.log("Found attachment in object:", attachmentPath);
                }
            }
        }

        // Fallback to original method
        const uploadedFiles = handleLocalFileUploads(req);
        console.log("handleLocalFileUploads result:", uploadedFiles);

        // Use the manually found path or fallback to the utility function
        const finalAttachmentPath = attachmentPath || uploadedFiles.attachment || null;
        console.log("Final attachment path:", finalAttachmentPath);

        const notice = await prisma.notices.create({
            data: {
                title,
                slug: req.body.slug || (await generateSlug(title, prisma)),
                content,
                excerpt,
                notice_type,
                priority,
                attachment: finalAttachmentPath,
                is_published:IsPublished,
                is_featured: IsFeatured,
                valid_from: valid_from ? new Date(valid_from) : null,
                valid_until: valid_until ? new Date(valid_until) : null,
                view_count: 0,
                author_id: req.user.id,
                published_at: is_published ? new Date() : null,

            },
        });

        // DEBUG: Check the final URL generation
        const attachmentUrl = notice.attachment ? generateFileUrl(req, notice.attachment) : null;
        console.log("Generated attachment URL:", attachmentUrl);

        res.status(201).json({
            success: true,
            message: "Notice created successfully",
            data: {
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: notice.author_id,
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,

            },
        });
    } catch (error) {
        console.error("Error in createNotice controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating notice",
            error: error.message,
        });
    }
};

export const getNoticeByIdOrSlug = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isAuthenticated = !!req.user;

        let notice;
        const decodedId = decodeId(idOrSlug, true);
        if (decodedId) {
            notice = await prisma.notices.findUnique({
                where: { id: decodedId },

            });
        } else {
            notice = await prisma.notices.findUnique({
                where: { slug: idOrSlug },
            });
        }

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found",
            });
        }

        if (!isAuthenticated && !notice.is_published) {
            return res.status(403).json({
                success: false,
                message: "Notice is not published",
            });
        }

        // Increment view_count for non-admin users
        if (!req.user || !["admin", "author"].includes(req.user.role)) {
            await prisma.notices.update({
                where: { id: notice.id },
                data: { view_count: { increment: 1 } },
            });
            notice.view_count += 1;
        }

        res.json({
            success: true,
            message: "Notice retrieved successfully",
            data: {
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: notice.author_id,
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,

            },
        });
    } catch (error) {
        console.error("Error in getNoticeByIdOrSlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving notice",
            error: error.message,
        });
    }
};

export const getAllNotices = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            notice_type,
            is_published,
            is_featured,

        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (notice_type) where.notice_type = notice_type;
        if (!isAuthenticated);

        const [notices, total] = await Promise.all([
            prisma.notices.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.notices.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Notices retrieved successfully",
            data: notices.map((notice) => ({
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: encodeId(notice.author_id),
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllNotices controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving notices",
            error: error.message,
        });
    }
};
export const getAllPublishedNotices = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            notice_type,
            is_published,
            is_featured,

        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (notice_type) where.notice_type = notice_type;
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_published = true;

        const [notices, total] = await Promise.all([
            prisma.notices.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.notices.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Notices retrieved successfully",
            data: notices.map((notice) => ({
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: encodeId(notice.author_id),
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllNotices controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving notices",
            error: error.message,
        });
    }
};

export const updateNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            excerpt,
            notice_type,
            priority,
            valid_from,
            valid_until,
            is_published,
            is_featured,
        } = req.body;
        const decodedId = decodeId(id);

          const IsPublished = is_published === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;

        const existingNotice = await prisma.notices.findUnique({
            where: { id: decodedId },
        });

        if (!existingNotice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found",
            });
        }

        // Check for slug conflict
        const existing = await prisma.notices.findFirst({
            where: {
                slug: req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingNotice.slug),
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Notice slug already exists",
            });
        }

        // Handle file uploads - Check multiple sources with debugging
        let newAttachmentPath = null;

        // Check if there's a single file upload
        if (req.file && req.file.fieldname === 'attachment') {
            newAttachmentPath = req.file.path;
        }
        // Check if there are multiple files and one is attachment
        else if (req.files) {
            if (req.files.attachment && req.files.attachment[0]) {
                newAttachmentPath = req.files.attachment[0].path;
            }
            // Handle array format from .any() middleware
            else if (Array.isArray(req.files)) {
                const attachmentFile = req.files.find(file => file.fieldname === 'attachment');
                if (attachmentFile) {
                    newAttachmentPath = attachmentFile.path;
                }
            }
        }

        // Fallback to handleLocalFileUploads if above didn't work
        if (!newAttachmentPath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newAttachmentPath = uploadedFiles.attachment;
            if (newAttachmentPath) {
                console.log('Found attachment via handleLocalFileUploads:', newAttachmentPath);
            }
        }

        const updateData = {
            title,
            content,
            excerpt,
            notice_type,
            priority,
            valid_from: valid_from ? new Date(valid_from) : undefined,
            valid_until: valid_until ? new Date(valid_until) : undefined,
            is_published: IsPublished,
            is_featured: IsFeatured,
            author_id: req.user.id,
            updated_at: new Date(),
            published_at: is_published ? (existingNotice.is_published ? existingNotice.published_at : new Date()) : null,
        };

        // Handle attachment update
        if (newAttachmentPath) {
            // Delete the old attachment if it exists
            if (existingNotice.attachment) {
                try {
                    await deleteFile(existingNotice.attachment);
                } catch (error) {
                    console.error(`Error deleting old attachment: ${existingNotice.attachment}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.attachment = newAttachmentPath;
        }

        // Generate slug if title is provided
        const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

        const notice = await prisma.notices.update({
            where: { id: decodedId },
            data: {
                ...updateData,
                ...(slugToUse && { slug: slugToUse }), // Only update slug if we have one
            },
        });

        res.json({
            success: true,
            message: "Notice updated successfully",
            data: {
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: encodeId(notice.author_id),
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updateNotice controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating notice",
            error: error.message,
        });
    }
};

export const deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const notice = await prisma.notices.findUnique({
            where: { id: decodedId },
        });

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found",
            });
        }

        // Delete attachment
        if (notice.attachment) {
            await deleteFile(notice.attachment);
        }


        await prisma.notices.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Notice deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteNotice controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting notice",
            error: error.message,
        });
    }
};

export const searchNotices = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            notice_type,
            is_published,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { title: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
                { excerpt: { contains: query, mode: "insensitive" } },
            ];
        }
        if (notice_type) where.notice_type = notice_type;
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (!isAuthenticated) where.is_published = true;

        const [notices, total] = await Promise.all([
            prisma.notices.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.notices.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Notices retrieved successfully",
            data: notices.map((notice) => ({
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: encodeId(notice.author_id),
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchNotices controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching notices",
            error: error.message,
        });
    }
};

export const getNoticeStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.created_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byNoticeType, byPriority, byPublished, byFeatured, totalViews,] = await Promise.all([
            prisma.notices.groupBy({
                by: ["notice_type"],
                where,
                _count: { id: true },
            }),
            prisma.notices.groupBy({
                by: ["priority"],
                where,
                _count: { id: true },
            }),
            prisma.notices.groupBy({
                by: ["is_published"],
                where,
                _count: { id: true },
            }),
            prisma.notices.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
            prisma.notices.groupBy({
                by: ["notice_type"],
                where,
                _sum: { view_count: true },
            }),

        ]);


        res.json({
            success: true,
            message: "Notice statistics retrieved successfully",
            data: {
                byNoticeType: byNoticeType.map((item) => ({
                    notice_type: item.notice_type,
                    count: item._count.id,
                })),
                byPriority: byPriority.map((item) => ({
                    priority: item.priority,
                    count: item._count.id,
                })),
                byPublished: byPublished.map((item) => ({
                    is_published: item.is_published,
                    count: item._count.id,
                })),
                byFeatured: byFeatured.map((item) => ({
                    is_featured: item.is_featured,
                    count: item._count.id,
                })),
                totalViewsByNoticeType: totalViews.map((item) => ({
                    notice_type: item.notice_type,
                    total_views: item._sum.view_count || 0,
                })),
            },
        });
    } catch (error) {
        console.error("Error in getNoticeStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving notice statistics",
            error: error.message,
        });
    }
};

export const toggleNoticeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const notice = await prisma.notices.findUnique({
            where: { id: decodedId },
        });

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: "Notice not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_published")) {
            updateData.is_published = !notice.is_published;
            updateData.published_at = !notice.is_published ? new Date() : null;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !notice.is_featured;
        }
        updateData.updated_at = new Date();

        const updatedNotice = await prisma.notices.update({
            where: { id: decodedId },
            data: updateData,

        });

        res.json({
            success: true,
            message: "Notice status toggled successfully",
            data: {
                id: encodeId(updatedNotice.id),
                title: updatedNotice.title,
                slug: updatedNotice.slug,
                content: updatedNotice.content,
                excerpt: updatedNotice.excerpt,
                notice_type: updatedNotice.notice_type,
                priority: updatedNotice.priority,
                attachment: updatedNotice.attachment ? generateFileUrl(req, updatedNotice.attachment) : null,
                is_published: updatedNotice.is_published,
                is_featured: updatedNotice.is_featured,
                valid_from: updatedNotice.valid_from,
                valid_until: updatedNotice.valid_until,
                view_count: updatedNotice.view_count,
                author_id: encodeId(updatedNotice.author_id),
                published_at: updatedNotice.published_at,
                created_at: updatedNotice.created_at,
                updated_at: updatedNotice.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in toggleNoticeStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling notice status",
            error: error.message,
        });
    }
};



export const getNoticeByType = async (req, res) => {
    try {
        const {
            notice_type,
            page = 1,
            limit = 10,
            sortBy = "published_at",
            sortOrder = "desc",
            is_published,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!notice_type) {
            return res.status(400).json({
                success: false,
                message: "Notice type is required",
            });
        }

        // Validate notice_type
        const validNoticeTypes = ["general", "academic", "exam", "admission", "result", "event", "urgent"];
        if (!validNoticeTypes.includes(notice_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid notice type. Must be one of: ${validNoticeTypes.join(", ")}`,
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { notice_type };
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_published = true;

        const [notices, total] = await Promise.all([
            prisma.notices.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.notices.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Notices for type ${notice_type} retrieved successfully`,
            data: notices.map((notice) => ({
                id: encodeId(notice.id),
                title: notice.title,
                slug: notice.slug,
                content: notice.content,
                excerpt: notice.excerpt,
                notice_type: notice.notice_type,
                priority: notice.priority,
                attachment: notice.attachment ? generateFileUrl(req, notice.attachment) : null,
                is_published: notice.is_published,
                is_featured: notice.is_featured,
                valid_from: notice.valid_from,
                valid_until: notice.valid_until,
                view_count: notice.view_count,
                author_id: encodeId(notice.author_id),
                published_at: notice.published_at,
                created_at: notice.created_at,
                updated_at: notice.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                notice_type,
            },
        });
    } catch (error) {
        console.error("Error in getNoticeByType controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving notices by type",
            error: error.message,
        });
    }
};

export const checkSlugUniqueness = async (req, res) => {
    try {

        const { slug: providedSlug } = req.params;
        const { excludeId: encodedNoticeId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedNoticeId = encodedNoticeId ? decodeId(encodedNoticeId) : null;

        // Check if any other page uses this slug
        const existingNotice = await prisma.notices.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedNoticeId ? { id: decodedNoticeId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingNotice,
            slug: slugToCheck,
            message: existingNotice
                ? "Slug is already in use"
                : "Slug is available",
        });
    } catch (error) {
        console.error("Error in checkSlugUniqueness controller:", error);
        res.status(500).json({
            success: false,
            message: "Error checking slug uniqueness",
            error: error.message,
        });
    }
};