import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

export const createPartner = async (req, res) => {
    try {
        const {
            company_name,
            website_url,
            partnership_type = "general",
            description,
            contact_person,
            contact_email,
            contact_phone,
            partnership_date,
            is_active = true,
            is_featured = false,
            sort_order = 0,
        } = req.body;

        const IsActive = is_active === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;
        const sortOrder = parseInt(sort_order);


        // Handle logo upload
        let logoPath = null;
        if (req.file) {
            logoPath = req.file.path;
            console.log("Found single file:", logoPath);
        } else if (req.files) {
            if (Array.isArray(req.files)) {
                const logoFile = req.files.find(file => file.fieldname === 'logo');
                if (logoFile) {
                    logoPath = logoFile.path;
                    console.log("Found logo in array:", logoPath);
                }
            } else if (typeof req.files === 'object') {
                if (req.files.logo && req.files.logo[0]) {
                    logoPath = req.files.logo[0].path;
                    console.log("Found logo in object:", logoPath);
                }
            }
        }

        const uploadedFiles = handleLocalFileUploads(req);
        const finalLogoPath = logoPath || uploadedFiles.logo || null;
        console.log("Final logo path:", finalLogoPath);

        const partner = await prisma.partners.create({
            data: {
                company_name,
                logo: finalLogoPath,
                website_url,
                partnership_type,
                description,
                contact_person,
                contact_email,
                contact_phone,
                partnership_date: partnership_date ? new Date(partnership_date) : null,
                is_active: IsActive,
                is_featured: IsFeatured,
                sort_order: sortOrder,
            },
        });

        const logoUrl = partner.logo ? generateFileUrl(req, partner.logo) : null;
        console.log("Generated logo URL:", logoUrl);

        res.status(201).json({
            success: true,
            message: "Partner created successfully",
            data: {
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in createPartner controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating partner",
            error: error.message,
        });
    }
};

export const getPartnerById = async (req, res) => {
    try {console.log("Get partnee by I di si s")
        const { id } = req.params;
        const decodedId = decodeId(id);

        const partner = await prisma.partners.findUnique({
            where: { id: decodedId },
        });

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found",
            });
        }

        // Non-authenticated users can only see active partners
        // const isAuthenticated = !!req.user;
        // if (!isAuthenticated ) {
        //     return res.status(403).json({
        //         success: false,
        //         message: "Partner is not active",
        //     });
        // }

        res.json({
            success: true,
            message: "Partner retrieved successfully",
            data: {
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in getPartnerById controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving partner",
            error: error.message,
        });
    }
};

