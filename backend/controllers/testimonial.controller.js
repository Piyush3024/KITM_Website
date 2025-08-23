

import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

const generateSlug = async (name, prisma, excludeId = null) => {
    let slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
    let uniqueSlug = slug;
    let counter = 1;

    while (
        await prisma.testimonials.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};

export const createTestimonial = async (req, res) => {
    try {
        const {
            student_name,
            program_id,
            program_name,
            graduation_year,
            current_position,
            company,
            content,
            rating,
            is_published = false,
            is_featured = false,
            sort_order = 0,
        } = req.body;

        const IsPublished = is_published === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;


        // Validate program_id if provided

        const programId = decodeId(program_id)
        let validatedProgramName = program_name;
        if (programId) {
            const program = await prisma.programs.findUnique({
                where: { id: parseInt(program_id) },
            });
            if (!program) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid program_id provided",
                });
            }
            validatedProgramName = program.name;
        }

        const existing = await prisma.testimonials.findFirst({
            where: { student_name, slug: await generateSlug(student_name, prisma) },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Testimonial with this student name or slug already exists",
            });
        }

        const uploadedFiles = handleLocalFileUploads(req);

        const testimonial = await prisma.testimonials.create({
            data: {
                student_name,
                program_id: program_id ? parseInt(program_id) : null,
                program_name: validatedProgramName,
                graduation_year: graduation_year ? parseInt(graduation_year) : null,
                current_position,
                company,
                content,
                rating: rating ? parseInt(rating) : null,
                student_image: uploadedFiles.student_image || null,
                video_file: uploadedFiles.video_file || null,
                is_published: IsPublished,
                is_featured: IsFeatured,
                sort_order: parseInt(sort_order),
                created_by: req.user ? parseInt(req.user.id) : null,
                updated_by: req.user ? parseInt(req.user.id) : null,
                slug: await generateSlug(student_name, prisma),
            },
        });

        res.status(201).json({
            success: true,
            message: "Testimonial created successfully",
            data: {
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            },
        });
    } catch (error) {
        console.error("Error in createTestimonial controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating testimonial",
            error: error.message,
        });
    }
};

export const getTestimonialByIdOrSlug = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isAuthenticated = !!req.user;

        let testimonial;
        const decodedId = decodeId(idOrSlug, true);
        if (decodedId) {
            testimonial = await prisma.testimonials.findUnique({
                where: { id: decodedId },
            });
        } else {
            testimonial = await prisma.testimonials.findUnique({
                where: { slug: idOrSlug },
            });
        }

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found",
            });
        }

        if (!isAuthenticated && !testimonial.is_published) {
            return res.status(403).json({
                success: false,
                message: "Testimonial is not published",
            });
        }

        res.json({
            success: true,
            message: "Testimonial retrieved successfully",
            data: {
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            },
        });
    } catch (error) {
        console.error("Error in getTestimonialByIdOrSlug controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving testimonial",
            error: error.message,
        });
    }
};

