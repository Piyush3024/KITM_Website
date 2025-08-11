import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createNotice,
    getNoticeByIdOrSlug,
    getAllNotices,
    updateNotice,
    deleteNotice,
    searchNotices,
    getNoticeStatistics,
    toggleNoticeStatus,
    getNoticeByType,
    getAllPublishedNotices

} from "../controllers/notice.controller.js";
import { protectRoute, authRateLimit, checkRole, checkAdmin } from "../middleware/auth.middleware.js";
import { uploadSingle, validateFileTypes, organizeFiles, cleanupOnError } from "../middleware/multer.middleware.js";

const router = express.Router();

// Rate limiters
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

// Validation middleware
const validateCreate = [
    body("title")
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Title must be between 2 and 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Title can only contain letters, numbers, spaces, and basic punctuation"),
    body("slug")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Slug must be at most 255 characters")
        .matches(/^[a-z0-9-]+$/i)
        .withMessage("Slug can only contain letters, numbers, and hyphens"),
    body("content")
        .isLength({ min: 10 })
        .withMessage("Content must be at least 10 characters")
        .isLength({ max: 4294967295 })
        .withMessage("Content is too long"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("notice_type")
        .optional()
        .isIn(["general", "academic", "exam", "admission", "result", "event", "urgent"])
        .withMessage("Invalid notice type"),
    body("priority")
        .optional()
        .isIn(["low", "normal", "high", "urgent"])
        .withMessage("Invalid priority"),
    body("valid_from")
        .optional()
        .isISO8601()
        .withMessage("Valid from must be a valid ISO 8601 date"),
    body("valid_until")
        .optional()
        .isISO8601()
        .withMessage("Valid until must be a valid ISO 8601 date"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),

];

const validateType = [
    body("notice_type")
        .optional()
        .isIn(["general", "academic", "exam", "admission", "result", "event", "urgent"])
        .withMessage("Invalid notice type"),
]

const validateUpdate = [
    body("title")
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage("Title must be between 2 and 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Title can only contain letters, numbers, spaces, and basic punctuation"),
    body("slug")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Slug must be at most 255 characters")
        .matches(/^[a-z0-9-]+$/i)
        .withMessage("Slug can only contain letters, numbers, and hyphens"),
    body("content")
        .optional()
        .isLength({ min: 10 })
        .withMessage("Content must be at least 10 characters")
        .isLength({ max: 4294967295 })
        .withMessage("Content is too long"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("notice_type")
        .optional()
        .isIn(["general", "academic", "exam", "admission", "result", "event", "urgent"])
        .withMessage("Invalid notice type"),
    body("priority")
        .optional()
        .isIn(["low", "normal", "high", "urgent"])
        .withMessage("Invalid priority"),
    body("valid_from")
        .optional()
        .isISO8601()
        .withMessage("Valid from must be a valid ISO 8601 date"),
    body("valid_until")
        .optional()
        .isISO8601()
        .withMessage("Valid until must be a valid ISO 8601 date"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),

];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Notice ID is required"),
];

const validateIdOrSlug = [
    param("idOrSlug")
        .notEmpty()
        .withMessage("Notice ID or slug is required"),
];

const validateSearch = [
    query("query")
        .optional()
        .isLength({ max: 200 })
        .withMessage("Search query must be at most 200 characters"),
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
        .isIn(["published_at", "created_at", "title", "priority"])
        .withMessage("SortBy must be one of: published_at, created_at, title, priority"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("notice_type")
        .optional()
        .isIn(["general", "academic", "exam", "admission", "result", "event", "urgent"])
        .withMessage("Invalid notice type"),
    query("is_published")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_published must be true or false"),
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
            if (!value.every((item) => ["is_published", "is_featured"].includes(item))) {
                throw new Error("Toggle must contain only 'is_published' or 'is_featured'");
            }
            return true;
        }),
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

// Routes
router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    uploadSingle("attachment", "notices"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createNotice,
    cleanupOnError
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchNotices
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getNoticeStatistics
);
router.get(
    "/type",
    protectRoute,
    checkRole(["admin", "author"]),
    validateType,
    handleValidationErrors,
    getNoticeByType
);

router.get(
    "/published",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPublishedNotices
);



router.get(
    "/:idOrSlug",
    moderateLimiter,
    validateIdOrSlug,
    handleValidationErrors,
    getNoticeByIdOrSlug
);

router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateSearch,
    handleValidationErrors,
    getAllNotices
);


router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    uploadSingle("attachment", "notices"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateNotice,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteNotice
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    toggleNoticeStatus
);

export default router;