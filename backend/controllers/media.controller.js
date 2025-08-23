import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";
import path from "path";

const prisma = new PrismaClient();

// Helper function to determine file type based on mime type
const determineFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'document';
    return 'other';
};

export const uploadMedia = async (req, res) => {


    try {
        const { alt_text, caption } = req.body;

        // Check if files were uploaded
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files were uploaded",
            });
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const mediaFiles = [];

        // Handle multiple files
        const files = req.files.file || req.files.files || Object.values(req.files).flat();
        const fileArray = Array.isArray(files) ? files : [files];

        // Process each uploaded file
        for (const file of fileArray) {
            const fileType = determineFileType(file.mimetype);

            const mediaData = {
                original_name: file.originalname,
                filename: file.filename,
                file_path: file.path,
                file_size: file.size,
                mime_type: file.mimetype,
                file_type: fileType,
                alt_text: alt_text || null,
                caption: caption || null,
                uploaded_by: req.user.id,
                created_at: new Date(),
            };

            const media = await prisma.media.create({
                data: mediaData,
            });

            mediaFiles.push({
                id: encodeId(media.id),
                original_name: media.original_name,
                filename: media.filename,
                file_path: generateFileUrl(req, media.file_path),
                file_size: media.file_size,
                mime_type: media.mime_type,
                file_type: media.file_type,
                alt_text: media.alt_text,
                caption: media.caption,
                uploaded_by: encodeId(media.uploaded_by),
                created_at: media.created_at,
            });
        }

        res.status(201).json({
            success: true,
            message: `${mediaFiles.length} file(s) uploaded successfully`,
            data: {
                count: mediaFiles.length,
                files: mediaFiles
            },
        });
    } catch (error) {
        console.error("Error in uploadMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error uploading media",
            error: error.message,
        });
    }
};

export const getMediaById = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const media = await prisma.media.findUnique({
            where: { id: decodedId },
            include: {
                users: {
                    select: { id: true, username: true, email: true }
                },
                _count: {
                    select: { gallery_items: true }
                }
            }
        });

        if (!media) {
            return res.status(404).json({
                success: false,
                message: "Media not found",
            });
        }

        res.json({
            success: true,
            message: "Media retrieved successfully",
            data: {
                id: encodeId(media.id),
                original_name: media.original_name,
                filename: media.filename,
                file_path: generateFileUrl(req, media.file_path),
                file_size: media.file_size,
                mime_type: media.mime_type,
                file_type: media.file_type,
                alt_text: media.alt_text,
                caption: media.caption,
                uploaded_by: encodeId(media.uploaded_by),
                created_at: media.created_at,
                uploader: {
                    id: encodeId(media.users.id),
                    username: media.users.username,
                    email: media.users.email
                },
                usage_count: media._count.gallery_items
            },
        });
    } catch (error) {
        console.error("Error in getMediaById controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving media",
            error: error.message,
        });
    }
};

export const getAllMedia = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = "created_at",
            sortOrder = "desc",
            file_type,
            uploaded_by
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (file_type) where.file_type = file_type;
        if (uploaded_by) where.uploaded_by = decodeId(uploaded_by);

        const [media, total] = await Promise.all([
            prisma.media.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    users: {
                        select: { id: true, username: true, email: true }
                    },
                    _count: {
                        select: { gallery_items: true }
                    }
                }
            }),
            prisma.media.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Media retrieved successfully",
            data: media.map((item) => ({
                id: encodeId(item.id),
                original_name: item.original_name,
                filename: item.filename,
                file_path: generateFileUrl(req, item.file_path),
                file_size: item.file_size,
                mime_type: item.mime_type,
                file_type: item.file_type,
                alt_text: item.alt_text,
                caption: item.caption,
                uploaded_by: encodeId(item.uploaded_by),
                created_at: item.created_at,
                uploader: {
                    id: encodeId(item.users.id),
                    username: item.users.username,
                    email: item.users.email
                },
                usage_count: item._count.gallery_items
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving media",
            error: error.message,
        });
    }
};

