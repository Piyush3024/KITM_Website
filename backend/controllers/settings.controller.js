import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { handleLocalFileUploads, generateFileUrl, deleteFile } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

// Default settings to initialize
const defaultSettings = [
    {
        setting_key: "site_name",
        setting_value: "College Website",
        setting_type: "text",
        group_name: "general",
        label: "Site Name",
        description: "The name of your college website",
        placeholder: "Enter site name",
        is_public: true,
        is_required: true,
        sort_order: 1,
        validation: { min: 2, max: 100 }
    },
    {
        setting_key: "site_logo",
        setting_value: null,
        setting_type: "file",
        group_name: "general",
        label: "Site Logo",
        description: "Main logo for your college website",
        is_public: true,
        is_required: false,
        sort_order: 2,
        validation: { fileTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"], maxSize: "2MB" }
    },
    {
        setting_key: "site_favicon",
        setting_value: null,
        setting_type: "file",
        group_name: "general",
        label: "Site Favicon",
        description: "Favicon for your website (16x16 or 32x32 px)",
        is_public: true,
        is_required: false,
        sort_order: 3,
        validation: { fileTypes: ["image/x-icon", "image/png"], maxSize: "1MB" }
    },
    {
        setting_key: "contact_email",
        setting_value: "info@college.edu",
        setting_type: "email",
        group_name: "contact",
        label: "Contact Email",
        description: "Primary contact email address",
        placeholder: "contact@college.edu",
        is_public: true,
        is_required: true,
        sort_order: 10,
        validation: { email: true }
    },
    {
        setting_key: "contact_phone",
        setting_value: null,
        setting_type: "text",
        group_name: "contact",
        label: "Contact Phone",
        description: "Primary contact phone number",
        placeholder: "+1 (555) 123-4567",
        is_public: true,
        is_required: false,
        sort_order: 11,
        validation: { pattern: "^[+]?[0-9\\s\\-\\(\\)]+$" }
    },
    {
        setting_key: "address",
        setting_value: null,
        setting_type: "text",
        group_name: "contact",
        label: "College Address",
        description: "Physical address of the college",
        placeholder: "123 College Street, City, State",
        is_public: true,
        is_required: false,
        sort_order: 12,
        validation: { max: 500 }
    },
    {
        setting_key: "social_facebook",
        setting_value: null,
        setting_type: "url",
        group_name: "social",
        label: "Facebook URL",
        description: "Facebook page URL",
        placeholder: "https://facebook.com/yourcollegepage",
        is_public: true,
        is_required: false,
        sort_order: 20,
        validation: { url: true }
    },
    {
        setting_key: "social_twitter",
        setting_value: null,
        setting_type: "url",
        group_name: "social",
        label: "Twitter URL",
        description: "Twitter profile URL",
        placeholder: "https://twitter.com/yourcollegepage",
        is_public: true,
        is_required: false,
        sort_order: 21,
        validation: { url: true }
    },
    {
        setting_key: "social_linkedin",
        setting_value: null,
        setting_type: "url",
        group_name: "social",
        label: "LinkedIn URL",
        description: "LinkedIn page URL",
        placeholder: "https://linkedin.com/company/yourcollegepage",
        is_public: true,
        is_required: false,
        sort_order: 22,
        validation: { url: true }
    },
    {
        setting_key: "maintenance_mode",
        setting_value: "false",
        setting_type: "boolean",
        group_name: "system",
        label: "Maintenance Mode",
        description: "Enable maintenance mode to disable public access",
        is_public: false,
        is_required: false,
        sort_order: 30,
        options: [
            { label: "Enabled", value: "true" },
            { label: "Disabled", value: "false" }
        ]
    },
    {
        setting_key: "max_upload_size",
        setting_value: "10",
        setting_type: "number",
        group_name: "system",
        label: "Max Upload Size (MB)",
        description: "Maximum file upload size in megabytes",
        placeholder: "10",
        is_public: false,
        is_required: true,
        sort_order: 31,
        validation: { min: 1, max: 100 }
    }
];

export const initializeSettings = async (req, res) => {
    try {
        const existingSettings = await prisma.settings.findMany();
        
        if (existingSettings.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Settings already initialized",
                data: { count: existingSettings.length }
            });
        }

        const createdSettings = await prisma.settings.createMany({
            data: defaultSettings.map(setting => ({
                ...setting,
                validation: setting.validation ? JSON.stringify(setting.validation) : null,
                options: setting.options ? JSON.stringify(setting.options) : null
            })),
            skipDuplicates: true
        });

        res.status(201).json({
            success: true,
            message: "Settings initialized successfully",
            data: { created: createdSettings.count }
        });
    } catch (error) {
        console.error("Error in initializeSettings controller:", error);
        res.status(500).json({
            success: false,
            message: "Error initializing settings",
            error: error.message,
        });
    }
};

