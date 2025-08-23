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
        await prisma.programs.findFirst({
            where: { slug: uniqueSlug, NOT: excludeId ? { id: excludeId } : undefined },
        })
    ) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }

    return uniqueSlug;
};



export const createProgram = async (req, res) => {
    try {
        const {
            name,
            code,
            slug,
            short_description,
            full_description,
            duration,
            degree_type,
            affiliated_university,
            total_seats,
            eligibility_criteria,
            career_prospects,
            tuition_fee,
            is_active = true,
            is_featured = false,
            sort_order = 0,
        } = req.body;

        const IsActive = is_active === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;
        const tuitionFee = parseFloat(tuition_fee);
        const sortOrder = parseInt(sort_order);


        const existing = await prisma.programs.findFirst({
            where: {
                OR: [{ code }, { slug: slug || await generateSlug(name, prisma) }],
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Program code or slug already exists",
            });
        }
        const uploadedFiles = handleLocalFileUploads(req);
        const parsedTotalSeats = parseInt(total_seats)

        const program = await prisma.programs.create({
            data: {
                name,
                code,
                slug: slug || (await generateSlug(name, prisma)),
                short_description,
                full_description,
                duration,
                degree_type: degree_type || "bachelor",
                affiliated_university,
                total_seats: parsedTotalSeats,
                eligibility_criteria,
                career_prospects,
                tuition_fee: tuitionFee,
                is_active:IsActive ,
                is_featured: IsFeatured,
                sort_order: sortOrder,
                featured_image: uploadedFiles.featured_image || null,
                brochure_file: uploadedFiles.brochure_file || null,
            },
        });

        res.status(201).json({
            success: true,
            message: "Program created successfully",
            data: {
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in create program controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating program",
            error: error.message,
        });
    }
};

export const getProgramByIdOrSlug = async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        const isAuthenticated = !!req.user;

        let program;
        const decodedId = decodeId(idOrSlug, true);
        if (decodedId) {
            program = await prisma.programs.findUnique({
                where: { id: decodedId },
            });
        } else {
            program = await prisma.programs.findUnique({
                where: { slug: idOrSlug },
            });
        }

        if (!program) {
            return res.status(404).json({
                success: false,
                message: "Program not found",
            });
        }

        if (!isAuthenticated && !program.is_active) {
            return res.status(403).json({
                success: false,
                message: "Program is not active",
            });
        }

        res.json({
            success: true,
            message: "Program retrieved successfully",
            data: {
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                 featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getByIdOrSlug program controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving program",
            error: error.message,
        });
    }
};

