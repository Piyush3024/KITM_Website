import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createPartner,
    getPartnerById,
    getAllPartners,
    getActivePartners,
    getFeaturedPartners,
    getPartnersByType,
    updatePartner,
    deletePartner,
    searchPartners,
    getPartnerStatistics,
    togglePartnerStatus
} from "../controllers/partners.controller.js";
import { protectRoute, authRateLimit, checkRole, checkAdmin } from "../middleware/auth.middleware.js";
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
    body("company_name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Company name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.&()-]+$/)
        .withMessage("Company name can only contain letters, numbers, spaces, and basic punctuation"),
    body("website_url")
        .optional()
        .isURL()
        .withMessage("Website URL must be a valid URL")
        .isLength({ max: 255 })
        .withMessage("Website URL must be at most 255 characters"),
    body("partnership_type")
        .optional()
        .isIn(["internship", "placement", "training", "research", "mou", "general"])
        .withMessage("Invalid partnership type"),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be at most 1000 characters"),
    body("contact_person")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Contact person must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F.'-]+$/)
        .withMessage("Contact person can only contain letters, spaces, and basic punctuation"),
    body("contact_email")
        .optional()
        .isEmail()
        .withMessage("Contact email must be a valid email address")
        .isLength({ max: 100 })
        .withMessage("Contact email must be at most 100 characters"),
    body("contact_phone")
        .optional()
        .matches(/^[+]?[0-9\s\-\(\)]+$/)
        .withMessage("Contact phone must be a valid phone number")
        .isLength({ max: 20 })
        .withMessage("Contact phone must be at most 20 characters"),
    body("partnership_date")
        .optional()
        .isISO8601()
        .withMessage("Partnership date must be a valid ISO 8601 date"),
    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
    body("sort_order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Sort order must be a non-negative integer"),
];

const validateUpdate = [
    body("company_name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Company name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.&()-]+$/)
        .withMessage("Company name can only contain letters, numbers, spaces, and basic punctuation"),
    body("website_url")
        .optional()
        .isURL()
        .withMessage("Website URL must be a valid URL")
        .isLength({ max: 255 })
        .withMessage("Website URL must be at most 255 characters"),
    body("partnership_type")
        .optional()
        .isIn(["internship", "placement", "training", "research", "mou", "general"])
        .withMessage("Invalid partnership type"),
    body("description")
        .optional()
        .isLength({ max: 1000 })
        .withMessage("Description must be at most 1000 characters"),
    body("contact_person")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Contact person must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F.'-]+$/)
        .withMessage("Contact person can only contain letters, spaces, and basic punctuation"),
    body("contact_email")
        .optional()
        .isEmail()
        .withMessage("Contact email must be a valid email address")
        .isLength({ max: 100 })
        .withMessage("Contact email must be at most 100 characters"),
    body("contact_phone")
        .optional()
        .matches(/^[+]?[0-9\s\-\(\)]+$/)
        .withMessage("Contact phone must be a valid phone number")
        .isLength({ max: 20 })
        .withMessage("Contact phone must be at most 20 characters"),
    body("partnership_date")
        .optional()
        .isISO8601()
        .withMessage("Partnership date must be a valid ISO 8601 date"),
    body("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
    body("sort_order")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Sort order must be a non-negative integer"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Partner ID is required"),
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
        .isIn(["sort_order", "company_name", "partnership_type", "partnership_date", "created_at", "updated_at"])
        .withMessage("SortBy must be one of: sort_order, company_name, partnership_type, partnership_date, created_at, updated_at"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("partnership_type")
        .optional()
        .isIn(["internship", "placement", "training", "research", "mou", "general"])
        .withMessage("Invalid partnership type"),
    query("is_active")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_active must be true or false"),
    query("is_featured")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_featured must be true or false"),
];

const validateSearch = [
    query("query")
        .optional()
        .isLength({ max: 200 })
        .withMessage("Search query must be at most 200 characters"),
    ...validateQuery,
];

const validateStats = [
    query("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid ISO 8601 date"),
    query("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO 8601 date"),
    query()
        .custom((value, { req }) => {
            if (req.query.startDate && req.query.endDate) {
                const start = new Date(req.query.startDate);
                const end = new Date(req.query.endDate);
                if (start > end) {
                    throw new Error("Start date must be before end date");
                }
            }
            return true;
        }),
];

const validateToggle = [
    body("toggle")
        .isArray()
        .withMessage("Toggle must be an array")
        .custom((value) => {
            if (!value.every((item) => ["is_active", "is_featured"].includes(item))) {
                throw new Error("Toggle must contain only 'is_active' or 'is_featured'");
            }
            return true;
        }),
];

const validateType = [
    query("partnership_type")
        .notEmpty()
        .withMessage("Partnership type is required")
        .isIn(["internship", "placement", "training", "research", "mou", "general"])
        .withMessage("Invalid partnership type"),
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
    "/active",
    relaxedLimiter,
    validateQuery,
    handleValidationErrors,
    getActivePartners
);

router.get(
    "/featured",
    relaxedLimiter,
    validateQuery,
    handleValidationErrors,
    getFeaturedPartners
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchPartners
);

router.get(
    "/type",
    moderateLimiter,
    validateType,
    validateQuery,
    handleValidationErrors,
    getPartnersByType
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getPartnerStatistics
);

// Create partner route (admin only)
router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("partners"),
    uploadSingle("logo", "partners"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createPartner,
    cleanupOnError
);

// Get all partners (admin only)
router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateQuery,
    handleValidationErrors,
    getAllPartners
);

// Get partner by ID (accessible by authenticated users, active partners for non-authenticated)
router.get(
    "/:id",
    moderateLimiter,
    validateId,
    handleValidationErrors,
    getPartnerById
);

// Update partner (admin only)
router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("partners"),
    uploadSingle("logo", "partners"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updatePartner,
    cleanupOnError
);

// Delete partner (admin only)
router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deletePartner
);

// Toggle partner status (admin only)
router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    togglePartnerStatus
);

export default router;