import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

export const createFaculty = async (req, res) => {
    try {
        const {
            full_name,
            designation,
            department,
            qualification,
            specialization,
            experience_years,
            bio,
            email,
            phone,
            social_links,
            is_active = true,
            is_featured = false,
            sort_order = 0,
        } = req.body;
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;
        // Check for existing email
        const existing = await prisma.faculty.findFirst({
            where: { email },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Email already exists",
            });
        }

        // Handle file uploads
        let profileImagePath = null;
        if (req.file) {
            profileImagePath = req.file.path;
        } else if (req.files?.profile_image?.[0]) {
            profileImagePath = req.files.profile_image[0].path;
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalProfileImagePath = profileImagePath || uploadedFiles.profile_image || null;

        const faculty = await prisma.faculty.create({
            data: {
                full_name,
                designation,
                department,
                qualification,
                specialization,
                experience_years: experience_years ? parseInt(experience_years) : null,
                bio,
                email,
                phone,
                social_links: social_links ? JSON.parse(social_links) : null,
                is_active : isActive,
                is_featured : isFeatured,
                sort_order: sort_order ? parseInt(sort_order) : 0,
                profile_image: finalProfileImagePath,
                created_at: new Date(),
                updated_at: new Date(),
            },
        });


        const profileImageUrl = faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null;

        res.status(201).json({
            success: true,
            message: "Faculty created successfully",
            data: {
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: profileImageUrl,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createFaculty controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating faculty",
            error: error.message,
        });
    }
};

export const getFacultyById = async (req, res) => {
    try {
        const { id } = req.params;
        const isAuthenticated = !!req.user;

        const decodedId = decodeId(id);
        const faculty = await prisma.faculty.findUnique({
            where: { id: decodedId },
        });

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found",
            });
        }

        if (!isAuthenticated && !faculty.is_active) {
            return res.status(403).json({
                success: false,
                message: "Faculty is not active",
            });
        }

        res.json({
            success: true,
            message: "Faculty retrieved successfully",
            data: {
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getFacultyById controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving faculty",
            error: error.message,
        });
    }
};

export const getAllFaculties = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "created_at",
            sortOrder = "desc",
            department,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (department) where.department = department;


        const [faculties, total] = await Promise.all([
            prisma.faculty.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.faculty.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Faculties retrieved successfully",
            data: faculties.map((faculty) => ({
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllFaculties controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving faculties",
            error: error.message,
        });
    }
};

export const  updateFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            full_name,
            designation,
            department,
            qualification,
            specialization,
            experience_years,
            bio,
            email,
            phone,
            social_links,
            is_active,
            is_featured,
            sort_order,
        } = req.body;
        const decodedId = decodeId(id);
        const isActive = is_active === "true" ? true : false;
        const isFeatured = is_featured === "true" ? true : false;

        const existingFaculty = await prisma.faculty.findUnique({
            where: { id: decodedId },
        });

        if (!existingFaculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found",
            });
        }

        if (email && email !== existingFaculty.email) {
            const existing = await prisma.faculty.findFirst({
                where: { email, NOT: { id: decodedId } },
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists",
                });
            }
        }

        // Handle file uploads
        let newProfileImagePath = null;
        if (req.file && req.file.fieldname === "profile_image") {
            newProfileImagePath = req.file.path;
        } else if (req.files?.profile_image?.[0]) {
            newProfileImagePath = req.files.profile_image[0].path;
        } else {
            const uploadedFiles = handleLocalFileUploads(req);
            newProfileImagePath = uploadedFiles.profile_image;
        }

        const updateData = {
            full_name,
            designation,
            department,
            qualification,
            specialization,
            experience_years: experience_years !== undefined ? parseInt(experience_years) : undefined,
            bio,
            email,
            phone,
            social_links: social_links ? JSON.parse(social_links) : undefined,
            is_active : isActive,
            is_featured : isFeatured,
            sort_order: sort_order !== undefined ? parseInt(sort_order) : undefined,
            updated_at: new Date(),
        };

        if (newProfileImagePath) {
            if (existingFaculty.profile_image) {
                try {
                    await deleteFile(existingFaculty.profile_image);
                } catch (error) {
                    console.error(`Error deleting old profile image: ${existingFaculty.profile_image}`, error);
                }
            }
            updateData.profile_image = newProfileImagePath;
        }

        const faculty = await prisma.faculty.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Faculty updated successfully",
            data: {
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updateFaculty controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating faculty",
            error: error.message,
        });
    }
};

export const deleteFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const faculty = await prisma.faculty.findUnique({
            where: { id: decodedId },
        });

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found",
            });
        }

        if (faculty.profile_image) {
            await deleteFile(faculty.profile_image);
        }

        await prisma.faculty.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Faculty deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteFaculty controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting faculty",
            error: error.message,
        });
    }
};

