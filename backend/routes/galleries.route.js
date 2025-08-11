import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createGallery,
    getGalleryById,
    getGalleryBySlug,
    getAllGalleries,
    getAllPublishedGalleries,
    updateGallery,
    deleteGallery,
    toggleGalleryStatus,
    searchGalleries,
    getFeaturedGalleries,
    addItemsToGallery,
    removeItemsFromGallery,
    updateItemsOrder,
    updateItemCaption,
    getGalleryItems
} from "../controllers/galleries.controller.js";
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
    max: 20,
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

// ============================= VALIDATION RULES =============================

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
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Description must be at most 65535 characters"),
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
        .isInt()
        .withMessage("sort_order must be an integer"),
    body("media_items")
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        throw new Error("media_items must be an array");
                    }
                    return true;
                } catch (e) {
                    throw new Error("media_items must be valid JSON array");
                }
            }
            if (value && !Array.isArray(value)) {
                throw new Error("media_items must be an array");
            }
            return true;
        }),
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
        .isLength({ max: 65535 })
        .withMessage("Description must be at most 65535 characters"),
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
        .isInt()
        .withMessage("sort_order must be an integer"),
    body("media_items")
        .optional()
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        throw new Error("media_items must be an array");
                    }
                    return true;
                } catch (e) {
                    throw new Error("media_items must be valid JSON array");
                }
            }
            if (value && !Array.isArray(value)) {
                throw new Error("media_items must be an array");
            }
            return true;
        }),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Gallery ID is required"),
];

const validateSlug = [
    param("slug")
        .notEmpty()
        .withMessage("Gallery slug is required"),
];

const validateItemId = [
    param("id")
        .notEmpty()
        .withMessage("Gallery ID is required"),
    param("itemId")
        .notEmpty()
        .withMessage("Item ID is required"),
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
        .isIn(["sort_order", "created_at", "title", "updated_at"])
        .withMessage("SortBy must be one of: sort_order, created_at, title, updated_at"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("is_active")
        .optional()
        .isBoolean()
        .withMessage("is_active must be a boolean"),
    query("is_featured")
        .optional()
        .isBoolean()
        .withMessage("is_featured must be a boolean"),
];

const validateAddItems = [
    body("media_items")
        .notEmpty()
        .withMessage("media_items is required")
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        throw new Error("media_items must be a non-empty array");
                    }
                    return true;
                } catch (e) {
                    throw new Error("media_items must be valid JSON array");
                }
            }
            if (!Array.isArray(value) || value.length === 0) {
                throw new Error("media_items must be a non-empty array");
            }
            return true;
        }),
];

const validateRemoveItems = [
    body("item_ids")
        .notEmpty()
        .withMessage("item_ids is required")
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        throw new Error("item_ids must be a non-empty array");
                    }
                    return true;
                } catch (e) {
                    throw new Error("item_ids must be valid JSON array");
                }
            }
            if (!Array.isArray(value) || value.length === 0) {
                throw new Error("item_ids must be a non-empty array");
            }
            return true;
        }),
];

const validateUpdateOrder = [
    body("items_order")
        .notEmpty()
        .withMessage("items_order is required")
        .custom((value) => {
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed) || parsed.length === 0) {
                        throw new Error("items_order must be a non-empty array");
                    }
                    // Validate each item has id and sort_order
                    for (const item of parsed) {
                        if (!item.id || typeof item.sort_order !== 'number') {
                            throw new Error("Each item must have id and sort_order");
                        }
                    }
                    return true;
                } catch (e) {
                    throw new Error("items_order must be valid JSON array with id and sort_order for each item");
                }
            }
            if (!Array.isArray(value) || value.length === 0) {
                throw new Error("items_order must be a non-empty array");
            }
            // Validate each item has id and sort_order
            for (const item of value) {
                if (!item.id || typeof item.sort_order !== 'number') {
                    throw new Error("Each item must have id and sort_order");
                }
            }
            return true;
        }),
];

const validateUpdateCaption = [
    body("caption")
        .optional()
        .isLength({ max: 500 })
        .withMessage("Caption must be at most 500 characters"),
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



// Core Gallery Routes
router.post(
    "/",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("galleries"),
    uploadSingle("cover_image", "galleries"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createGallery,
    cleanupOnError
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchGalleries
);

router.get(
    "/published",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllPublishedGalleries
);

router.get(
    "/featured",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getFeaturedGalleries
);

router.get(
    "/slug/:slug",
    moderateLimiter,
    validateSlug,
    handleValidationErrors,
    getGalleryBySlug
);

router.get(
    "/:id",
    moderateLimiter,
    validateId,
    handleValidationErrors,
    getGalleryById
);

router.get(
    "/",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    getAllGalleries
);

router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("galleries"),
    uploadSingle("cover_image", "galleries"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateGallery,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteGallery
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    toggleGalleryStatus
);

// Gallery Items Management Routes
router.get(
    "/:id/items",
    moderateLimiter,
    validateId,
    handleValidationErrors,
    getGalleryItems
);

router.post(
    "/:id/items",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateAddItems,
    handleValidationErrors,
    addItemsToGallery
);

router.delete(
    "/:id/items",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateRemoveItems,
    handleValidationErrors,
    removeItemsFromGallery
);

router.put(
    "/:id/items/order",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateUpdateOrder,
    handleValidationErrors,
    updateItemsOrder
);

router.patch(
    "/:id/items/:itemId/caption",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateItemId,
    validateUpdateCaption,
    handleValidationErrors,
    updateItemCaption
);

export default router;