export const getAllPrograms = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            degree_type,
            is_active,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (degree_type) where.degree_type = degree_type;
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated);

        const [programs, total] = await Promise.all([
            prisma.programs.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.programs.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Programs retrieved successfully",
            data: programs.map((program) => ({
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAll programs controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving programs",
            error: error.message,
        });
    }
};
export const getAllActivePrograms = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            degree_type,
            is_active,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (degree_type) where.degree_type = degree_type;
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_active = true;

        const [programs, total] = await Promise.all([
            prisma.programs.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.programs.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Programs retrieved successfully",
            data: programs.map((program) => ({
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                 featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAll programs controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving programs",
            error: error.message,
        });
    }
};

export const updatePrograms = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            code,
            slug,
            short_description,
            full_description,
            duration,
            degree_type,
            affiliated_university,
            total_seats,
            eligibility_criteria,
            career_prospects,
            tuition_fee,
            is_active,
            is_featured,
            sort_order,
        } = req.body;
        const decodedId = decodeId(id);

        
        const IsActive = is_active === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;
        const tuitionFee = parseFloat(tuition_fee);
        const sortOrder = parseInt(sort_order)


        const existingProgram = await prisma.programs.findUnique({
            where: { id: decodedId },
        });

        if (!existingProgram) {
            return res.status(404).json({
                success: false,
                message: "Program not found",
            });
        }

        const existing = await prisma.programs.findFirst({
            where: {
                OR: [
                    { code },
                    { slug: slug || (name ? await generateSlug(name, prisma, decodedId) : existingProgram.slug) },
                ],
                NOT: { id: decodedId },
            },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Program code or slug already exists",
            });
        }

        // Handle file uploads - Check multiple sources with debugging
        let newFeaturedImagePath = null;
        let newBrochureFilePath = null;

        // Check if there's a single file upload
        if (req.file) {
            if (req.file.fieldname === 'featured_image') {
                newFeaturedImagePath = req.file.path;
            } else if (req.file.fieldname === 'brochure_file') {
                newBrochureFilePath = req.file.path;
            }
        }
        // Check if there are multiple files
        else if (req.files) {
            if (req.files.featured_image && req.files.featured_image[0]) {
                newFeaturedImagePath = req.files.featured_image[0].path;
            }
            if (req.files.brochure_file && req.files.brochure_file[0]) {
                newBrochureFilePath = req.files.brochure_file[0].path;
            }
            // Handle array format from .any() middleware
            if (Array.isArray(req.files)) {
                const featuredImageFile = req.files.find(file => file.fieldname === 'featured_image');
                if (featuredImageFile) {
                    newFeaturedImagePath = featuredImageFile.path;
                }
                const brochureFile = req.files.find(file => file.fieldname === 'brochure_file');
                if (brochureFile) {
                    newBrochureFilePath = brochureFile.path;
                }
            }
        }

        // Fallback to handleLocalFileUploads if above didn't work
        if (!newFeaturedImagePath || !newBrochureFilePath) {
            const uploadedFiles = handleLocalFileUploads(req);
            if (!newFeaturedImagePath && uploadedFiles.featured_image) {
                newFeaturedImagePath = uploadedFiles.featured_image;
                console.log('Found featured_image via handleLocalFileUploads:', newFeaturedImagePath);
            }
            if (!newBrochureFilePath && uploadedFiles.brochure_file) {
                newBrochureFilePath = uploadedFiles.brochure_file;
                console.log('Found brochure_file via handleLocalFileUploads:', newBrochureFilePath);
            }
        }

        const updateData = {
            name,
            code,
            slug,
            short_description,
            full_description,
            duration,
            degree_type,
            affiliated_university,
            total_seats: typeof total_seats === 'string' ? parseInt(total_seats) : total_seats,
            eligibility_criteria,
            career_prospects,
            tuition_fee: tuitionFee,
            is_active: IsActive,
            is_featured: IsFeatured,
            sort_order: sortOrder,
            updated_at: new Date(),
        };

        // Handle featured image update
        if (newFeaturedImagePath) {
            // Delete the old featured image if it exists
            if (existingProgram.featured_image) {
                try {
                    await deleteFile(existingProgram.featured_image);
                } catch (error) {
                    console.error(`Error deleting old featured image: ${existingProgram.featured_image}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.featured_image = newFeaturedImagePath;
        }

        // Handle brochure file update
        if (newBrochureFilePath) {
            // Delete the old brochure file if it exists
            if (existingProgram.brochure_file) {
                try {
                    await deleteFile(existingProgram.brochure_file);
                } catch (error) {
                    console.error(`Error deleting old brochure file: ${existingProgram.brochure_file}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.brochure_file = newBrochureFilePath;
        }

        // Generate slug if name is provided
        const slugToUse = slug || (name ? await generateSlug(name, prisma, decodedId) : undefined);

        const program = await prisma.programs.update({
            where: { id: decodedId },
            data: {
                ...updateData,
                ...(slugToUse && { slug: slugToUse }), // Only update slug if we have one
            },
        });

        res.json({
            success: true,
            message: "Program updated successfully",
            data: {
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in update program controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating program",
            error: error.message,
        });
    }
};


export const deleteProgram = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const program = await prisma.programs.findUnique({
            where: { id: decodedId },
        });

        if (!program) {
            return res.status(404).json({
                success: false,
                message: "Program not found",
            });
        }

        await prisma.programs.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Program deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteProgram controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting program",
            error: error.message,
        });
    }
};

