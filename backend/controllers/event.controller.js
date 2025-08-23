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
        await prisma.events.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};

export const createEvent = async (req, res) => {
    try {
        const {
            title,
            description,
            excerpt,
            event_type = "other",
            start_date,
            end_date,
            start_time,
            end_time,
            location,
            registration_required = false,
            registration_link,
            is_published = false,
            is_featured = false,
        } = req.body;

        const isPublished = is_published === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const registrationRequired = registration_required === "true" ? true : false;
        


        // Check for existing slug
        const existing = await prisma.events.findFirst({
            where: { slug: req.body.slug || (await generateSlug(title, prisma)) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Event slug already exists",
            });
        }

        // Handle file uploads
        let featuredImagePath = null;
        if (req.file) {
            featuredImagePath = req.file.path;
            console.log("Found single file:", featuredImagePath);
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                const featuredImage = req.files.find(file => file.fieldname === 'featured_image');
                if (featuredImage) {
                    featuredImagePath = featuredImage.path;
                    console.log("Found featured image in array:", featuredImagePath);
                }
            } else if (typeof req.files === 'object') {
                if (req.files.featured_image && req.files.featured_image[0]) {
                    featuredImagePath = req.files.featured_image[0].path;
                    console.log("Found featured image in object:", featuredImagePath);
                }
            }
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalFeaturedImagePath = featuredImagePath || uploadedFiles.featured_image || null;
        console.log("Final featured image path:", finalFeaturedImagePath);

        const event = await prisma.events.create({
            data: {
                title,
                slug: req.body.slug || (await generateSlug(title, prisma)),
                description,
                excerpt,
                event_type,
                start_date: start_date ? new Date(start_date) : null,
                // start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                start_time: start_time ? start_time : null,
                end_time: end_time ? end_time : null,
                location,
                registration_required: registrationRequired,
                registration_link,
                is_published: isPublished,
                is_featured: isFeatured,
                featured_image: finalFeaturedImagePath,
                view_count: 0,
                created_by: req.user.id,
                updated_by: req.user.id,
                published_at: is_published ? new Date() : null,
            },
        });

        const featuredImageUrl = event.featured_image ? generateFileUrl(req, event.featured_image) : null;
        console.log("Generated featured image URL:", featuredImageUrl);

        res.status(201).json({
            success: true,
            message: "Event created successfully",
            data: {
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createEvent controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating event",
            error: error.message,
        });
    }
};

export const getEventByIdOrSlug = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isAuthenticated = !!req.user;

        let event;
        const decodedId = decodeId(idOrSlug, true);
        if (decodedId) {
            event = await prisma.events.findUnique({
                where: { id: decodedId },
            });
        } else {
            event = await prisma.events.findUnique({
                where: { slug: idOrSlug },
            });
        }

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        // if (!isAuthenticated && !event.is_published) {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Event is not published",
        //     });
        // }

        if (!req.user || !["admin", "author"].includes(req.user.role)) {
            await prisma.events.update({
                where: { id: event.id },
                data: { view_count: { increment: 1 } },
            });
            event.view_count += 1;
        }

        res.json({
            success: true,
            message: "Event retrieved successfully",
            data: {
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getEventByIdOrSlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving event",
            error: error.message,
        });
    }
};