export const getAllTestimonials = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            program_id,
            is_published,
            is_featured,
            graduation_year,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (program_id) where.program_id = parseInt(program_id);
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (graduation_year) where.graduation_year = parseInt(graduation_year);
        if (!isAuthenticated) where.is_published = true;

        const [testimonials, total] = await Promise.all([
            prisma.testimonials.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.testimonials.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Testimonials retrieved successfully",
            data: testimonials.map((testimonial) => ({
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllTestimonials controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving testimonials",
            error: error.message,
        });
    }
};

export const getAllPublishedTestimonials = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            program_id,
            is_featured,
            graduation_year,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_published: true };
        if (program_id) where.program_id = parseInt(program_id);
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (graduation_year) where.graduation_year = parseInt(graduation_year);

        const [testimonials, total] = await Promise.all([
            prisma.testimonials.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.testimonials.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Published testimonials retrieved successfully",
            data: testimonials.map((testimonial) => ({
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPublishedTestimonials controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving published testimonials",
            error: error.message,
        });
    }
};

export const updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            student_name,
            program_id,
            program_name,
            graduation_year,
            current_position,
            company,
            content,
            rating,
            is_published,
            is_featured,
            sort_order,
        } = req.body;
        const decodedId = decodeId(id);
        const IsPublished = is_published === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;


        const existingTestimonial = await prisma.testimonials.findUnique({
            where: { id: decodedId },
        });

        if (!existingTestimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found",
            });
        }

        // Validate program_id if provided
        let validatedProgramName = program_name;
        if (program_id) {
            const program = await prisma.programs.findUnique({
                where: { id: parseInt(program_id) },
            });
            if (!program) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid program_id provided",
                });
            }
            validatedProgramName = program.name;
        }

        // Check for duplicate slug
        const slugToUse = student_name ? await generateSlug(student_name, prisma, decodedId) : existingTestimonial.slug;
        const existing = await prisma.testimonials.findFirst({
            where: {
                slug: slugToUse,
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Testimonial slug already exists",
            });
        }

        let newStudentImagePath = null;
        let newVideoFilePath = null;
        if (req.file) {
            if (req.file.fieldname === 'student_image') {
                newStudentImagePath = req.file.path;
            } else if (req.file.fieldname === 'video_file') {
                newVideoFilePath = req.file.path;
            }
        } else if (req.files) {
            if (req.files.student_image && req.files.student_image[0]) {
                newStudentImagePath = req.files.student_image[0].path;
            }
            if (req.files.video_file && req.files.video_file[0]) {
                newVideoFilePath = req.files.video_file[0].path;
            }
            if (Array.isArray(req.files)) {
                const studentImageFile = req.files.find(file => file.fieldname === 'student_image');
                if (studentImageFile) {
                    newStudentImagePath = studentImageFile.path;
                }
                const videoFile = req.files.find(file => file.fieldname === 'video_file');
                if (videoFile) {
                    newVideoFilePath = videoFile.path;
                }
            }
        }

        if (!newStudentImagePath || !newVideoFilePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            if (!newStudentImagePath && uploadedFiles.student_image) {
                newStudentImagePath = uploadedFiles.student_image;
            }
            if (!newVideoFilePath && uploadedFiles.video_file) {
                newVideoFilePath = uploadedFiles.video_file;
            }
        }

        const updateData = {
            student_name,
            program_id: program_id ? parseInt(program_id) : existingTestimonial.program_id,
            program_name: validatedProgramName,
            graduation_year: graduation_year ? parseInt(graduation_year) : existingTestimonial.graduation_year,
            current_position,
            company,
            content,
            rating: rating ? parseInt(rating) : existingTestimonial.rating,
            is_published: IsPublished,
            is_featured: IsFeatured,
            sort_order: sort_order ? parseInt(sort_order) : existingTestimonial.sort_order,
            updated_by: req.user ? parseInt(req.user.id) : existingTestimonial.updated_by,
            updated_at: new Date(),
            slug: slugToUse,
        };

        if (newStudentImagePath) {
            if (existingTestimonial.student_image) {
                try {
                    await deleteFile(existingTestimonial.student_image);
                } catch (error) {
                    console.error(`Error deleting old student image: ${existingTestimonial.student_image}`, error);
                }
            }
            updateData.student_image = newStudentImagePath;
        }

        if (newVideoFilePath) {
            if (existingTestimonial.video_file) {
                try {
                    await deleteFile(existingTestimonial.video_file);
                } catch (error) {
                    console.error(`Error deleting old video file: ${existingTestimonial.video_file}`, error);
                }
            }
            updateData.video_file = newVideoFilePath;
        }

        const testimonial = await prisma.testimonials.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Testimonial updated successfully",
            data: {
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            },
        });
    } catch (error) {
        console.error("Error in updateTestimonial controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating testimonial",
            error: error.message,
        });
    }
};

export const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const testimonial = await prisma.testimonials.findUnique({
            where: { id: decodedId },
        });

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found",
            });
        }

        if (testimonial.student_image) {
            try {
                await deleteFile(testimonial.student_image);
            } catch (error) {
                console.error(`Error deleting student image: ${testimonial.student_image}`, error);
            }
        }

        if (testimonial.video_file) {
            try {
                await deleteFile(testimonial.video_file);
            } catch (error) {
                console.error(`Error deleting video file: ${testimonial.video_file}`, error);
            }
        }

        await prisma.testimonials.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Testimonial deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteTestimonial controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting testimonial",
            error: error.message,
        });
    }
};

export const searchTestimonials = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            program_id,
            is_published,
            is_featured,
            graduation_year,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { student_name: { contains: query, mode: "insensitive" } },
                { content: { contains: query, mode: "insensitive" } },
                { program_name: { contains: query, mode: "insensitive" } },
                { current_position: { contains: query, mode: "insensitive" } },
                { company: { contains: query, mode: "insensitive" } },
            ];
        }
        if (program_id) where.program_id = parseInt(program_id);
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (graduation_year) where.graduation_year = parseInt(graduation_year);
        if (!isAuthenticated) where.is_published = true;

        const [testimonials, total] = await Promise.all([
            prisma.testimonials.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.testimonials.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Testimonials retrieved successfully",
            data: testimonials.map((testimonial) => ({
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchTestimonials controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching testimonials",
            error: error.message,
        });
    }
};

export const getTestimonialStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.created_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byProgram, byRating, byPublished, byFeatured, averageRating] = await Promise.all([
            prisma.testimonials.groupBy({
                by: ["program_id", "program_name"],
                where,
                _count: { id: true },
            }),
            prisma.testimonials.groupBy({
                by: ["rating"],
                where,
                _count: { id: true },
            }),
            prisma.testimonials.groupBy({
                by: ["is_published"],
                where,
                _count: { id: true },
            }),
            prisma.testimonials.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
            prisma.testimonials.aggregate({
                where,
                _avg: { rating: true },
            }),
        ]);

        res.json({
            success: true,
            message: "Testimonial statistics retrieved successfully",
            data: {
                byProgram: byProgram.map((item) => ({
                    program_id: item.program_id,
                    program_name: item.program_name,
                    count: item._count.id,
                })),
                byRating: byRating.map((item) => ({
                    rating: item.rating,
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
                averageRating: averageRating._avg.rating || 0,
            },
        });
    } catch (error) {
        console.error("Error in getTestimonialStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving testimonial statistics",
            error: error.message,
        });
    }
};

