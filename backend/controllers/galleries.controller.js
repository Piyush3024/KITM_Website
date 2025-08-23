import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";
import { parse } from "path";

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
        await prisma.galleries.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};
export const createGallery = async (req, res) => {
   
    try {
        const {
            title,
            description,
            is_active = true,
            is_featured = false,
            sort_order = 0,
            media_items = []
        } = req.body;
        
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const sortOrder = parseInt(sort_order);
        
        // Enhanced parsing for media_items to handle mixed data types
        let parsedMediaItems = [];
        
        if (media_items && Array.isArray(media_items)) {
            // Handle array of mixed types (objects and JSON strings)
            parsedMediaItems = media_items.flatMap(item => {
                // Skip invalid object strings
                if (typeof item === 'string' && (item === '[object Object]' || item.startsWith('[object'))) {
                    console.warn('Skipping invalid object string:', item);
                    return [];
                }
                
                // If it's already an object, use it directly
                if (typeof item === 'object' && item !== null) {
                    return Array.isArray(item) ? item : [item];
                }
                
                // If it's a JSON string, try to parse it
                if (typeof item === 'string') {
                    try {
                        const parsed = JSON.parse(item);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    } catch (error) {
                        console.error('Failed to parse media item:', item, error);
                        return [];
                    }
                }
                
                return [];
            });
        } else if (typeof media_items === 'string') {
            // Handle single JSON string
            try {
                const parsed = JSON.parse(media_items);
                parsedMediaItems = Array.isArray(parsed) ? parsed : [parsed];
            } catch (error) {
                console.error('Failed to parse media_items string:', error);
                parsedMediaItems = [];
            }
        }

        console.log("Parsed media items:", parsedMediaItems);
        console.log("Media IDs:", parsedMediaItems.map(item => item?.media_id || 'No ID'));

        // Check for existing slug
        const existing = await prisma.galleries.findFirst({
            where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Gallery slug already exists",
            });
        }

        // Handle cover image upload
        let coverImagePath = null;
        if (req.file) {
            coverImagePath = req.file.path;
        } else if (req.files?.cover_image?.[0]) {
            coverImagePath = req.files.cover_image[0].path;
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalCoverImagePath = coverImagePath || uploadedFiles.cover_image || null;

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Create gallery
            const gallery = await tx.galleries.create({
                data: {
                    title,
                    slug: req.body.slug || (await generateSlug(title, prisma)),
                    description,
                    cover_image: finalCoverImagePath,
                    is_active: isActive,
                    is_featured: isFeatured,
                    sort_order: sortOrder,
                    created_by: req.user.id,
                    updated_by: req.user.id,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            });

            // Add media items if provided
            if (parsedMediaItems && parsedMediaItems.length > 0) {
                // Validate that each item has required properties
                const validMediaItems = parsedMediaItems.filter(item => {
                    if (!item || !item.media_id) {
                        console.warn('Skipping invalid media item:', item);
                        return false;
                    }
                    return true;
                });

                if (validMediaItems.length > 0) {
                    const galleryItemsData = validMediaItems.map((item, index) => ({
                        gallery_id: gallery.id,
                        media_id: decodeId(item.media_id),
                        caption: item.caption || null,
                        sort_order: item.sort_order || index,
                    }));

                    console.log("Gallery items to create:", galleryItemsData);

                    await tx.gallery_items.createMany({
                        data: galleryItemsData,
                    });
                }
            }

            return gallery;
        });

        const coverImageUrl = result.cover_image ? generateFileUrl(req, result.cover_image) : null;

        res.status(201).json({
            success: true,
            message: "Gallery created successfully",
            data: {
                id: encodeId(result.id),
                title: result.title,
                slug: result.slug,
                description: result.description,
                cover_image: coverImageUrl,
                is_active: result.is_active,
                is_featured: result.is_featured,
                sort_order: result.sort_order,
                created_by: encodeId(result.created_by),
                updated_by: encodeId(result.updated_by),
                created_at: result.created_at,
                updated_at: result.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createGallery controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating gallery",
            error: error.message,
        });
    }
};

// export const createGallery = async (req, res) => {
//     try {
//         const {
//             title,
//             description,
//             is_active = true,
//             is_featured = false,
//             sort_order = 0,
//             media_items = []
//         } = req.body;
//         const isActive = is_active === "true" ? true : false;
//         const isFeatured = is_featured === "true" ? true : false;
//         const sortOrder = parseInt(sort_order);
//         // Parse media_items if it's a string (from form data)
//         const parsedMediaItems = typeof media_items === 'string' ? JSON.parse(media_items) : media_items;

