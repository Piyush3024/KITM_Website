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
        await prisma.pages.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};

export const createPage = async (req, res) => {
    try {
        const {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            is_published = true,
            sort_order = 0,
        } = req.body;

        const Ispublished = is_published === "true" ? true : false;
        const sortOrder = parseInt(sort_order);

        // Check for existing slug
        const existing = await prisma.pages.findFirst({
            where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Page slug already exists",
            });
        }

        // Handle file uploads
        let featuredImagePath = null;
        if (req.file) {
            featuredImagePath = req.file.path;
        } else if (req.files?.featured_image?.[0]) {
            featuredImagePath = req.files.featured_image[0].path;
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalFeaturedImagePath = featuredImagePath || uploadedFiles.featured_image || null;


        const page = await prisma.pages.create({
            data: {
                title,
                slug: req.body.slug || (await generateSlug(title, prisma)),
                content,
                excerpt,
                meta_title,
                meta_description,
                is_published: Ispublished,
                sort_order: sortOrder,
                featured_image: finalFeaturedImagePath,
                created_by: req.user.id,
                updated_by: req.user.id,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });

        const featuredImageUrl = page.featured_image ? generateFileUrl(req, page.featured_image) : null;

        res.status(201).json({
            success: true,
            message: "Page created successfully",
            data: {
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,
                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: featuredImageUrl,
                created_by: encodeId(page.created_by),
                updated_by: encodeId(page.updated_by),
                created_at: page.created_at,
                updated_at: page.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createPage controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating page",
            error: error.message,
        });
    }
};

export const getPageByIdOrSlug = async (req, res) => {
    try {
       
        const { idOrSlug } = req.params;
 
        // const isAuthenticated = !!req.user;
     

        let page;
        const decodedId = decodeId(idOrSlug, true);
        if (decodedId) {
            page = await prisma.pages.findUnique({
                where: { id: decodedId },
            });
        } else {
            page = await prisma.pages.findUnique({
                where: { slug: idOrSlug },
            });
        }

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }
        //   if (!isAuthenticated ) {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Page is not published",
        //     });
        // }


        res.json({
            success: true,
            message: "Page retrieved successfully",
            data: {
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,
                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: page.featured_image ? generateFileUrl(req, page.featured_image) : null,
                created_by: encodeId(page.created_by),
                updated_by: page.updated_by ? encodeId(page.updated_by) : null,
                created_at: page.created_at,
                updated_at: page.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getPageByIdOrSlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving page",
            error: error.message,
        });
    }
};

export const getAllPublishedPages = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (!isAuthenticated) where.is_published = true;

        const [pages, total] = await Promise.all([
            prisma.pages.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.pages.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Pages retrieved successfully",
            data: pages.map((page) => ({
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,
                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: page.featured_image ? generateFileUrl(req, page.featured_image) : null,
                created_by: encodeId(page.created_by),
                updated_by: page.updated_by ? encodeId(page.updated_by) : null,
                created_at: page.created_at,
                updated_at: page.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPages controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving pages",
            error: error.message,
        });
    }
};
export const getAllPages = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (!isAuthenticated);

        const [pages, total] = await Promise.all([
            prisma.pages.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.pages.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Pages retrieved successfully",
            data: pages.map((page) => ({
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,

                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: page.featured_image ? generateFileUrl(req, page.featured_image) : null,
                created_by: encodeId(page.created_by),
                updated_by: page.updated_by ? encodeId(page.updated_by) : null,
                created_at: page.created_at,
                updated_at: page.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPages controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving pages",
            error: error.message,
        });
    }
};

export const updatePage = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            is_published,
            sort_order,
        } = req.body;
        const decodedId = decodeId(id);

         const Ispublished = is_published === "true" ? true : false;
        const sortOrder = parseInt(sort_order);

        const existingPage = await prisma.pages.findUnique({
            where: { id: decodedId },
        });

        if (!existingPage) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        const existing = await prisma.pages.findFirst({
            where: {
                slug: req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingPage.slug),
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Page slug already exists",
            });
        }

        // Handle file uploads
        let newFeaturedImagePath = null;
        if (req.file && req.file.fieldname === 'featured_image') {
            newFeaturedImagePath = req.file.path;
        } else if (req.files) {
            if (req.files.featured_image && req.files.featured_image[0]) {
                newFeaturedImagePath = req.files.featured_image[0].path;
            } else if (Array.isArray(req.files)) {
                const featuredImageFile = req.files.find(file => file.fieldname === 'featured_image');
                if (featuredImageFile) {
                    newFeaturedImagePath = featuredImageFile.path;
                }
            }
        }

        if (!newFeaturedImagePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newFeaturedImagePath = uploadedFiles.featured_image;
        }

        const updateData = {
            title,
            content,
            excerpt,
            meta_title,
            meta_description,
            is_published: Ispublished,
            sort_order: sortOrder,
            updated_by: req.user.id,
            updated_at: new Date(),
        };

        // Handle featured image update
        if (newFeaturedImagePath) {
            if (existingPage.featured_image) {
                try {
                    await deleteFile(existingPage.featured_image);
                } catch (error) {
                    console.error(`Error deleting old featured image: ${existingPage.featured_image}`, error);
                }
            }
            updateData.featured_image = newFeaturedImagePath;
        }

        // Generate slug if title is provided
        const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

        const page = await prisma.pages.update({
            where: { id: decodedId },
            data: {
                ...updateData,
                ...(slugToUse && { slug: slugToUse }),
            },
        });

        res.json({
            success: true,
            message: "Page updated successfully",
            data: {
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,

                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: page.featured_image ? generateFileUrl(req, page.featured_image) : null,
                created_by: encodeId(page.created_by),
                updated_by: encodeId(page.updated_by),
                created_at: page.created_at,
                updated_at: page.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updatePage controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating page",
            error: error.message,
        });
    }
};

export const deletePage = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const page = await prisma.pages.findUnique({
            where: { id: decodedId },
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        if (page.featured_image) {
            await deleteFile(page.featured_image);
        }

        await prisma.pages.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Page deleted successfully",
        });
    } catch (error) {
        console.error("Error in deletePage controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting page",
            error: error.message,
        });
    }
};