export const getAllSettings = async (req, res) => {
    try {
        const {
            group_name,
            is_public,
            setting_type,
            page = 1,
            limit = 50,
            sortBy = "sort_order",
            sortOrder = "asc"
        } = req.query;

        const isAuthenticated = !!req.user;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const where = {};
        if (group_name) where.group_name = group_name;
        if (setting_type) where.setting_type = setting_type;
        if (is_public !== undefined) where.is_public = is_public === "true";
        
        // Non-authenticated users can only see public settings
        if (!isAuthenticated) where.is_public = true;

        const [settings, total] = await Promise.all([
            prisma.settings.findMany({
                where,
                skip,
                take,
                orderBy: { [sortBy]: sortOrder },
            }),
            prisma.settings.count({ where }),
        ]);

        const formattedSettings = settings.map(setting => ({
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        }));

        res.json({
            success: true,
            message: "Settings retrieved successfully",
            data: formattedSettings,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
                group_name: group_name || "all",
            },
        });
    } catch (error) {
        console.error("Error in getAllSettings controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving settings",
            error: error.message,
        });
    }
};

export const getSettingsByGroup = async (req, res) => {
    try {
        const { group_name } = req.params;
        const isAuthenticated = !!req.user;

        const where = { group_name };
        if (!isAuthenticated) where.is_public = true;

        const settings = await prisma.settings.findMany({
            where,
            orderBy: { sort_order: "asc" },
        });

        if (settings.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No settings found for group: ${group_name}`,
            });
        }

        const formattedSettings = settings.map(setting => ({
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        }));

        res.json({
            success: true,
            message: `Settings for group ${group_name} retrieved successfully`,
            data: formattedSettings,
            meta: {
                group_name,
                count: settings.length,
            },
        });
    } catch (error) {
        console.error("Error in getSettingsByGroup controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving settings by group",
            error: error.message,
        });
    }
};

export const getSettingByKey = async (req, res) => {
    try {
        const { setting_key } = req.params;
        const isAuthenticated = !!req.user;

        const where = { setting_key };
        if (!isAuthenticated) where.is_public = true;

        const setting = await prisma.settings.findFirst({ where });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found",
            });
        }

        const formattedSetting = {
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        };

        res.json({
            success: true,
            message: "Setting retrieved successfully",
            data: formattedSetting,
        });
    } catch (error) {
        console.error("Error in getSettingByKey controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving setting",
            error: error.message,
        });
    }
};

export const createSetting = async (req, res) => {
    try {
        const {
            setting_key,
            setting_value,
            setting_type = "text",
            group_name = "general",
            label,
            description,
            placeholder,
            validation,
            options,
            is_public = false,
            is_required = false,
            sort_order = 0,
        } = req.body;

        // Check if setting_key already exists
        const existingSetting = await prisma.settings.findUnique({
            where: { setting_key },
        });

        if (existingSetting) {
            return res.status(409).json({
                success: false,
                message: "Setting key already exists",
            });
        }

        // Handle file uploads
        let finalSettingValue = setting_value;
        const uploadedFiles = handleLocalFileUploads(req);

        if (setting_type === "file") {
            if (req.file) {
                finalSettingValue = req.file.path;
            } else if (uploadedFiles[setting_key]) {
                finalSettingValue = uploadedFiles[setting_key];
            }
        }

        const setting = await prisma.settings.create({
            data: {
                setting_key,
                setting_value: finalSettingValue,
                setting_type,
                group_name,
                label,
                description,
                placeholder,
                validation: validation ? JSON.stringify(validation) : null,
                options: options ? JSON.stringify(options) : null,
                is_public,
                is_required,
                sort_order,
            },
        });

        const formattedSetting = {
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        };

        res.status(201).json({
            success: true,
            message: "Setting created successfully",
            data: formattedSetting,
        });
    } catch (error) {
        console.error("Error in createSetting controller:", error);
        res.status(500).json({
            success: false,
            message: "Error creating setting",
            error: error.message,
        });
    }
};

export const updateSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            setting_value,
            setting_type,
            group_name,
            label,
            description,
            placeholder,
            validation,
            options,
            is_public,
            is_required,
            sort_order,
        } = req.body;

        const decodedId = decodeId(id);

        const existingSetting = await prisma.settings.findUnique({
            where: { id: decodedId },
        });

        if (!existingSetting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found",
            });
        }

        // Handle file uploads
        let finalSettingValue = setting_value;
        const uploadedFiles = handleLocalFileUploads(req);

        if (existingSetting.setting_type === "file" || setting_type === "file") {
            if (req.file) {
                finalSettingValue = req.file.path;
                // Delete old file if it exists
                if (existingSetting.setting_value && existingSetting.setting_type === "file") {
                    try {
                        await deleteFile(existingSetting.setting_value);
                    } catch (error) {
                        console.error(`Error deleting old file: ${existingSetting.setting_value}`, error);
                    }
                }
            } else if (uploadedFiles[existingSetting.setting_key]) {
                finalSettingValue = uploadedFiles[existingSetting.setting_key];
                // Delete old file if it exists
                if (existingSetting.setting_value && existingSetting.setting_type === "file") {
                    try {
                        await deleteFile(existingSetting.setting_value);
                    } catch (error) {
                        console.error(`Error deleting old file: ${existingSetting.setting_value}`, error);
                    }
                }
            }
        }

        const updateData = {
            setting_type,
            group_name,
            label,
            description,
            placeholder,
            validation: validation ? JSON.stringify(validation) : undefined,
            options: options ? JSON.stringify(options) : undefined,
            is_public,
            is_required,
            sort_order,
            updated_at: new Date(),
        };

        // Only update setting_value if provided or if it's a file upload
        if (finalSettingValue !== undefined) {
            updateData.setting_value = finalSettingValue;
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const setting = await prisma.settings.update({
            where: { id: decodedId },
            data: updateData,
        });

        const formattedSetting = {
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        };

        res.json({
            success: true,
            message: "Setting updated successfully",
            data: formattedSetting,
        });
    } catch (error) {
        console.error("Error in updateSetting controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating setting",
            error: error.message,
        });
    }
};

export const updateSettingByKey = async (req, res) => {
    try {
        const { setting_key } = req.params;
        const { setting_value } = req.body;

        const existingSetting = await prisma.settings.findUnique({
            where: { setting_key },
        });

        if (!existingSetting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found",
            });
        }

        // Handle file uploads
        let finalSettingValue = setting_value;
        const uploadedFiles = handleLocalFileUploads(req);

        if (existingSetting.setting_type === "file") {
            if (req.file) {
                finalSettingValue = req.file.path;
                // Delete old file if it exists
                if (existingSetting.setting_value) {
                    try {
                        await deleteFile(existingSetting.setting_value);
                    } catch (error) {
                        console.error(`Error deleting old file: ${existingSetting.setting_value}`, error);
                    }
                }
            } else if (uploadedFiles[setting_key]) {
                finalSettingValue = uploadedFiles[setting_key];
                // Delete old file if it exists
                if (existingSetting.setting_value) {
                    try {
                        await deleteFile(existingSetting.setting_value);
                    } catch (error) {
                        console.error(`Error deleting old file: ${existingSetting.setting_value}`, error);
                    }
                }
            }
        }

        const setting = await prisma.settings.update({
            where: { setting_key },
            data: {
                setting_value: finalSettingValue !== undefined ? finalSettingValue : existingSetting.setting_value,
                updated_at: new Date(),
            },
        });

        const formattedSetting = {
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        };

        res.json({
            success: true,
            message: "Setting updated successfully",
            data: formattedSetting,
        });
    } catch (error) {
        console.error("Error in updateSettingByKey controller:", error);
        res.status(500).json({
            success: false,
            message: "Error updating setting",
            error: error.message,
        });
    }
};

export const bulkUpdateSettings = async (req, res) => {
    try {
        const { settings } = req.body;

        if (!Array.isArray(settings) || settings.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Settings array is required",
            });
        }

        const updates = [];
        const uploadedFiles = handleLocalFileUploads(req);

        for (const settingUpdate of settings) {
            const { setting_key, setting_value } = settingUpdate;
            
            const existingSetting = await prisma.settings.findUnique({
                where: { setting_key },
            });

            if (!existingSetting) {
                continue; // Skip non-existent settings
            }

            let finalSettingValue = setting_value;

            // Handle file uploads for file type settings
            if (existingSetting.setting_type === "file") {
                if (uploadedFiles[setting_key]) {
                    finalSettingValue = uploadedFiles[setting_key];
                    // Delete old file if it exists
                    if (existingSetting.setting_value) {
                        try {
                            await deleteFile(existingSetting.setting_value);
                        } catch (error) {
                            console.error(`Error deleting old file: ${existingSetting.setting_value}`, error);
                        }
                    }
                }
            }

            updates.push(
                prisma.settings.update({
                    where: { setting_key },
                    data: {
                        setting_value: finalSettingValue !== undefined ? finalSettingValue : existingSetting.setting_value,
                        updated_at: new Date(),
                    },
                })
            );
        }

        const updatedSettings = await prisma.$transaction(updates);

        const formattedSettings = updatedSettings.map(setting => ({
            id: encodeId(setting.id),
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
            description: setting.description,
            placeholder: setting.placeholder,
            validation: setting.validation ? JSON.parse(setting.validation) : null,
            options: setting.options ? JSON.parse(setting.options) : null,
            is_public: setting.is_public,
            is_required: setting.is_required,
            sort_order: setting.sort_order,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        }));

        res.json({
            success: true,
            message: "Settings updated successfully",
            data: formattedSettings,
            meta: {
                updated: updatedSettings.length,
                requested: settings.length,
            },
        });
    } catch (error) {
        console.error("Error in bulkUpdateSettings controller:", error);
        res.status(500).json({
            success: false,
            message: "Error bulk updating settings",
            error: error.message,
        });
    }
};

export const deleteSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const decodedId = decodeId(id);

        const setting = await prisma.settings.findUnique({
            where: { id: decodedId },
        });

        if (!setting) {
            return res.status(404).json({
                success: false,
                message: "Setting not found",
            });
        }

        // Delete associated file if it's a file type setting
        if (setting.setting_type === "file" && setting.setting_value) {
            try {
                await deleteFile(setting.setting_value);
            } catch (error) {
                console.error(`Error deleting file: ${setting.setting_value}`, error);
            }
        }

        await prisma.settings.delete({
            where: { id: decodedId },
        });

        res.json({
            success: true,
            message: "Setting deleted successfully",
        });
    } catch (error) {
        console.error("Error in deleteSetting controller:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting setting",
            error: error.message,
        });
    }
};

export const resetSettings = async (req, res) => {
    try {
        // Delete all existing settings
        await prisma.settings.deleteMany({});

        // Recreate default settings
        await prisma.settings.createMany({
            data: defaultSettings.map(setting => ({
                ...setting,
                validation: setting.validation ? JSON.stringify(setting.validation) : null,
                options: setting.options ? JSON.stringify(setting.options) : null
            })),
        });

        res.json({
            success: true,
            message: "Settings reset to defaults successfully",
            data: { count: defaultSettings.length },
        });
    } catch (error) {
        console.error("Error in resetSettings controller:", error);
        res.status(500).json({
            success: false,
            message: "Error resetting settings",
            error: error.message,
        });
    }
};

export const getPublicSettings = async (req, res) => {
    try {
        const { group_name } = req.query;

        const where = { is_public: true };
        if (group_name) where.group_name = group_name;

        const settings = await prisma.settings.findMany({
            where,
            orderBy: [
                { group_name: "asc" },
                { sort_order: "asc" }
            ],
        });

        const formattedSettings = settings.map(setting => ({
            setting_key: setting.setting_key,
            setting_value: setting.setting_type === "file" && setting.setting_value 
                ? generateFileUrl(req, setting.setting_value) 
                : setting.setting_value,
            setting_type: setting.setting_type,
            group_name: setting.group_name,
            label: setting.label,
        }));

        // Group settings by group_name for easier consumption
        const groupedSettings = formattedSettings.reduce((acc, setting) => {
            if (!acc[setting.group_name]) {
                acc[setting.group_name] = {};
            }
            acc[setting.group_name][setting.setting_key] = {
                value: setting.setting_value,
                type: setting.setting_type,
                label: setting.label,
            };
            return acc;
        }, {});

        res.json({
            success: true,
            message: "Public settings retrieved successfully",
            data: groupedSettings,
            meta: {
                count: settings.length,
                groups: Object.keys(groupedSettings),
            },
        });
    } catch (error) {
        console.error("Error in getPublicSettings controller:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving public settings",
            error: error.message,
        });
    }
};