//         // Check for existing slug
//         const existing = await prisma.galleries.findFirst({
//             where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
//         });

//         if (existing) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Gallery slug already exists",
//             });
//         }

//         // Handle cover image upload
//         let coverImagePath = null;
//         if (req.file) {
//             coverImagePath = req.file.path;
//         } else if (req.files?.cover_image?.[0]) {
//             coverImagePath = req.files.cover_image[0].path;
//         }

//         const uploadedFiles = handleLocalFileUploads(req);
//         const finalCoverImagePath = coverImagePath || uploadedFiles.cover_image || null;

//         // Use transaction to ensure data consistency
//         const result = await prisma.$transaction(async (tx) => {
//             // Create gallery
//             const gallery = await tx.galleries.create({
//                 data: {
//                     title,
//                     slug: req.body.slug || (await generateSlug(title, prisma)),
//                     description,
//                     cover_image: finalCoverImagePath,
//                     is_active: isActive,
//                     is_featured: isFeatured,
//                     sort_order: sortOrder,
//                     created_by: req.user.id,
//                     updated_by: req.user.id,
//                     created_at: new Date(),
//                     updated_at: new Date(),
//                 },
//             });
//             console.log("Parsed media items:", parsedMediaItems);

//             console.log("parsedMediaItems", parsedMediaItems.map((item) => (item.media_id)));

//             // Add media items if provided
//             if (parsedMediaItems && parsedMediaItems.length > 0) {
//                 const galleryItemsData = parsedMediaItems.map((item, index) => ({
//                     gallery_id: gallery.id,
//                     media_id: decodeId(item.media_id),
//                     caption: item.caption || null,
//                     sort_order: item.sort_order || index,
//                 }));

//                 await tx.gallery_items.createMany({
//                     data: galleryItemsData,
//                 });
//             }

//             return gallery;
//         });

//         const coverImageUrl = result.cover_image ? generateFileUrl(req, result.cover_image) : null;

//         res.status(201).json({
//             success: true,
//             message: "Gallery created successfully",
//             data: {
//                 id: encodeId(result.id),
//                 title: result.title,
//                 slug: result.slug,
//                 description: result.description,
//                 cover_image: coverImageUrl,
//                 is_active: result.is_active,
//                 is_featured: result.is_featured,
//                 sort_order: result.sort_order,
//                 created_by: encodeId(result.created_by),
//                 updated_by: encodeId(result.updated_by),
//                 created_at: result.created_at,
//                 updated_at: result.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in createGallery controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error creating gallery",
//             error: error.message,
//         });
//     }
// };

export const getGalleryById = async (req, res) => {
    try {
        const { id } = req.params;
        const isAuthenticated = !!req.user;
        const decodedId = decodeId(id);

        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
            include: {
                gallery_items: {
                    orderBy: { sort_order: 'asc' },
                    include: {
                        media: true
                    }
                }
            }
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        if (!isAuthenticated && !gallery.is_active) {
            return res.status(403).json({
                success: false,
                message: "Gallery is not active",
            });
        }

        res.json({
            success: true,
            message: "Gallery retrieved successfully",
            data: {
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
                items: gallery.gallery_items.map(item => ({
                    id: encodeId(item.id),
                    caption: item.caption,
                    sort_order: item.sort_order,
                    media: {
                        id: encodeId(item.media.id),
                        original_name: item.media.original_name,
                        filename: item.media.filename,
                        file_path: generateFileUrl(req, item.media.file_path),
                        file_size: item.media.file_size,
                        mime_type: item.media.mime_type,
                        file_type: item.media.file_type,
                        alt_text: item.media.alt_text,
                        caption: item.media.caption,
                    }
                }))
            },
        });
    } catch (error) {
        console.error("Error in getGalleryById controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving gallery",
            error: error.message,
        });
    }
};