export const searchFaculties = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "created_at",
            sortOrder = "desc",
            department,
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;
        const isFeatured = is_featured === "true" ? true : false;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { full_name: { contains: query, mode: "insensitive" } },
                { designation: { contains: query, mode: "insensitive" } },
                { department: { contains: query, mode: "insensitive" } },
                { qualification: { contains: query, mode: "insensitive" } },
                { specialization: { contains: query, mode: "insensitive" } },
                { bio: { contains: query, mode: "insensitive" } },
            ];
        }
        if (department) where.department = department;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_active = true;

        const [faculties, total] = await Promise.all([
            prisma.faculty.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.faculty.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Faculties retrieved successfully",
            data: faculties.map((faculty) => ({
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in searchFaculties controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching faculties",
            error: error.message,
        });
    }
};

export const getFacultyStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.created_at = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byDepartment, byActive, byFeatured] = await Promise.all([
            prisma.faculty.groupBy({
                by: ["department"],
                where,
                _count: { id: true },
            }),
            prisma.faculty.groupBy({
                by: ["is_active"],
                where,
                _count: { id: true },
            }),
            prisma.faculty.groupBy({
                by: ["is_featured"],
                where,
                _count: { id: true },
            }),
        ]);

        res.json({
            success: true,
            message: "Faculty statistics retrieved successfully",
            data: {
                byDepartment: byDepartment.map((item) => ({
                    department: item.department,
                    count: item._count.id,
                })),
                byActive: byActive.map((item) => ({
                    is_active: item.is_active,
                    count: item._count.id,
                })),
                byFeatured: byFeatured.map((item) => ({
                    is_featured: item.is_featured,
                    count: item._count.id,
                })),
            },
        });
    } catch (error) {
        console.error("Error in getFacultyStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving faculty statistics",
            error: error.message,
        });
    }
};

export const toggleFacultyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const faculty = await prisma.faculty.findUnique({
            where: { id: decodedId },
        });

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: "Faculty not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_active")) {
            updateData.is_active = !faculty.is_active;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !faculty.is_featured;
        }
        updateData.updated_at = new Date();

        const updatedFaculty = await prisma.faculty.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Faculty status toggled successfully",
            data: {
                id: encodeId(updatedFaculty.id),
                full_name: updatedFaculty.full_name,
                designation: updatedFaculty.designation,
                department: updatedFaculty.department,
                qualification: updatedFaculty.qualification,
                specialization: updatedFaculty.specialization,
                experience_years: updatedFaculty.experience_years,
                bio: updatedFaculty.bio,
                email: updatedFaculty.email,
                phone: updatedFaculty.phone,
                social_links: updatedFaculty.social_links,
                is_active: updatedFaculty.is_active,
                is_featured: updatedFaculty.is_featured,
                sort_order: updatedFaculty.sort_order,
                profile_image: updatedFaculty.profile_image ? generateFileUrl(req, updatedFaculty.profile_image) : null,
                created_at: updatedFaculty.created_at,
                updated_at: updatedFaculty.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in toggleFacultyStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling faculty status",
            error: error.message,
        });
    }
};

export const getFacultyByDepartment = async (req, res) => {
    try {
        const {
            department,
            page = 1,
            limit = 10,
            sortBy = "created_at",
            sortOrder = "desc",
            is_featured,
        } = req.query;
        const isAuthenticated = !!req.user;
        const isFeatured = is_featured === "true" ? true : false;
        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Department is required",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { department };
        if (is_featured !== undefined) where.is_featured = is_featured === "true";
        if (!isAuthenticated) where.is_active = true;

        const [faculties, total] = await Promise.all([
            prisma.faculty.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.faculty.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Faculties for department ${department} retrieved successfully`,
            data: faculties.map((faculty) => ({
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                department,
            },
        });
    } catch (error) {
        console.error("Error in getFacultyByDepartment controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving faculties by department",
            error: error.message,
        });
    }
};

export const getFacultyByStatus = async (req, res) => {
    try {
        const {
            is_active,
            page = 1,
            limit = 10,
            sortBy = "created_at",
            sortOrder = "desc",
            department,
            is_featured,
        } = req.query;
        const isFeatured = is_featured === "true" ? true : false;
        const isAuthenticated = !!req.user;

        if (is_active === undefined) {
            return res.status(400).json({
                success: false,
                message: "Active status is required",
            });
        }

        const activeStatus = is_active === "true";
        if (!isAuthenticated && !activeStatus) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized to access inactive faculties",
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_active: activeStatus };
        if (department) where.department = department;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        const [faculties, total] = await Promise.all([
            prisma.faculty.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.faculty.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Faculties for status ${activeStatus ? "active" : "inactive"} retrieved successfully`,
            data: faculties.map((faculty) => ({
                id: encodeId(faculty.id),
                full_name: faculty.full_name,
                designation: faculty.designation,
                department: faculty.department,
                qualification: faculty.qualification,
                specialization: faculty.specialization,
                experience_years: faculty.experience_years,
                bio: faculty.bio,
                email: faculty.email,
                phone: faculty.phone,
                social_links: faculty.social_links,
                is_active: faculty.is_active,
                is_featured: faculty.is_featured,
                sort_order: faculty.sort_order,
                profile_image: faculty.profile_image ? generateFileUrl(req, faculty.profile_image) : null,
                created_at: faculty.created_at,
                updated_at: faculty.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                is_active: activeStatus,
            },
        });
    } catch (error) {
        console.error("Error in getFacultyByStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving faculties by status",
            error: error.message,
        });
    }
};