export const getMediaByType = async (req, res) => {
    try {
        const { type } = req.params;
        const {
            page = 1,
            limit = 20,
            sortBy = "created_at",
            sortOrder = "desc"
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { file_type: type };

        const [media, total] = await Promise.all([
            prisma.media.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    users: {
                        select: { id: true, username: true, email: true }
                    },
                    _count: {
                        select: { gallery_items: true }
                    }
                }
            }),
            prisma.media.count({ where }),
        ]);

        res.json({
            success: true,
            message: `${type} media retrieved successfully`,
            data: media.map((item) => ({
                id: encodeId(item.id),
                original_name: item.original_name,
                filename: item.filename,
                file_path: generateFileUrl(req, item.file_path),
                file_size: item.file_size,
                mime_type: item.mime_type,
                file_type: item.file_type,
                alt_text: item.alt_text,
                caption: item.caption,
                uploaded_by: encodeId(item.uploaded_by),
                created_at: item.created_at,
                uploader: {
                    id: encodeId(item.users.id),
                    username: item.users.username,
                    email: item.users.email
                },
                usage_count: item._count.gallery_items
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getMediaByType controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving media by type",
            error: error.message,
        });
    }
};

export const updateMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const { alt_text, caption } = req.body;
        const decodedId = decodeId(id);

        const existingMedia = await prisma.media.findUnique({
            where: { id: decodedId },
        });

        if (!existingMedia) {
            return res.status(404).json({
                success: false,
                message: "Media not found",
            });
        }
        // Check if user owns this media or is admin
        if (existingMedia.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to update this media",
            });
        }

        const updatedMedia = await prisma.media.update({
            where: { id: decodedId },
            data: {
                alt_text,
                caption,
            },
            include: {
                users: {
                    select: { id: true, username: true, email: true }
                },
                _count: {
                    select: { gallery_items: true }
                }
            }
        });


        res.json({
            success: true,
            message: "Media updated successfully",
            data: {
                id: encodeId(updatedMedia.id),
                original_name: updatedMedia.original_name,
                filename: updatedMedia.filename,
                file_path: generateFileUrl(req, updatedMedia.file_path),
                file_size: updatedMedia.file_size,
                mime_type: updatedMedia.mime_type,
                file_type: updatedMedia.file_type,
                alt_text: updatedMedia.alt_text,
                caption: updatedMedia.caption,
                uploaded_by: encodeId(updatedMedia.uploaded_by),
                created_at: updatedMedia.created_at,
                uploader: {
                    id: encodeId(updatedMedia.users.id),
                    username: updatedMedia.users.username,
                    email: updatedMedia.users.email
                },
                usage_count: updatedMedia._count.gallery_items
            },
        });
    } catch (error) {
        console.error("Error in updateMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating media",
            error: error.message,
        });
    }
};