export const getGalleryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const isAuthenticated = !!req.user;

        const gallery = await prisma.galleries.findUnique({
            where: { slug },
            include: {
                gallery_items: {
                    orderBy: { sort_order: 'asc' },
                    include: {
                        media: true
                    }
                }
            }
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        if (!isAuthenticated && !gallery.is_active) {
            return res.status(403).json({
                success: false,
                message: "Gallery is not active",
            });
        }

        res.json({
            success: true,
            message: "Gallery retrieved successfully",
            data: {
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
                items: gallery.gallery_items.map(item => ({
                    id: encodeId(item.id),
                    caption: item.caption,
                    sort_order: item.sort_order,
                    media: {
                        id: encodeId(item.media.id),
                        original_name: item.media.original_name,
                        filename: item.media.filename,
                        file_path: generateFileUrl(req, item.media.file_path),
                        file_size: item.media.file_size,
                        mime_type: item.media.mime_type,
                        file_type: item.media.file_type,
                        alt_text: item.media.alt_text,
                        caption: item.media.caption,
                    }
                }))
            },
        });
    } catch (error) {
        console.error("Error in getGalleryBySlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving gallery",
            error: error.message,
        });
    }
};

export const getAllGalleries = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            is_active,
            is_featured
        } = req.query;
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (is_active !== undefined) where.is_active = is_active === 'true';
        if (is_featured !== undefined) where.is_featured = is_featured === 'true';

        const [galleries, total] = await Promise.all([
            prisma.galleries.findMany({
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
            prisma.galleries.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Galleries retrieved successfully",
            data: galleries.map((gallery) => ({
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                items_count: gallery._count.gallery_items,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllGalleries controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving galleries",
            error: error.message,
        });
    }
};

export const getAllPublishedGalleries = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            is_featured
        } = req.query;
        const isFeatured = is_featured === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_active: true };
        if (is_featured !== undefined) where.is_featured = is_featured === 'true';

        const [galleries, total] = await Promise.all([
            prisma.galleries.findMany({
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
            prisma.galleries.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Published galleries retrieved successfully",
            data: galleries.map((gallery) => ({
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                items_count: gallery._count.gallery_items,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPublishedGalleries controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving published galleries",
            error: error.message,
        });
    }
};

export const updateGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            is_active,
            is_featured,
            sort_order,
            media_items = []
        } = req.body;
        const decodedId = decodeId(id);
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const sortOrder = parseInt(sort_order);
        // Parse media_items if it's a string (from form data)
        const parsedMediaItems = typeof media_items === 'string' ? JSON.parse(media_items) : media_items;

        const existingGallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!existingGallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Check slug uniqueness if title is being updated
        if (title || req.body.slug) {
            const slugToCheck = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingGallery.slug);
            const existing = await prisma.galleries.findFirst({
                where: {
                    slug: slugToCheck,
                    NOT: { id: decodedId },
                },
            });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Gallery slug already exists",
                });
            }
        }

        // Handle cover image upload
        let newCoverImagePath = null;
        if (req.file && req.file.fieldname === 'cover_image') {
            newCoverImagePath = req.file.path;
        } else if (req.files?.cover_image?.[0]) {
            newCoverImagePath = req.files.cover_image[0].path;
        }

        if (!newCoverImagePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newCoverImagePath = uploadedFiles.cover_image;
        }

        // Use transaction for consistency
        const result = await prisma.$transaction(async (tx) => {
            const updateData = {
                title,
                description,
                is_active: isActive,
                is_featured: isFeatured,
                sort_order: sortOrder,
                updated_by: req.user.id,
                updated_at: new Date(),
            };
       
            // Handle cover image update
            if (newCoverImagePath) {
                if (existingGallery.cover_image) {
                    try {
                        await deleteFile(existingGallery.cover_image);
                    } catch (error) {
                        console.error(`Error deleting old cover image: ${existingGallery.cover_image}`, error);
                    }
                }
                updateData.cover_image = newCoverImagePath;
            }

            // Generate slug if title is provided
            const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

            const gallery = await tx.galleries.update({
                where: { id: decodedId },
                data: {
                    ...updateData,
                    ...(slugToUse && { slug: slugToUse }),
                },
            });

            // Update gallery items if provided
            if (parsedMediaItems && parsedMediaItems.length >= 0) {
                // Delete existing items
                await tx.gallery_items.deleteMany({
                    where: { gallery_id: decodedId },
                });

                // Add new items
                if (parsedMediaItems.length > 0) {
                    const galleryItemsData = parsedMediaItems.map((item, index) => ({
                        gallery_id: decodedId,
                        media_id: decodeId(item.media_id),
                        caption: item.caption || null,
                        sort_order: item.sort_order || index,
                    }));

                    await tx.gallery_items.createMany({
                        data: galleryItemsData,
                    });
                }
            }

            return gallery;
        });

        res.json({
            success: true,
            message: "Gallery updated successfully",
            data: {
                id: encodeId(result.id),
                title: result.title,
                slug: result.slug,
                description: result.description,
                cover_image: result.cover_image ? generateFileUrl(req, result.cover_image) : null,
                is_active: result.is_active,
                is_featured: result.is_featured,
                sort_order: result.sort_order,
                created_by: encodeId(result.created_by),
                updated_by: encodeId(result.updated_by),
                created_at: result.created_at,
                updated_at: result.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updateGallery controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating gallery",
            error: error.message,
        });
    }
};