export const toggleTestimonialStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const testimonial = await prisma.testimonials.findUnique({
            where: { id: decodedId },
        });

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: "Testimonial not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_published")) {
            updateData.is_published = !testimonial.is_published;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !testimonial.is_featured;
        }
        updateData.updated_by = req.user ? parseInt(req.user.id) : testimonial.updated_by;
        updateData.updated_at = new Date();

        const updatedTestimonial = await prisma.testimonials.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Testimonial status toggled successfully",
            data: {
                id: encodeId(updatedTestimonial.id),
                student_name: updatedTestimonial.student_name,
                program_id: updatedTestimonial.program_id,
                program_name: updatedTestimonial.program_name,
                graduation_year: updatedTestimonial.graduation_year,
                current_position: updatedTestimonial.current_position,
                company: updatedTestimonial.company,
                content: updatedTestimonial.content,
                rating: updatedTestimonial.rating,
                student_image: updatedTestimonial.student_image ? generateFileUrl(req, updatedTestimonial.student_image) : null,
                video_file: updatedTestimonial.video_file ? generateFileUrl(req, updatedTestimonial.video_file) : null,
                is_published: updatedTestimonial.is_published,
                is_featured: updatedTestimonial.is_featured,
                sort_order: updatedTestimonial.sort_order,
                created_by: updatedTestimonial.created_by,
                updated_by: updatedTestimonial.updated_by,
                created_at: updatedTestimonial.created_at,
                updated_at: updatedTestimonial.updated_at,
                slug: updatedTestimonial.slug,
            },
        });
    } catch (error) {
        console.error("Error in toggleTestimonialStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling testimonial status",
            error: error.message,
        });
    }
};

export const getTestimonialsByProgram = async (req, res) => {
    try {
        const {
            program_id,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            is_published,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const programId = decodeId(program_id)
        console.log("programId", programId)

        // Validate program_id
        const program = await prisma.programs.findUnique({
            where: { id: parseInt(programId) },
        });
        if (!program) {
            return res.status(400).json({
                success: false,
                message: "Invalid program_id provided",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { program_id: parseInt(program_id) };
        if (is_published !== undefined) where.is_published = is_published === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_published = true;

        const [testimonials, total] = await Promise.all([
            prisma.testimonials.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.testimonials.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Testimonials retrieved successfully",
            data: testimonials.map((testimonial) => ({
                id: encodeId(testimonial.id),
                student_name: testimonial.student_name,
                program_id: testimonial.program_id,
                program_name: testimonial.program_name,
                graduation_year: testimonial.graduation_year,
                current_position: testimonial.current_position,
                company: testimonial.company,
                content: testimonial.content,
                rating: testimonial.rating,
                student_image: testimonial.student_image ? generateFileUrl(req, testimonial.student_image) : null,
                video_file: testimonial.video_file ? generateFileUrl(req, testimonial.video_file) : null,
                is_published: testimonial.is_published,
                is_featured: testimonial.is_featured,
                sort_order: testimonial.sort_order,
                created_by: testimonial.created_by,
                updated_by: testimonial.updated_by,
                created_at: testimonial.created_at,
                updated_at: testimonial.updated_at,
                slug: testimonial.slug,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getTestimonialsByProgram controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving testimonials",
            error: error.message,
        });
    }
};


export const checkSlugUniqueness = async (req, res) => {
    try {

        const { slug: providedSlug } = req.params;
        const { excludeId: encodedTestimonialId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedTestimonialId = encodedTestimonialId ? decodeId(encodedTestimonialId) : null;

        // Check if any other page uses this slug
        const existingTestimonial = await prisma.testimonials.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedTestimonialId ? { id: decodedTestimonialId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingTestimonial,
            slug: slugToCheck,
            message: existingTestimonial
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