import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    uploadMedia,
    getMediaById,
    getAllMedia,
    getMediaByType,
    updateMedia,
    deleteMedia,
    searchMedia,
    getMediaStats,
    getMyMedia,
    bulkDeleteMedia
} from "../controllers/media.controller.js";
import { protectRoute, authRateLimit, checkAdmin, attachUserIfPresent } from "../middleware/auth.middleware.js";
import { uploadArray, validateFileTypes, organizeFiles, cleanupOnError, setUploadEntity } from "../middleware/multer.middleware.js";

const router = express.Router();

router.use(authRateLimit);

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Allow more uploads than other operations
    message: {
        success: false,
        message: "Too many upload attempts. Please try again later.",
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
            message: "Too many upload attempts. Please try again later.",
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(15 * 60),
        });
    }
});

const moderateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Higher limit for media browsing
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

const deleteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // More restrictive for delete operations
    message: {
        success: false,
        message: "Too many delete attempts. Please try again later.",
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
        console.warn(`Delete rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            message: "Too many delete attempts. Please try again later.",
            timestamp: new Date().toISOString(),
            retryAfter: Math.ceil(15 * 60),
        });
    }
});

// ============================= VALIDATION RULES =============================

const validateUpload = [
    body("alt_text")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Alt text must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()_-]*$/)
        .withMessage("Alt text contains invalid characters"),
    body("caption")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Caption must be at most 65535 characters"),
];

const validateUpdate = [
    body("alt_text")
        .optional()
        .isLength({ max: 255 })
        .withMessage("Alt text must be at most 255 characters")
        .matches(/^[a-zA-Z0-9\s\u0900-\u097F,.()_-]*$/)
        .withMessage("Alt text contains invalid characters"),
    body("caption")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Caption must be at most 65535 characters"),
];

const validateId = [
    param("id")
        .notEmpty()
        .withMessage("Media ID is required"),
];

const validateType = [
    param("type")
        .notEmpty()
        .withMessage("File type is required")
        .isIn(["image", "video", "audio", "document", "other"])
        .withMessage("File type must be one of: image, video, audio, document, other"),
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
        .isIn(["created_at", "original_name", "file_size", "file_type"])
        .withMessage("SortBy must be one of: created_at, original_name, file_size, file_type"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("file_type")
        .optional()
        .isIn(["image", "video", "audio", "document", "other"])
        .withMessage("File type must be one of: image, video, audio, document, other"),
    query("uploaded_by")
        .optional()
        .notEmpty()
        .withMessage("Uploaded by ID cannot be empty if provided"),
];

const validateBulkDelete = [
    body("media_ids")
        .notEmpty()
        .withMessage("Media IDs are required")
        .custom((value) => {
            // Handle both string and array formats
            const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
            if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
                throw new Error("Media IDs must be a non-empty array");
            }
            if (parsedValue.length > 50) {
                throw new Error("Cannot delete more than 50 media files at once");
            }
            return true;
        }),
];

const handleValidationErrors = (req, res, next) => {
      console.log("Hello upload media")
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



// Upload media files (multiple files allowed)
router.post(
    "/",
    strictLimiter,
    protectRoute,
    setUploadEntity("media"),
    uploadArray("file", 10, "media"), // Allow up to 10 files
    organizeFiles,
    validateFileTypes,
    validateUpload,
    handleValidationErrors,
    uploadMedia,
    cleanupOnError
);

// Bulk delete media files
router.post(
    "/bulk-delete",
    deleteLimiter,
    protectRoute,
    validateBulkDelete,
    handleValidationErrors,
    bulkDeleteMedia
);

// Search media files
router.get(
    "/search",
    moderateLimiter,
    protectRoute,
    validateSearch,
    handleValidationErrors,
    searchMedia
);

// Get media statistics
router.get(
    "/stats",
    moderateLimiter,
    protectRoute,
    getMediaStats
);

// Get my uploaded media files
router.get(
    "/my",
    moderateLimiter,
    protectRoute,
    validateSearch,
    handleValidationErrors,
    getMyMedia
);

// Get media files by type
router.get(
    "/type/:type",
    moderateLimiter,
    protectRoute,
    validateType,
    validateSearch,
    handleValidationErrors,
    getMediaByType
);

// Get media by ID
router.get(
    "/:id",
    moderateLimiter,
    protectRoute,
    validateId,
    handleValidationErrors,
    getMediaById
);

// Get all media files (admin/authenticated users only)
router.get(
    "/",
    moderateLimiter,
    protectRoute,
    validateSearch,
    handleValidationErrors,
    getAllMedia
);

// Update media metadata
router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateMedia
);

// Delete single media file
router.delete(
    "/:id",
    deleteLimiter,
    protectRoute,
    validateId,
    handleValidationErrors,
    deleteMedia
);

export default router;