export const deleteGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Delete cover image if exists
        if (gallery.cover_image) {
            await deleteFile(gallery.cover_image);
        }

        // Delete gallery (cascade will handle gallery_items)
        await prisma.galleries.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Gallery deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteGallery controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting gallery",
            error: error.message,
        });
    }
};

export const toggleGalleryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_active")) {
            updateData.is_active = !gallery.is_active;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !gallery.is_featured;
        }
        updateData.updated_by = req.user.id;
        updateData.updated_at = new Date();

        const updatedGallery = await prisma.galleries.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Gallery status toggled successfully",
            data: {
                id: encodeId(updatedGallery.id),
                title: updatedGallery.title,
                slug: updatedGallery.slug,
                description: updatedGallery.description,
                cover_image: updatedGallery.cover_image ? generateFileUrl(req, updatedGallery.cover_image) : null,
                is_active: updatedGallery.is_active,
                is_featured: updatedGallery.is_featured,
                sort_order: updatedGallery.sort_order,
                created_by: encodeId(updatedGallery.created_by),
                updated_by: encodeId(updatedGallery.updated_by),
                created_at: updatedGallery.created_at,
                updated_at: updatedGallery.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in toggleGalleryStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling gallery status",
            error: error.message,
        });
    }
};
// export const toggleGalleryStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const decodedId = decodeId(id);

//         const gallery = await prisma.galleries.findUnique({
//             where: { id: decodedId },
//         });

//         if (!gallery) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Gallery not found",
//             });
//         }

//         const updatedGallery = await prisma.galleries.update({
//             where: { id: decodedId },
//             data: {
//                 is_active: !gallery.is_active,
//                 updated_by: req.user.id,
//                 updated_at: new Date(),
//             },
//         });

//         res.json({
//             success: true,
//             message: "Gallery status toggled successfully",
//             data: {
//                 id: encodeId(updatedGallery.id),
//                 title: updatedGallery.title,
//                 slug: updatedGallery.slug,
//                 description: updatedGallery.description,
//                 cover_image: updatedGallery.cover_image ? generateFileUrl(req, updatedGallery.cover_image) : null,
//                 is_active: updatedGallery.is_active,
//                 is_featured: updatedGallery.is_featured,
//                 sort_order: updatedGallery.sort_order,
//                 created_by: encodeId(updatedGallery.created_by),
//                 updated_by: encodeId(updatedGallery.updated_by),
//                 created_at: updatedGallery.created_at,
//                 updated_at: updatedGallery.updated_at,
//             },
//         });
//     } catch (error) {
//         console.error("Error in toggleGalleryStatus controller:", error);
//         res.status(500).json({
//             success: false,
//             message: "Error toggling gallery status",
//             error: error.message,
//         });
//     }
// };