export const searchPages = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
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
                { meta_title: { contains: query, mode: "insensitive" } },
                { meta_description: { contains: query, mode: "insensitive" } },
            ];
        }

        if (!isAuthenticated) where.is_published = true;

        const [pages, total] = await Promise.all([
            prisma.pages.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.pages.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Pages retrieved successfully",
            data: pages.map((page) => ({
                id: encodeId(page.id),
                title: page.title,
                slug: page.slug,
                content: page.content,
                excerpt: page.excerpt,
                meta_title: page.meta_title,
                meta_description: page.meta_description,

                is_published: page.is_published,
                sort_order: page.sort_order,
                featured_image: page.featured_image ? generateFileUrl(req, page.featured_image) : null,
                created_by: encodeId(page.created_by),
                updated_by: page.updated_by ? encodeId(page.updated_by) : null,
                created_at: page.created_at,
                updated_at: page.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchPages controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching pages",
            error: error.message,
        });
    }
};

export const togglePageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const page = await prisma.pages.findUnique({
            where: { id: decodedId },
        });

        if (!page) {
            return res.status(404).json({
                success: false,
                message: "Page not found",
            });
        }

        const updateData = {
            is_published: !page.is_published,
            updated_by: req.user.id,
            updated_at: new Date(),
        };

        const updatedPage = await prisma.pages.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Page status toggled successfully",
            data: {
                id: encodeId(updatedPage.id),
                title: updatedPage.title,
                slug: updatedPage.slug,
                content: updatedPage.content,
                excerpt: updatedPage.excerpt,
                meta_title: updatedPage.meta_title,
                meta_description: updatedPage.meta_description,

                is_published: updatedPage.is_published,
                sort_order: updatedPage.sort_order,
                featured_image: updatedPage.featured_image ? generateFileUrl(req, updatedPage.featured_image) : null,
                created_by: encodeId(updatedPage.created_by),
                updated_by: encodeId(updatedPage.updated_by),
                created_at: updatedPage.created_at,
                updated_at: updatedPage.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in togglePageStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling page status",
            error: error.message,
        });
    }
};



export const checkSlugUniqueness = async (req, res) => {
    try {
        // const { slug: providedSlug, title, pageId: encodedPageId } = req.body;
        const { slug: providedSlug } = req.params;
        const { excludeId: encodedPageId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedPageId = encodedPageId ? decodeId(encodedPageId) : null;

        // Check if any other page uses this slug
        const existingPage = await prisma.pages.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedPageId ? { id: decodedPageId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingPage,
            slug: slugToCheck,
            message: existingPage
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