export const deleteMedia = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const media = await prisma.media.findUnique({
            where: { id: decodedId },
            include: {
                _count: {
                    select: { gallery_items: true }
                }
            }
        });

        if (!media) {
            return res.status(404).json({
                success: false,
                message: "Media not found",
            });
        }

        // Check if user owns this media or is admin
        if (media.uploaded_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "You don't have permission to delete this media",
            });
        }

        // Check if media is being used in galleries
        if (media._count.gallery_items > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete media. It is being used in ${media._count.gallery_items} gallery item(s).`,
            });
        }

        // Delete physical file
        if (media.file_path) {
            await deleteFile(media.file_path);
        }

        // Delete media record
        await prisma.media.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Media deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting media",
            error: error.message,
        });
    }
};

export const searchMedia = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 20,
            sortBy = "created_at",
            sortOrder = "desc",
            file_type,
            uploaded_by
        } = req.query;
        const isAuthenticated = !!req.user;

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { original_name: { contains: query, mode: "insensitive" } },
                { filename: { contains: query, mode: "insensitive" } },
                { alt_text: { contains: query, mode: "insensitive" } },
                { caption: { contains: query, mode: "insensitive" } },
            ];
        }
        if (file_type) where.file_type = file_type;
        if (uploaded_by) where.uploaded_by = decodeId(uploaded_by);

        const [media, total] = await Promise.all([
            prisma.media.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    users: {
                        select: { id: true, username: true, email: true }
                    },
                    _count: {
                        select: { gallery_items: true }
                    }
                }
            }),
            prisma.media.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Media search completed successfully",
            data: media.map((item) => ({
                id: encodeId(item.id),
                original_name: item.original_name,
                filename: item.filename,
                file_path: generateFileUrl(req, item.file_path),
                file_size: item.file_size,
                mime_type: item.mime_type,
                file_type: item.file_type,
                alt_text: item.alt_text,
                caption: item.caption,
                uploaded_by: encodeId(item.uploaded_by),
                created_at: item.created_at,
                uploader: {
                    id: encodeId(item.users.id),
                    username: item.users.username,
                    email: item.users.email
                },
                usage_count: item._count.gallery_items
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                query: query || null,
            },
        });
    } catch (error) {
        console.error("Error in searchMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching media",
            error: error.message,
        });
    }
};

export const getMediaStats = async (req, res) => {
    try {
        const isAuthenticated = !!req.user;

        if (!isAuthenticated) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const [
            totalMedia,
            mediaByType,
            totalSize,
            recentMedia
        ] = await Promise.all([
            prisma.media.count(),
            prisma.media.groupBy({
                by: ['file_type'],
                _count: {
                    id: true
                },
                _sum: {
                    file_size: true
                }
            }),
            prisma.media.aggregate({
                _sum: {
                    file_size: true
                }
            }),
            prisma.media.findMany({
                take: 5,
                orderBy: { created_at: 'desc' },
                include: {
                    users: {
                        select: { id: true, username: true }
                    }
                }
            })
        ]);

        res.json({
            success: true,
            message: "Media statistics retrieved successfully",
            data: {
                total_files: totalMedia,
                total_size: totalSize._sum.file_size || 0,
                by_type: mediaByType.map(type => ({
                    file_type: type.file_type,
                    count: type._count.id,
                    total_size: type._sum.file_size || 0
                })),
                recent_uploads: recentMedia.map(item => ({
                    id: encodeId(item.id),
                    original_name: item.original_name,
                    file_type: item.file_type,
                    file_size: item.file_size,
                    created_at: item.created_at,
                    uploader: {
                        id: encodeId(item.users.id),
                        username: item.users.username
                    }
                }))
            },
        });
    } catch (error) {
        console.error("Error in getMediaStats controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving media statistics",
            error: error.message,
        });
    }
};

export const getMyMedia = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = "created_at",
            sortOrder = "desc",
            file_type
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { uploaded_by: req.user.id };
        if (file_type) where.file_type = file_type;

        const [media, total] = await Promise.all([
            prisma.media.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    _count: {
                        select: { gallery_items: true }
                    }
                }
            }),
            prisma.media.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Your media retrieved successfully",
            data: media.map((item) => ({
                id: encodeId(item.id),
                original_name: item.original_name,
                filename: item.filename,
                file_path: generateFileUrl(req, item.file_path),
                file_size: item.file_size,
                mime_type: item.mime_type,
                file_type: item.file_type,
                alt_text: item.alt_text,
                caption: item.caption,
                uploaded_by: encodeId(item.uploaded_by),
                created_at: item.created_at,
                usage_count: item._count.gallery_items
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getMyMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving your media",
            error: error.message,
        });
    }
};

export const bulkDeleteMedia = async (req, res) => {
    try {
        const { media_ids } = req.body;

        // Parse media_ids if it's a string
        const parsedMediaIds = typeof media_ids === 'string' ? JSON.parse(media_ids) : media_ids;

        if (!parsedMediaIds || !Array.isArray(parsedMediaIds) || parsedMediaIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Media IDs are required",
            });
        }

        // Decode media IDs
        const decodedMediaIds = parsedMediaIds.map(mediaId => decodeId(mediaId));

        // Get media files to check ownership and usage
        const mediaFiles = await prisma.media.findMany({
            where: { id: { in: decodedMediaIds } },
            include: {
                _count: {
                    select: { gallery_items: true }
                }
            }
        });

        if (mediaFiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No media files found",
            });
        }

        // Check ownership and usage
        const errors = [];
        const filesToDelete = [];

        for (const media of mediaFiles) {
            if (media.uploaded_by !== req.user.id && req.user.role !== 'admin') {
                errors.push(`No permission to delete: ${media.original_name}`);
                continue;
            }
            if (media._count.gallery_items > 0) {
                errors.push(`Cannot delete ${media.original_name}: used in ${media._count.gallery_items} gallery item(s)`);
                continue;
            }
            filesToDelete.push(media);
        }

        if (filesToDelete.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No files can be deleted",
                errors
            });
        }

        // Delete physical files and database records
        const deletePromises = filesToDelete.map(async (media) => {
            if (media.file_path) {
                await deleteFile(media.file_path);
            }
            return prisma.media.delete({ where: { id: media.id } });
        });

        await Promise.all(deletePromises);

        res.json({
            success: true,
            message: `${filesToDelete.length} media file(s) deleted successfully`,
            data: {
                deleted_count: filesToDelete.length,
                total_requested: parsedMediaIds.length,
                errors: errors.length > 0 ? errors : null
            },
        });
    } catch (error) {
        console.error("Error in bulkDeleteMedia controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting media files",
            error: error.message,
        });
    }
};