export const searchGalleries = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            is_active,
            is_featured
        } = req.query;
        const isAuthenticated = !!req.user;
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
            ];
        }
        if (is_active !== undefined) where.is_active = is_active === 'true';
        if (is_featured !== undefined) where.is_featured = is_featured === 'true';
        if (!isAuthenticated) where.is_active = true;

        const [galleries, total] = await Promise.all([
            prisma.galleries.findMany({
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
            prisma.galleries.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Galleries retrieved successfully",
            data: galleries.map((gallery) => ({
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                items_count: gallery._count.gallery_items,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchGalleries controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching galleries",
            error: error.message,
        });
    }
};

export const getFeaturedGalleries = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc"
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_active: true, is_featured: true };

        const [galleries, total] = await Promise.all([
            prisma.galleries.findMany({
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
            prisma.galleries.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Featured galleries retrieved successfully",
            data: galleries.map((gallery) => ({
                id: encodeId(gallery.id),
                title: gallery.title,
                slug: gallery.slug,
                description: gallery.description,
                cover_image: gallery.cover_image ? generateFileUrl(req, gallery.cover_image) : null,
                is_active: gallery.is_active,
                is_featured: gallery.is_featured,
                sort_order: gallery.sort_order,
                items_count: gallery._count.gallery_items,
                created_by: encodeId(gallery.created_by),
                updated_by: gallery.updated_by ? encodeId(gallery.updated_by) : null,
                created_at: gallery.created_at,
                updated_at: gallery.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getFeaturedGalleries controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving featured galleries",
            error: error.message,
        });
    }
};



export const addItemsToGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const { media_items } = req.body;
        const decodedId = decodeId(id);

        // Check if gallery exists
        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Parse media_items if it's a string
        const parsedMediaItems = typeof media_items === 'string' ? JSON.parse(media_items) : media_items;

        if (!parsedMediaItems || !Array.isArray(parsedMediaItems) || parsedMediaItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Media items are required",
            });
        }

        // Get current max sort order
        const maxSortOrder = await prisma.gallery_items.aggregate({
            where: { gallery_id: decodedId },
            _max: { sort_order: true }
        });

        const startSortOrder = (maxSortOrder._max.sort_order || 0) + 1;

        // Prepare gallery items data
        const galleryItemsData = parsedMediaItems.map((item, index) => ({
            gallery_id: decodedId,
            media_id: decodeId(item.media_id),
            caption: item.caption || null,
            sort_order: item.sort_order || (startSortOrder + index),
        }));

        // Add items to gallery
        const createdItems = await prisma.gallery_items.createMany({
            data: galleryItemsData,
        });

        // Get the created items with media details
        const items = await prisma.gallery_items.findMany({
            where: { gallery_id: decodedId },
            include: { media: true },
            orderBy: { sort_order: 'asc' }
        });

        res.json({
            success: true,
            message: `${createdItems.count} items added to gallery successfully`,
            data: {
                gallery_id: encodeId(decodedId),
                items_added: createdItems.count,
                total_items: items.length,
                items: items.map(item => ({
                    id: encodeId(item.id),
                    caption: item.caption,
                    sort_order: item.sort_order,
                    media: {
                        id: encodeId(item.media.id),
                        original_name: item.media.original_name,
                        filename: item.media.filename,
                        file_path: generateFileUrl(req, item.media.file_path),
                        file_size: item.media.file_size,
                        mime_type: item.media.mime_type,
                        file_type: item.media.file_type,
                        alt_text: item.media.alt_text,
                        caption: item.media.caption,
                    }
                }))
            },
        });
    } catch (error) {
        console.error("Error in addItemsToGallery controller:", error);
        res.status(500).json({
            success: false,
            message: "Error adding items to gallery",
            error: error.message,
        });
    }
};

export const removeItemsFromGallery = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_ids } = req.body;
        const decodedId = decodeId(id);

        // Check if gallery exists
        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Parse item_ids if it's a string
        const parsedItemIds = typeof item_ids === 'string' ? JSON.parse(item_ids) : item_ids;

        if (!parsedItemIds || !Array.isArray(parsedItemIds) || parsedItemIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Item IDs are required",
            });
        }

        // Decode item IDs
        const decodedItemIds = parsedItemIds.map(itemId => decodeId(itemId));

        // Remove items from gallery
        const deletedItems = await prisma.gallery_items.deleteMany({
            where: {
                gallery_id: decodedId,
                id: { in: decodedItemIds }
            }
        });

        res.json({
            success: true,
            message: `${deletedItems.count} items removed from gallery successfully`,
            data: {
                gallery_id: encodeId(decodedId),
                items_removed: deletedItems.count,
            },
        });
    } catch (error) {
        console.error("Error in removeItemsFromGallery controller:", error);
        res.status(500).json({
            success: false,
            message: "Error removing items from gallery",
            error: error.message,
        });
    }
};

