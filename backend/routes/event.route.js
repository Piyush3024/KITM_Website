
import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createEvent,
    getEventByIdOrSlug,
    getAllEvents,
    updateEvent,
    deleteEvent,
    searchEvents,
    getEventStatistics,
    toggleEventStatus,
    getEventByType,
    getAllPublishedEvents,
    checkSlugUniqueness
} from "../controllers/event.controller.js";
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
    body("description")
        .isLength({ min: 10 })
        .withMessage("Description must be at least 10 characters"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("event_type")
        .optional()
        .isIn(["seminar", "workshop", "conference", "cultural", "sports", "graduation", "other"])
        .withMessage("Invalid event type"),
    body("start_date")
        .isISO8601()
        .withMessage("Start date must be a valid ISO 8601 date"),
    body("end_date")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO 8601 date"),
    // body("start_time")
    //     .optional()
    //     .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    //     .withMessage("Start time must be in HH:mm:ss format"),
    // body("end_time")
    //     .optional()
    //     .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    //     .withMessage("End time must be in HH:mm:ss format"),
    body("location")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Location must be at most 255 characters"),
    body("registration_required")
        .optional()
        .isBoolean()
        .withMessage("registration_required must be a boolean"),
    body("registration_link")
        .optional()
        .isURL()
        .withMessage("Registration link must be a valid URL")
        .isLength({ max: 500 })
        .withMessage("Registration link must be at most 500 characters"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
];

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
    body("description")
        .optional()
        .isLength({ min: 10 })
        .withMessage("Description must be at least 10 characters"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("event_type")
        .optional()
        .isIn(["seminar", "workshop", "conference", "cultural", "sports", "graduation", "other"])
        .withMessage("Invalid event type"),
    body("start_date")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid ISO 8601 date"),
    body("end_date")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO 8601 date"),
    body("start_time")
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
        .withMessage("Start time must be in HH:mm:ss format"),
    body("end_time")
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
        .withMessage("End time must be in HH:mm:ss format"),
    body("location")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Location must be at most 255 characters"),
    body("registration_required")
        .optional()
        .isBoolean()
        .withMessage("registration_required must be a boolean"),
    body("registration_link")
        .optional()
        .isURL()
        .withMessage("Registration link must be a valid URL")
        .isLength({ max: 500 })
        .withMessage("Registration link must be at most 500 characters"),
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
        .withMessage("Event ID is required"),
];

const validateIdOrSlug = [
    param("idOrSlug")
        .notEmpty()
        .withMessage("Event ID or slug is required"),
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
        .isIn(["start_date", "created_at", "title"])
        .withMessage("SortBy must be one of: start_date, created_at, title"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("event_type")
        .optional()
        .isIn(["seminar", "workshop", "conference", "cultural", "sports", "graduation", "other"])
        .withMessage("Invalid event type"),
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

const validateType = [
    query("event_type")
        .notEmpty()
        .withMessage("Event type is required")
        .isIn(["seminar", "workshop", "conference", "cultural", "sports", "graduation", "other"])
        .withMessage("Invalid event type"),
];

const handleCheckSlugUniqueness = [
    body("slug")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Slug must be at most 255 characters")
        .matches(/^[a-z0-9-]+$/i)
        .withMessage("Slug can only contain letters, numbers, and hyphens"),
]

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

router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("events"),
    uploadSingle("featured_image", "events"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createEvent,
    cleanupOnError
);

router.get("/check-slug/:slug",

    protectRoute,
    checkAdmin,
    handleCheckSlugUniqueness,
    handleValidationErrors,
    checkSlugUniqueness
);


router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchEvents
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getEventStatistics
);

router.get(
    "/type",
    moderateLimiter,
    validateType,
    handleValidationErrors,
    getEventByType
);
router.get(
    "/published",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPublishedEvents
);

router.get(
    "/:idOrSlug",
    moderateLimiter,
    validateIdOrSlug,
    handleValidationErrors,
    getEventByIdOrSlug
);

router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateSearch,
    handleValidationErrors,
    getAllEvents
);


router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("events"),
    uploadSingle("featured_image", "events"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateEvent,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteEvent
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    toggleEventStatus
);

export default router;