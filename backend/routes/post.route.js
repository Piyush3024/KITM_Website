


import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createPost,
    getPostByIdOrSlug,
    getAllPublishedPosts,
    updatePost,
    deletePost,
    searchPosts,
    getPostStatistics,
    togglePostStatus,
    getPostByType,
    getPostByStatus,
    getAllPosts,
    checkSlugUniqueness,
    togglePostFeatured
} from "../controllers/post.controller.js";
import { protectRoute, authRateLimit, checkRole, checkAdmin, attachUserIfPresent } from "../middleware/auth.middleware.js";
import { uploadAny, validateFileTypes, organizeFiles, cleanupOnError, setUploadEntity } from "../middleware/multer.middleware.js";

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
    keyGenerator: (req, res) => {
        const ipKey = ipKeyGenerator(req, res);
        const token = req.cookies?.accessToken || req.headers.authorization || 'guest';
        const base = req.baseUrl || '';
        return `${ipKey}|${token}|${req.method}|${base}${req.path}`;
    },
    handler: (req, res) => {
        console.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: "Too many attempts. Please try again later.",
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(15 * 60),
        });
    }
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
    skip: () => process.env.NODE_ENV === 'test'
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
    body("content")
        .isLength({ min: 10 })
        .withMessage("Content must be at least 10 characters"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("meta_title")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Meta title must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Meta title can only contain letters, numbers, spaces, and basic punctuation"),
    body("meta_description")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Meta description must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Meta description can only contain letters, numbers, spaces, and basic punctuation"),
    body("status")
        .optional()
        .isIn(["draft", "published", "archived"])
        .withMessage("Invalid status"),
    body("post_type")
        .optional()
        .isIn(["blog", "news", "announcement"])
        .withMessage("Invalid post type"),
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
    body("content")
        .optional()
        .isLength({ min: 10 })
        .withMessage("Content must be at least 10 characters"),
    body("excerpt")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Excerpt must be at most 65535 characters"),
    body("meta_title")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Meta title must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Meta title can only contain letters, numbers, spaces, and basic punctuation"),
    body("meta_description")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Meta description must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()-]+$/)
        .withMessage("Meta description can only contain letters, numbers, spaces, and basic punctuation"),
    body("status")
        .optional()
        .isIn(["draft", "published", "archived"])
        .withMessage("Invalid status"),
    body("post_type")
        .optional()
        .isIn(["blog", "news", "announcement"])
        .withMessage("Invalid post type"),
    body("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Post ID is required"),
];

const validateIdOrSlug = [
    param("idOrSlug")
        .notEmpty()
        .withMessage("Post ID or slug is required"),
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
        .isIn(["published_at", "created_at", "title"])
        .withMessage("SortBy must be one of: published_at, created_at, title"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("post_type")
        .optional()
        .isIn(["blog", "news", "announcement"])
        .withMessage("Invalid post type"),
    query("is_featured")
        .optional()
        .isIn(["true", "false"])
        .withMessage("is_featured must be true or false"),
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
            if (!value.every((item) => ["status", "is_featured"].includes(item))) {
                throw new Error("Toggle must contain only 'status' or 'is_featured'");
            }
            return true;
        }),
];

const validateType = [
    query("post_type")
        .notEmpty()
        .withMessage("Post type is required")
        .isIn(["blog", "news", "announcement"])
        .withMessage("Invalid post type"),
];

const validateStatus = [
    query("status")
        .notEmpty()
        .withMessage("Status is required")
        .isIn(["draft", "published", "archived"])
        .withMessage("Invalid status"),
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
    setUploadEntity("posts"),
    uploadAny("posts"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createPost,
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
    attachUserIfPresent,
    validateSearch,
    handleValidationErrors,
    searchPosts
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getPostStatistics
);

router.get(
    "/type",
    moderateLimiter,
    attachUserIfPresent,
    validateType,
    handleValidationErrors,
    getPostByType
);

router.get(
    "/status",
    moderateLimiter,
    attachUserIfPresent,
    validateStatus,
    handleValidationErrors,
    getPostByStatus
);

router.get(
    "/published",
    moderateLimiter,
    attachUserIfPresent,
    validateSearch,
    handleValidationErrors,
    getAllPublishedPosts
);

router.get(
    "/:idOrSlug",
    moderateLimiter,
    attachUserIfPresent,
    validateIdOrSlug,
    handleValidationErrors,
    getPostByIdOrSlug
);


router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateSearch,
    handleValidationErrors,
    getAllPosts
);

router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("posts"),
    uploadAny("posts"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updatePost,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deletePost
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    togglePostStatus
);
router.patch(
    "/:id/toggle/featured",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    togglePostFeatured
);

export default router;