export const updateItemsOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { items_order } = req.body;
        const decodedId = decodeId(id);

        // Check if gallery exists
        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Parse items_order if it's a string
        const parsedItemsOrder = typeof items_order === 'string' ? JSON.parse(items_order) : items_order;

        if (!parsedItemsOrder || !Array.isArray(parsedItemsOrder) || parsedItemsOrder.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items order array is required",
            });
        }

        // Use transaction to update all items at once
        await prisma.$transaction(async (tx) => {
            for (const item of parsedItemsOrder) {
                await tx.gallery_items.update({
                    where: {
                        id: decodeId(item.id),
                        gallery_id: decodedId // Ensure item belongs to this gallery
                    },
                    data: {
                        sort_order: item.sort_order
                    }
                });
            }
        });

        // Get updated items
        const updatedItems = await prisma.gallery_items.findMany({
            where: { gallery_id: decodedId },
            include: { media: true },
            orderBy: { sort_order: 'asc' }
        });

        res.json({
            success: true,
            message: "Items order updated successfully",
            data: {
                gallery_id: encodeId(decodedId),
                items: updatedItems.map(item => ({
                    id: encodeId(item.id),
                    caption: item.caption,
                    sort_order: item.sort_order,
                    media: {
                        id: encodeId(item.media.id),
                        original_name: item.media.original_name,
                        filename: item.media.filename,
                        file_path: generateFileUrl(req, item.media.file_path),
                        file_size: item.media.file_size,
                        mime_type: item.media.mime_type,
                        file_type: item.media.file_type,
                        alt_text: item.media.alt_text,
                        caption: item.media.caption,
                    }
                }))
            },
        });
    } catch (error) {
        console.error("Error in updateItemsOrder controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating items order",
            error: error.message,
        });
    }
};

export const updateItemCaption = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { caption } = req.body;
        const decodedId = decodeId(id);
        const decodedItemId = decodeId(itemId);

        // Check if gallery exists
        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        // Update item caption
        const updatedItem = await prisma.gallery_items.update({
            where: {
                id: decodedItemId,
                gallery_id: decodedId // Ensure item belongs to this gallery
            },
            data: { caption },
            include: { media: true }
        });

        res.json({
            success: true,
            message: "Item caption updated successfully",
            data: {
                id: encodeId(updatedItem.id),
                caption: updatedItem.caption,
                sort_order: updatedItem.sort_order,
                media: {
                    id: encodeId(updatedItem.media.id),
                    original_name: updatedItem.media.original_name,
                    filename: updatedItem.media.filename,
                    file_path: generateFileUrl(req, updatedItem.media.file_path),
                    file_size: updatedItem.media.file_size,
                    mime_type: updatedItem.media.mime_type,
                    file_type: updatedItem.media.file_type,
                    alt_text: updatedItem.media.alt_text,
                    caption: updatedItem.media.caption,
                }
            },
        });
    } catch (error) {
        console.error("Error in updateItemCaption controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating item caption",
            error: error.message,
        });
    }
};

export const getGalleryItems = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            page = 1,
            limit = 20,
            sortBy = "sort_order",
            sortOrder = "asc"
        } = req.query;
        const decodedId = decodeId(id);
        const isAuthenticated = !!req.user;

        // Check if gallery exists and is accessible
        const gallery = await prisma.galleries.findUnique({
            where: { id: decodedId },
        });

        if (!gallery) {
            return res.status(404).json({
                success: false,
                message: "Gallery not found",
            });
        }

        if (!isAuthenticated && !gallery.is_active) {
            return res.status(403).json({
                success: false,
                message: "Gallery is not active",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [items, total] = await Promise.all([
            prisma.gallery_items.findMany({
                where: { gallery_id: decodedId },
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
                include: { media: true }
            }),
            prisma.gallery_items.count({
                where: { gallery_id: decodedId }
            }),
        ]);

        res.json({
            success: true,
            message: "Gallery items retrieved successfully",
            data: {
                gallery: {
                    id: encodeId(gallery.id),
                    title: gallery.title,
                    slug: gallery.slug,
                },
                items: items.map(item => ({
                    id: encodeId(item.id),
                    caption: item.caption,
                    sort_order: item.sort_order,
                    created_at: item.created_at,
                    media: {
                        id: encodeId(item.media.id),
                        original_name: item.media.original_name,
                        filename: item.media.filename,
                        file_path: generateFileUrl(req, item.media.file_path),
                        file_size: item.media.file_size,
                        mime_type: item.media.mime_type,
                        file_type: item.media.file_type,
                        alt_text: item.media.alt_text,
                        caption: item.media.caption,
                    }
                }))
            },
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getGalleryItems controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving gallery items",
            error: error.message,
        });
    }
};

export const checkSlugUniqueness = async (req, res) => {
    try {

        const { slug: providedSlug } = req.params;
        const { excludeId: encodedGalleryId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedGalleryId = encodedGalleryId ? decodeId(encodedGalleryId) : null;

        // Check if any other page uses this slug
        const existingGallery = await prisma.galleries.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedGalleryId ? { id: decodedGalleryId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingGallery,
            slug: slugToCheck,
            message: existingGallery
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