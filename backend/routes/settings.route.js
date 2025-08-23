import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    initializeSettings,
    getAllSettings,
    getSettingsByGroup,
    getSettingByKey,
    createSetting,
    updateSetting,
    updateSettingByKey,
    bulkUpdateSettings,
    deleteSetting,
    resetSettings,
    getPublicSettings,
    getSettingById
} from "../controllers/settings.controller.js";
import { protectRoute, authRateLimit, checkAdmin } from "../middleware/auth.middleware.js";
import { uploadSingle, validateFileTypes, organizeFiles, cleanupOnError, setUploadEntity } from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(authRateLimit);

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: "Too many attempts. Please try again later.",
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: "Too many attempts. Please try again later.",
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(15 * 60),
        });
    },
});

const moderateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Moderate rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(15 * 60),
        });
    },
});

const relaxedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,
    message: {
        success: false,
        message: "Too many requests. Please try again later.",
        timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validation schemas
const validateCreate = [
    body("setting_key")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Setting key must be between 2 and 100 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Setting key can only contain lowercase letters, numbers, and underscores"),
    body("setting_value")
        .optional()
        .isLength({ max: 10000 })
        .withMessage("Setting value must be at most 10000 characters"),
    body("setting_type")
        .optional()
        .isIn(["text", "number", "boolean", "json", "file", "email", "url"])
        .withMessage("Invalid setting type"),
    body("group_name")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Group name must be at most 50 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Group name can only contain lowercase letters, numbers, and underscores"),
    body("label")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Label must be at most 100 characters"),
    body("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be at most 500 characters"),
    body("placeholder")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Placeholder must be at most 255 characters"),
    body("validation")
        .optional()
        .custom((value) => {
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value !== 'object') {
                    throw new Error('Invalid format');
                }
                return true;
            } catch (error) {
                throw new Error("Validation must be valid JSON");
            }
        }),
    body("options")
        .optional()
        .custom((value) => {
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value !== 'object') {
                    throw new Error('Invalid format');
                }
                return true;
            } catch (error) {
                throw new Error("Options must be valid JSON");
            }
        }),
    body("is_public")
        .optional()
        .isBoolean()
        .withMessage("is_public must be a boolean"),
    body("is_required")
        .optional()
        .isBoolean()
        .withMessage("is_required must be a boolean"),
    body("sort_order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Sort order must be a non-negative integer"),
];

const validateUpdate = [
    body("setting_value")
        .optional()
        .isLength({ max: 10000 })
        .withMessage("Setting value must be at most 10000 characters"),
    body("setting_type")
        .optional()
        .isIn(["text", "number", "boolean", "json", "file", "email", "url"])
        .withMessage("Invalid setting type"),
    body("group_name")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Group name must be at most 50 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Group name can only contain lowercase letters, numbers, and underscores"),
    body("label")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Label must be at most 100 characters"),
    body("description")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Description must be at most 500 characters"),
    body("placeholder")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Placeholder must be at most 255 characters"),
    body("validation")
        .optional()
        .custom((value) => {
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value !== 'object') {
                    throw new Error('Invalid format');
                }
                return true;
            } catch (error) {
                throw new Error("Validation must be valid JSON");
            }
        }),
    body("options")
        .optional()
        .custom((value) => {
            try {
                if (typeof value === 'string') {
                    JSON.parse(value);
                } else if (typeof value !== 'object') {
                    throw new Error('Invalid format');
                }
                return true;
            } catch (error) {
                throw new Error("Options must be valid JSON");
            }
        }),
    body("is_public")
        .optional()
        .isBoolean()
        .withMessage("is_public must be a boolean"),
    body("is_required")
        .optional()
        .isBoolean()
        .withMessage("is_required must be a boolean"),
    body("sort_order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Sort order must be a non-negative integer"),
];

const validateUpdateByKey = [
    body("setting_value")
        .optional()
        .isLength({ max: 10000 })
        .withMessage("Setting value must be at most 10000 characters"),
];