export const getAllEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "start_date",
            sortOrder = "desc",
            event_type,

        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (event_type) where.event_type = event_type;
        if (!isAuthenticated);

        const [events, total] = await Promise.all([
            prisma.events.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.events.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Events retrieved successfully",
            data: events.map((event) => ({
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllEvents controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving events",
            error: error.message,
        });
    }
};

export const getAllPublishedEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "start_date",
            sortOrder = "desc",
            event_type,
            is_published,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;
        const isPublished = is_published === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (event_type) where.event_type = event_type;
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_published = true;

        const [events, total] = await Promise.all([
            prisma.events.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.events.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Events retrieved successfully",
            data: events.map((event) => ({
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllEvents controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving events",
            error: error.message,
        });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            excerpt,
            event_type,
            start_date,
            end_date,
            start_time,
            end_time,
            location,
            registration_required,
            registration_link,
            is_published,
            is_featured,
        } = req.body;
        const decodedId = decodeId(id);

        const isPublished = is_published === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;

        const existingEvent = await prisma.events.findUnique({
            where: { id: decodedId },
        });

        if (!existingEvent) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const existing = await prisma.events.findFirst({
            where: {
                slug: req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : existingEvent.slug),
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Event slug already exists",
            });
        }

        // Handle file uploads - Check multiple sources with debugging
        let newFeaturedImagePath = null;

        // Check if there's a single file upload
        if (req.file && req.file.fieldname === 'featured_image') {
            newFeaturedImagePath = req.file.path;
        }
        // Check if there are multiple files and one is featured_image
        else if (req.files) {
            if (req.files.featured_image && req.files.featured_image[0]) {
                newFeaturedImagePath = req.files.featured_image[0].path;
            }
            // Handle array format from .any() middleware
            else if (Array.isArray(req.files)) {
                const featuredImageFile = req.files.find(file => file.fieldname === 'featured_image');
                if (featuredImageFile) {
                    newFeaturedImagePath = featuredImageFile.path;
                }
            }
        }

        // Fallback to handleLocalFileUploads if above didn't work
        if (!newFeaturedImagePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newFeaturedImagePath = uploadedFiles.featured_image;
            if (newFeaturedImagePath) {
                console.log('Found featured_image via handleLocalFileUploads:', newFeaturedImagePath);
            }
        }

        const updateData = {
            title,
            description,
            excerpt,
            event_type,
            start_date: start_date ? new Date(start_date) : undefined,
            end_date: end_date ? new Date(end_date) : undefined,
            start_time: start_time ? start_time : undefined,
            end_time: end_time ? end_time : undefined,
            location,
            registration_required: registration_required === "true" ? true : false,
            registration_link,
            is_published: isPublished,
            is_featured: isFeatured,
            updated_by: req.user.id,
            updated_at: new Date(),
            published_at: is_published ? (existingEvent.is_published ? existingEvent.published_at : new Date()) : null,
        };

        // Handle featured image update
        if (newFeaturedImagePath) {
            // Delete the old featured image if it exists
            if (existingEvent.featured_image) {
                try {
                    await deleteFile(existingEvent.featured_image);
                } catch (error) {
                    console.error(`Error deleting old featured image: ${existingEvent.featured_image}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.featured_image = newFeaturedImagePath;
        }

        // Generate slug if title is provided
        const slugToUse = req.body.slug || (title ? await generateSlug(title, prisma, decodedId) : undefined);

        const event = await prisma.events.update({
            where: { id: decodedId },
            data: {
                ...updateData,
                ...(slugToUse && { slug: slugToUse }), // Only update slug if we have one
            },
        });

        res.json({
            success: true,
            message: "Event updated successfully",
            data: {
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updateEvent controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating event",
            error: error.message,
        });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const event = await prisma.events.findUnique({
            where: { id: decodedId },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        if (event.featured_image) {
            await deleteFile(event.featured_image);
        }

        await prisma.events.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteEvent controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting event",
            error: error.message,
        });
    }
};

export const searchEvents = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "start_date",
            sortOrder = "desc",
            event_type,
            is_published,
        } = req.query;
        const isAuthenticated = !!req.user;
        const isPublished = is_published === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { title: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { excerpt: { contains: query, mode: "insensitive" } },
            ];
        }
        if (event_type) where.event_type = event_type;
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (!isAuthenticated) where.is_published = true;

        const [events, total] = await Promise.all([
            prisma.events.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.events.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Events retrieved successfully",
            data: events.map((event) => ({
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchEvents controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching events",
            error: error.message,
        });
    }
};

export const getEventStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.start_date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byEventType, byPublished, byFeatured, totalViews] = await Promise.all([
            prisma.events.groupBy({
                by: ["event_type"],
                where,
                _count: { id: true },
            }),
            prisma.events.groupBy({
                by: ["is_published"],
                where,
                _count: { id: true },
            }),
            prisma.events.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
            prisma.events.groupBy({
                by: ["event_type"],
                where,
                _sum: { view_count: true },
            }),
        ]);

        res.json({
            success: true,
            message: "Event statistics retrieved successfully",
            data: {
                byEventType: byEventType.map((item) => ({
                    event_type: item.event_type,
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
                totalViewsByEventType: totalViews.map((item) => ({
                    event_type: item.event_type,
                    total_views: item._sum.view_count || 0,
                })),
            },
        });
    } catch (error) {
        console.error("Error in getEventStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving event statistics",
            error: error.message,
        });
    }
};

export const toggleEventStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const event = await prisma.events.findUnique({
            where: { id: decodedId },
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_published")) {
            updateData.is_published = !event.is_published;
            updateData.published_at = !event.is_published ? new Date() : null;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !event.is_featured;
        }
        updateData.updated_by = req.user.id;
        updateData.updated_at = new Date();

        const updatedEvent = await prisma.events.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Event status toggled successfully",
            data: {
                id: encodeId(updatedEvent.id),
                title: updatedEvent.title,
                slug: updatedEvent.slug,
                description: updatedEvent.description,
                excerpt: updatedEvent.excerpt,
                event_type: updatedEvent.event_type,
                start_date: updatedEvent.start_date,
                end_date: updatedEvent.end_date,
                start_time: updatedEvent.start_time,
                end_time: updatedEvent.end_time,
                location: updatedEvent.location,
                registration_required: updatedEvent.registration_required,
                registration_link: updatedEvent.registration_link,
                is_published: updatedEvent.is_published,
                is_featured: updatedEvent.is_featured,
                featured_image: updatedEvent.featured_image ? generateFileUrl(req, updatedEvent.featured_image) : null,
                view_count: updatedEvent.view_count,
                created_by: encodeId(updatedEvent.created_by),
                updated_by: encodeId(updatedEvent.updated_by),
                published_at: updatedEvent.published_at,
                created_at: updatedEvent.created_at,
                updated_at: updatedEvent.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in toggleEventStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling event status",
            error: error.message,
        });
    }
};

export const getEventByType = async (req, res) => {
    try {
        const {
            event_type,
            page = 1,
            limit = 10,
            sortBy = "start_date",
            sortOrder = "desc",
            is_published,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;
        const isPublished = is_published === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        if (!event_type) {
            return res.status(400).json({
                success: false,
                message: "Event type is required",
            });
        }

        const validEventTypes = ["seminar", "workshop", "conference", "cultural", "sports", "graduation", "other"];
        if (!validEventTypes.includes(event_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid event type. Must be one of: ${validEventTypes.join(", ")}`,
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { event_type };
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_published = true;

        const [events, total] = await Promise.all([
            prisma.events.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.events.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Events for type ${event_type} retrieved successfully`,
            data: events.map((event) => ({
                id: encodeId(event.id),
                title: event.title,
                slug: event.slug,
                description: event.description,
                excerpt: event.excerpt,
                event_type: event.event_type,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                registration_required: event.registration_required,
                registration_link: event.registration_link,
                is_published: event.is_published,
                is_featured: event.is_featured,
                featured_image: event.featured_image ? generateFileUrl(req, event.featured_image) : null,
                view_count: event.view_count,
                created_by: encodeId(event.created_by),
                updated_by: encodeId(event.updated_by),
                published_at: event.published_at,
                created_at: event.created_at,
                updated_at: event.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                event_type,
            },
        });
    } catch (error) {
        console.error("Error in getEventByType controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving events by type",
            error: error.message,
        });
    }
};


export const checkSlugUniqueness = async (req, res) => {
    try {

        const { slug: providedSlug } = req.params;
        const { excludeId: encodedEventId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedEventId = encodedEventId ? decodeId(encodedEventId) : null;

        // Check if any other page uses this slug
        const existingEvent = await prisma.events.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedEventId ? { id: decodedEventId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingEvent,
            slug: slugToCheck,
            message: existingEvent
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