export const getAllPartners = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            partnership_type,
            is_active,
            is_featured,
        } = req.query;

        const isAuthenticated = !!req.user;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (partnership_type) where.partnership_type = partnership_type;
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        // Non-authenticated users can only see active partners
        if (!isAuthenticated) where.is_active = true;

        const [partners, total] = await Promise.all([
            prisma.partners.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.partners.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Partners retrieved successfully",
            data: partners.map((partner) => ({
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getAllPartners controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving partners",
            error: error.message,
        });
    }
};

export const getActivePartners = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            partnership_type,
            is_featured,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_active: true };
        if (partnership_type) where.partnership_type = partnership_type;
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        const [partners, total] = await Promise.all([
            prisma.partners.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.partners.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Active partners retrieved successfully",
            data: partners.map((partner) => ({
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getActivePartners controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving active partners",
            error: error.message,
        });
    }
};

export const getFeaturedPartners = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 6,
            sortBy = "sort_order",
            sortOrder = "asc",
            partnership_type,
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { is_active: true, is_featured: true };
        if (partnership_type) where.partnership_type = partnership_type;

        const [partners, total] = await Promise.all([
            prisma.partners.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.partners.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Featured partners retrieved successfully",
            data: partners.map((partner) => ({
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error in getFeaturedPartners controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving featured partners",
            error: error.message,
        });
    }
};

export const getPartnersByType = async (req, res) => {
    try {
        const {
            partnership_type,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            is_active,
            is_featured,
        } = req.query;

        const isAuthenticated = !!req.user;

        if (!partnership_type) {
            return res.status(400).json({
                success: false,
                message: "Partnership type is required",
            });
        }

        const validPartnershipTypes = ["internship", "placement", "training", "research", "mou", "general"];
        if (!validPartnershipTypes.includes(partnership_type)) {
            return res.status(400).json({
                success: false,
                message: `Invalid partnership type. Must be one of: ${validPartnershipTypes.join(", ")}`,
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = { partnership_type };
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        // Non-authenticated users can only see active partners
        if (!isAuthenticated) where.is_active = true;

        const [partners, total] = await Promise.all([
            prisma.partners.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.partners.count({ where }),
        ]);

        res.json({
            success: true,
            message: `Partners for type ${partnership_type} retrieved successfully`,
            data: partners.map((partner) => ({
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            })),
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                partnership_type,
            },
        });
    } catch (error) {
        console.error("Error in getPartnersByType controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving partners by type",
            error: error.message,
        });
    }
};

export const updatePartner = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            company_name,
            website_url,
            partnership_type,
            description,
            contact_person,
            contact_email,
            contact_phone,
            partnership_date,
            is_active,
            is_featured,
            sort_order,
        } = req.body;

        const IsActive = is_active === "true" ? true : false;
        const IsFeatured = is_featured === "true" ? true : false;
        const sortOrder = parseInt(sort_order);



        const decodedId = decodeId(id);

        const existingPartner = await prisma.partners.findUnique({
            where: { id: decodedId },
        });

        if (!existingPartner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found",
            });
        }

        // Handle logo upload with debugging
        let newLogoPath = null;

        // Check if there's a single file upload
        if (req.file && req.file.fieldname === 'logo') {
            newLogoPath = req.file.path;
        }
        // Check if there are multiple files and one is logo
        else if (req.files) {
            if (req.files.logo && req.files.logo[0]) {
                newLogoPath = req.files.logo[0].path;
            }
            // Handle array format from .any() middleware
            else if (Array.isArray(req.files)) {
                const logoFile = req.files.find(file => file.fieldname === 'logo');
                if (logoFile) {
                    newLogoPath = logoFile.path;
                }
            }
        }

        // Fallback to handleLocalFileUploads if above didn't work
        if (!newLogoPath) {
            const uploadedFiles = handleLocalFileUploads(req);
            newLogoPath = uploadedFiles.logo;
            if (newLogoPath) {
                console.log('Found logo via handleLocalFileUploads:', newLogoPath);
            }
        }

        const updateData = {
            company_name,
            website_url,
            partnership_type,
            description,
            contact_person,
            contact_email,
            contact_phone,
            partnership_date: partnership_date ? new Date(partnership_date) : undefined,
            is_active: IsActive,
            is_featured: IsFeatured,
            sort_order: sortOrder,
            updated_at: new Date(),
        };

        // Handle logo update
        if (newLogoPath) {
            // Delete the old logo if it exists
            if (existingPartner.logo) {
                try {
                    await deleteFile(existingPartner.logo);
                } catch (error) {
                    console.error(`Error deleting old logo: ${existingPartner.logo}`, error);
                    // Continue with the update even if deletion fails
                }
            }
            updateData.logo = newLogoPath;
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const partner = await prisma.partners.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Partner updated successfully",
            data: {
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in updatePartner controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating partner",
            error: error.message,
        });
    }
};

export const deletePartner = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const partner = await prisma.partners.findUnique({
            where: { id: decodedId },
        });

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found",
            });
        }

        // Delete associated logo if it exists
        if (partner.logo) {
            try {
                await deleteFile(partner.logo);
            } catch (error) {
                console.error(`Error deleting logo: ${partner.logo}`, error);
            }
        }

        await prisma.partners.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Partner deleted successfully",
        });
    } catch (error) {
        console.error("Error in deletePartner controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting partner",
            error: error.message,
        });
    }
};