const validateBulkUpdate = [
    body("settings")
        .isArray({ min: 1 })
        .withMessage("Settings must be a non-empty array"),
    body("settings.*.setting_key")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Setting key must be between 2 and 100 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Setting key can only contain lowercase letters, numbers, and underscores"),
    body("settings.*.setting_value")
        .optional()
        .isLength({ max: 10000 })
        .withMessage("Setting value must be at most 10000 characters"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Setting ID is required"),
];

const validateKey = [
    param("setting_key")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Setting key must be between 2 and 100 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Setting key can only contain lowercase letters, numbers, and underscores"),
];

const validateGroup = [
    param("group_name")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Group name must be between 2 and 50 characters")
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Group name can only contain lowercase letters, numbers, and underscores"),
];

const validateQuery = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),
    query("sortBy")
        .optional()
        .isIn(["sort_order", "setting_key", "group_name", "created_at", "updated_at"])
        .withMessage("SortBy must be one of: sort_order, setting_key, group_name, created_at, updated_at"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("group_name")
        .optional()
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Group name can only contain lowercase letters, numbers, and underscores"),
    query("setting_type")
        .optional()
        .isIn(["text", "number", "boolean", "json", "file", "email", "url"])
        .withMessage("Invalid setting type"),
    query("is_public")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_public must be true or false"),
];

const validatePublicQuery = [
    query("group_name")
        .optional()
        .matches(/^[a-z0-9_]+$/)
        .withMessage("Group name can only contain lowercase letters, numbers, and underscores"),
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn(`Validation failed for ${req.method} ${req.path}:`, {
            ip: req.ip,
            errors: errors.array(),
            body: req.body ? Object.keys(req.body) : "no body",
        });

        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map((error) => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value ? "[REDACTED]" : undefined,
            })),
            timestamp: new Date().toISOString(),
        });
    }
    next();
};

// Public routes (no authentication required)
router.get(
    "/public",
    relaxedLimiter,
    validatePublicQuery,
    handleValidationErrors,
    getPublicSettings
);

// Admin initialization route
router.post(
    "/initialize",
    strictLimiter,
    protectRoute,
    checkAdmin,
    handleValidationErrors,
    initializeSettings
);

// Admin reset route
router.post(
    "/reset",
    strictLimiter,
    protectRoute,
    checkAdmin,
    handleValidationErrors,
    resetSettings
);

// Bulk update route
router.put(
    "/bulk",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("settings"),
    uploadSingle("file", "settings"),
    organizeFiles,
    validateFileTypes,
    validateBulkUpdate,
    handleValidationErrors,
    bulkUpdateSettings,
    cleanupOnError
);

// Create setting route
router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("settings"),
    uploadSingle("file", "settings"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createSetting,
    cleanupOnError
);

// Get all settings (admin only)
router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkAdmin,
    validateQuery,
    handleValidationErrors,
    getAllSettings
);

// Get settings by group (accessible by authenticated users, public settings for non-authenticated)
router.get(
    "/group/:group_name",
    moderateLimiter,
    validateGroup,
    handleValidationErrors,
    getSettingsByGroup
);

// Get setting by key (accessible by authenticated users, public settings for non-authenticated)
router.get(
    "/key/:setting_key",
    moderateLimiter,
    validateKey,
    handleValidationErrors,
    getSettingByKey
);
router.get(
    "/:id",
    moderateLimiter,
    protectRoute,
    checkAdmin,
    // validateKey,
    // handleValidationErrors,
    getSettingById
);

// Update setting by ID (admin only)
router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("settings"),
    uploadSingle("file", "settings"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateSetting,
    cleanupOnError
);

// Update setting by key (admin only)
router.patch(
    "/key/:setting_key",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("settings"),
    uploadSingle("file", "settings"),
    organizeFiles,
    validateFileTypes,
    validateKey,
    validateUpdateByKey,
    handleValidationErrors,
    updateSettingByKey,
    cleanupOnError
);

// Delete setting (admin only)
router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteSetting
);

export default router;