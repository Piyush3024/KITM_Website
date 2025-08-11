


import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createTestimonial,
    getTestimonialByIdOrSlug,
    getAllTestimonials,
    getAllPublishedTestimonials,
    updateTestimonial,
    deleteTestimonial,
    searchTestimonials,
    getTestimonialStatistics,
    toggleTestimonialStatus,
    getTestimonialsByProgram
} from "../controllers/testimonial.controller.js";
import { protectRoute, authRateLimit, checkRole, checkAdmin } from "../middleware/auth.middleware.js";
import { uploadTestimonial, validateFileTypes, organizeFiles, cleanupOnError } from "../middleware/multer.middleware.js";

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
    body("student_name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Student name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
        .withMessage("Student name can only contain letters and spaces"),
    body("program_name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Program name must be at most 100 characters"),
    body("graduation_year")
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 10 })
        .withMessage(`Graduation year must be between 1900 and ${new Date().getFullYear() + 10}`),
    body("current_position")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Current position must be at most 100 characters"),
    body("company")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Company must be at most 100 characters"),
    body("content")
        .trim()
        .isLength({ min: 10, max: 65535 })
        .withMessage("Content must be between 10 and 65535 characters"),
    body("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    body("student_image")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Student image URL must be at most 255 characters"),
    body("video_file")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Video file URL must be at most 255 characters"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
    body("sort_order")
        .optional()
        .isInt()
        .withMessage("Sort order must be an integer"),
    body("slug")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Slug must be at most 100 characters")
        .matches(/^[a-z0-9-]+$/i)
        .withMessage("Slug can only contain letters, numbers, and hyphens"),
];

const validateUpdate = [
    body("student_name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Student name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
        .withMessage("Student name can only contain letters and spaces"),

    body("program_name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Program name must be at most 100 characters"),
    body("graduation_year")
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 10 })
        .withMessage(`Graduation year must be between 1900 and ${new Date().getFullYear() + 10}`),
    body("current_position")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Current position must be at most 100 characters"),
    body("company")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Company must be at most 100 characters"),
    body("content")
        .optional()
        .trim()
        .isLength({ min: 10, max: 65535 })
        .withMessage("Content must be between 10 and 65535 characters"),
    body("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    body("student_image")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Student image URL must be at most 255 characters"),
    body("video_file")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Video file URL must be at most 255 characters"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
    body("sort_order")
        .optional()
        .isInt()
        .withMessage("Sort order must be an integer"),
    body("slug")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Slug must be at most 100 characters")
        .matches(/^[a-z0-9-]+$/i)
        .withMessage("Slug can only contain letters, numbers, and hyphens"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Testimonial ID is required"),
];

const validateIdOrSlug = [
    param("idOrSlug")
        .notEmpty()
        .withMessage("Testimonial ID or slug is required"),
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
        .isIn(["sort_order", "created_at", "student_name"])
        .withMessage("SortBy must be one of: sort_order, created_at, student_name"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("program_id")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Program ID must be a positive integer"),
    query("is_published")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_published must be true or false"),
    query("is_featured")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_featured must be true or false"),
    query("graduation_year")
        .optional()
        .isInt({ min: 1900, max: new Date().getFullYear() + 10 })
        .withMessage(`Graduation year must be between 1900 and ${new Date().getFullYear() + 10}`),
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

const validateByProgram = [
    query("program_id")
        .notEmpty()
        .withMessage("Program ID is required"),
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
        .isIn(["sort_order", "created_at", "student_name"])
        .withMessage("SortBy must be one of: sort_order, created_at, student_name"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("is_published")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_published must be true or false"),
    query("is_featured")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_featured must be true or false"),
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
    uploadTestimonial,
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createTestimonial,
    cleanupOnError
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchTestimonials
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getTestimonialStatistics
);

router.get(
    "/by-program",
    moderateLimiter,
    validateByProgram,
    handleValidationErrors,
    getTestimonialsByProgram
);

router.get(
    "/published",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPublishedTestimonials
);

router.get(
    "/:idOrSlug",
    moderateLimiter,
    validateIdOrSlug,
    handleValidationErrors,
    getTestimonialByIdOrSlug
);

router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateSearch,
    handleValidationErrors,
    getAllTestimonials
);

router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    uploadTestimonial,
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateTestimonial,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteTestimonial
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    toggleTestimonialStatus
);

export default router;