export const searchPartners = async (req, res) => {
    try {
        const {
            query,
            page = 1,
            limit = 10,
            sortBy = "sort_order",
            sortOrder = "asc",
            partnership_type,
            is_active,
            is_featured,
        } = req.query;

        const isAuthenticated = !!req.user;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (query) {
            where.OR = [
                { company_name: { contains: query, mode: "insensitive" } },
                { description: { contains: query, mode: "insensitive" } },
                { contact_person: { contains: query, mode: "insensitive" } },
            ];
        }
        if (partnership_type) where.partnership_type = partnership_type;
        if (is_active !== undefined) where.is_active = is_active === "true";
        if (is_featured !== undefined) where.is_featured = is_featured === "true";

        // Non-authenticated users can only see active partners
        if (!isAuthenticated) where.is_active = true;

        const [partners, total] = await Promise.all([
            prisma.partners.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.partners.count({ where }),
        ]);

        res.json({
            success: true,
            message: "Partners retrieved successfully",
            data: partners.map((partner) => ({
                id: encodeId(partner.id),
                company_name: partner.company_name,
                logo: partner.logo ? generateFileUrl(req, partner.logo) : null,
                website_url: partner.website_url,
                partnership_type: partner.partnership_type,
                description: partner.description,
                contact_person: partner.contact_person,
                contact_email: partner.contact_email,
                contact_phone: partner.contact_phone,
                partnership_date: partner.partnership_date,
                is_active: partner.is_active,
                is_featured: partner.is_featured,
                sort_order: partner.sort_order,
                created_at: partner.created_at,
                updated_at: partner.updated_at,
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
        console.error("Error in searchPartners controller:", error);
        res.status(500).json({
            success: false,
            message: "Error searching partners",
            error: error.message,
        });
    }
};

export const getPartnerStatistics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const where = {};
        if (startDate && endDate) {
            where.partnership_date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        const [byPartnershipType, byStatus, byFeatured, totalPartners, activePartners] = await Promise.all([
            prisma.partners.groupBy({
                by: ["partnership_type"],
                where,
                _count: { id: true },
            }),
            prisma.partners.groupBy({
                by: ["is_active"],
                where,
                _count: { id: true },
            }),
            prisma.partners.groupBy({
                by: ["is_featured"],
                where: { ...where, is_active: true },
                _count: { id: true },
            }),
            prisma.partners.count({ where }),
            prisma.partners.count({ where: { ...where, is_active: true } }),
        ]);

        res.json({
            success: true,
            message: "Partner statistics retrieved successfully",
            data: {
                byPartnershipType: byPartnershipType.map((item) => ({
                    partnership_type: item.partnership_type,
                    count: item._count.id,
                })),
                byStatus: byStatus.map((item) => ({
                    is_active: item.is_active,
                    count: item._count.id,
                })),
                byFeatured: byFeatured.map((item) => ({
                    is_featured: item.is_featured,
                    count: item._count.id,
                })),
                summary: {
                    total_partners: totalPartners,
                    active_partners: activePartners,
                    inactive_partners: totalPartners - activePartners,
                },
            },
        });
    } catch (error) {
        console.error("Error in getPartnerStatistics controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving partner statistics",
            error: error.message,
        });
    }
};

export const togglePartnerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { toggle } = req.body;
        const decodedId = decodeId(id);

        const partner = await prisma.partners.findUnique({
            where: { id: decodedId },
        });

        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found",
            });
        }

        const updateData = {};
        if (toggle.includes("is_active")) {
            updateData.is_active = !partner.is_active;
        }
        if (toggle.includes("is_featured")) {
            updateData.is_featured = !partner.is_featured;
        }
        updateData.updated_at = new Date();

        const updatedPartner = await prisma.partners.update({
            where: { id: decodedId },
            data: updateData,
        });

        res.json({
            success: true,
            message: "Partner status toggled successfully",
            data: {
                id: encodeId(updatedPartner.id),
                company_name: updatedPartner.company_name,
                logo: updatedPartner.logo ? generateFileUrl(req, updatedPartner.logo) : null,
                website_url: updatedPartner.website_url,
                partnership_type: updatedPartner.partnership_type,
                description: updatedPartner.description,
                contact_person: updatedPartner.contact_person,
                contact_email: updatedPartner.contact_email,
                contact_phone: updatedPartner.contact_phone,
                partnership_date: updatedPartner.partnership_date,
                is_active: updatedPartner.is_active,
                is_featured: updatedPartner.is_featured,
                sort_order: updatedPartner.sort_order,
                created_at: updatedPartner.created_at,
                updated_at: updatedPartner.updated_at,
            },
        });
    } catch (error) {
        console.error("Error in togglePartnerStatus controller:", error);
        res.status(500).json({
            success: false,
            message: "Error toggling partner status",
            error: error.message,
        });
    }
};