export const searchPrograms = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            degree_type,
            is_active,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { short_description: { contains: query, mode: "insensitive" } },
                { full_description: { contains: query, mode: "insensitive" } },
                { affiliated_university: { contains: query, mode: "insensitive" } },
            ];
        }
        if (degree_type) where.degree_type = degree_type;
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (!isAuthenticated) where.is_active = true;

        const [programs, total] = await Promise.all([
            prisma.programs.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.programs.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Programs retrieved successfully",
            data: programs.map((program) => ({
                id: encodeId(program.id),
                name: program.name,
                code: program.code,
                slug: program.slug,
                short_description: program.short_description,
                full_description: program.full_description,
                duration: program.duration,
                degree_type: program.degree_type,
                affiliated_university: program.affiliated_university,
                total_seats: program.total_seats,
                eligibility_criteria: program.eligibility_criteria,
                career_prospects: program.career_prospects,
                 featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: program.tuition_fee ? program.tuition_fee.toString() : null,
                is_active: program.is_active,
                is_featured: program.is_featured,
                sort_order: program.sort_order,
                created_at: program.created_at,
                updated_at: program.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchPrograms controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching programs",
            error: error.message,
        });
    }
};

export const getProgramStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.created_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byDegreeType, byActiveStatus, byFeatured, totalSeats] = await Promise.all([
            prisma.programs.groupBy({
                by: ["degree_type"],
                where,
                _count: { id: true },
            }),
            prisma.programs.groupBy({
                by: ["is_active"],
                where,
                _count: { id: true },
            }),
            prisma.programs.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
            prisma.programs.groupBy({
                by: ["degree_type"],
                where,
                _sum: { total_seats: true },
            }),
        ]);

        res.json({
            success: true,
            message: "Program statistics retrieved successfully",
            data: {
                byDegreeType: byDegreeType.map((item) => ({
                    degree_type: item.degree_type,
                    count: item._count.id,
                })),
                byActiveStatus: byActiveStatus.map((item) => ({
                    is_active: item.is_active,
                    count: item._count.id,
                })),
                byFeatured: byFeatured.map((item) => ({
                    is_featured: item.is_featured,
                    count: item._count.id,
                })),
                totalSeatsByDegreeType: totalSeats.map((item) => ({
                    degree_type: item.degree_type,
                    total_seats: item._sum.total_seats || 0,
                })),
            },
        });
    } catch (error) {
        console.error("Error in getProgramStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving program statistics",
            error: error.message,
        });
    }
};

export const toggleProgramStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const program = await prisma.programs.findUnique({
            where: { id: decodedId },
        });

        if (!program) {
            return res.status(404).json({
                success: false,
                message: "Program not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_active")) {
            updateData.is_active = !program.is_active;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !program.is_featured;
        }
        updateData.updated_at = new Date();

        const updatedProgram = await prisma.programs.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Program status toggled successfully",
            data: {
                id: encodeId(updatedProgram.id),
                name: updatedProgram.name,
                code: updatedProgram.code,
                slug: updatedProgram.slug,
                short_description: updatedProgram.short_description,
                full_description: updatedProgram.full_description,
                duration: updatedProgram.duration,
                degree_type: updatedProgram.degree_type,
                affiliated_university: updatedProgram.affiliated_university,
                total_seats: updatedProgram.total_seats,
                eligibility_criteria: updatedProgram.eligibility_criteria,
                career_prospects: updatedProgram.career_prospects,
                  featured_image: program.featured_image ? generateFileUrl(req, program.featured_image) : null,
                brochure_file: program.brochure_file ? generateFileUrl(req, program.brochure_file) : null,
                tuition_fee: updatedProgram.tuition_fee ? updatedProgram.tuition_fee.toString() : null,
                is_active: updatedProgram.is_active,
                is_featured: updatedProgram.is_featured,
                sort_order: updatedProgram.sort_order,
                created_at: updatedProgram.created_at,
                updated_at: updatedProgram.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in toggleProgramStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling program status",
            error: error.message,
        });
    }
};

export const checkSlugUniqueness = async (req, res) => {
    try {

        const { slug: providedSlug } = req.params;
        const { excludeId: encodedProgramId } = req.query;

        let slugToCheck = providedSlug;

        // If no slug provided, generate from title

        if (!slugToCheck) {
            return res.status(400).json({
                success: false,
                message: "Slug  is required",
            });
        }

        // Decode pageId if updating (to exclude current page from uniqueness check)
        const decodedProgramId = encodedProgramId ? decodeId(encodedProgramId) : null;

        // Check if any other page uses this slug
        const existingProgram = await prisma.programs.findFirst({
            where: {
                slug: slugToCheck,
                NOT: decodedProgramId ? { id: decodedProgramId } : undefined,
            },
        });

        res.json({
            success: true,
            isUnique: !existingProgram,
            slug: slugToCheck,
            message: existingProgram
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