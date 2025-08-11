import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createPage,
    getPageByIdOrSlug,
    getAllPages,
    updatePage,
    deletePage,
    searchPages,
    togglePageStatus,
    getAllPublishedPages
} from "../controllers/pages.controller.js";
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
    body("template_type")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Template type must be at most 50 characters"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("sort_order")
        .optional()
        .isInt()
        .withMessage("sort_order must be an integer"),
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
    body("template_type")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Template type must be at most 50 characters"),
    body("is_published")
        .optional()
        .isBoolean()
        .withMessage("is_published must be a boolean"),
    body("sort_order")
        .optional()
        .isInt()
        .withMessage("sort_order must be an integer"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Page ID is required"),
];

const validateIdOrSlug = [
    param("idOrSlug")
        .notEmpty()
        .withMessage("Page ID or slug is required"),
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
        .isIn(["sort_order", "created_at", "title"])
        .withMessage("SortBy must be one of: sort_order, created_at, title"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("template_type")
        .optional()
        .isLength({ max: 50 })
        .withMessage("Template type must be at most 50 characters"),
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

router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("pages"),
    uploadSingle("featured_image", "pages"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createPage,
    cleanupOnError
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchPages
);

router.get(
    "/published",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPublishedPages
);


router.get(
    "/:idOrSlug",
    moderateLimiter,
    validateIdOrSlug,
    handleValidationErrors,
    getPageByIdOrSlug
);

router.get(
    "/",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPages
);

router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("pages"),
    uploadSingle("featured_image", "pages"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updatePage,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deletePage
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    togglePageStatus
);

export default router;