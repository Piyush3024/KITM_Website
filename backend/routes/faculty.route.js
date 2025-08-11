import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
    createFaculty,
    getFacultyById,
    getAllFaculties,
    updateFaculty,
    deleteFaculty,
    searchFaculties,
    getFacultyStatistics,
    toggleFacultyStatus,
    getFacultyByDepartment,
    getFacultyByStatus,
    
} from "../controllers/faculty.controller.js";
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
    body("full_name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Full name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Full name can only contain letters, spaces, and basic punctuation"),
    body("designation")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Designation must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Designation can only contain letters, spaces, and basic punctuation"),
    body("department")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Department must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Department can only contain letters, spaces, and basic punctuation"),
    body("qualification")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Qualification must be at most 65535 characters"),
    body("specialization")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Specialization must be at most 65535 characters"),
    body("experience_years")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Experience years must be a non-negative integer"),
    body("bio")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Bio must be at most 65535 characters"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .isLength({ max: 100 })
        .withMessage("Email must be at most 100 characters"),
    body("phone")
        .optional()
        .isLength({ max: 20 })
        .withMessage("Phone must be at most 20 characters")
        .matches(/^[0-9+\-\s]+$/)
        .withMessage("Phone can only contain numbers, +, -, and spaces"),
    body("social_links")
        .optional()
        .custom((value) => {
            try {
                const links = JSON.parse(value);
                const allowedKeys = ["linkedin", "twitter", "facebook", "website"];
                if (typeof links !== "object" || !Object.keys(links).every((key) => allowedKeys.includes(key))) {
                    throw new Error("Social links must contain only: linkedin, twitter, facebook, website");
                }
                for (const url of Object.values(links)) {
                    if (!/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(url)) {
                        throw new Error("Invalid URL in social links");
                    }
                }
                return true;
            } catch {
                throw new Error("Invalid social links format");
            }
        }),
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
    body("full_name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Full name must be between 2 and 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Full name can only contain letters, spaces, and basic punctuation"),
    body("designation")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Designation must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Designation can only contain letters, spaces, and basic punctuation"),
    body("department")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Department must be at most 100 characters")
        .matches(/^[a-zA-Z\s\u0900-\u097F,.()-]+$/)
        .withMessage("Department can only contain letters, spaces, and basic punctuation"),
    body("qualification")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Qualification must be at most 65535 characters"),
    body("specialization")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Specialization must be at most 65535 characters"),
    body("experience_years")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Experience years must be a non-negative integer"),
    body("bio")
        .optional()
        .isLength({ max: 65535 })
        .withMessage("Bio must be at most 65535 characters"),
    body("email")
        .optional()
        .isEmail()
        .withMessage("Invalid email format")
        .isLength({ max: 100 })
        .withMessage("Email must be at most 100 characters"),
    body("phone")
        .optional()
        .isLength({ max: 20 })
        .withMessage("Phone must be at most 20 characters")
        .matches(/^[0-9+\-\s]+$/)
        .withMessage("Phone can only contain numbers, +, -, and spaces"),
    body("social_links")
        .optional()
        .custom((value) => {
            try {
                const links = JSON.parse(value);
                const allowedKeys = ["linkedin", "twitter", "facebook", "website"];
                if (typeof links !== "object" || !Object.keys(links).every((key) => allowedKeys.includes(key))) {
                    throw new Error("Social links must contain only: linkedin, twitter, facebook, website");
                }
                for (const url of Object.values(links)) {
                    if (!/^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/.test(url)) {
                        throw new Error("Invalid URL in social links");
                    }
                }
                return true;
            } catch {
                throw new Error("Invalid social links format");
            }
        }),
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
        .withMessage("Faculty ID is required"),
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
        .isIn(["created_at", "full_name", "sort_order"])
        .withMessage("SortBy must be one of: created_at, full_name, sort_order"),
    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder must be either asc or desc"),
    query("department")
        .optional()
        .isLength({ max: 100 })
        .withMessage("Department must be at most 100 characters"),
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
            if (!value.every((item) => ["is_active", "is_featured"].includes(item))) {
                throw new Error("Toggle must contain only 'is_active' or 'is_featured'");
            }
            return true;
        }),
];

const validateDepartment = [
    query("department")
        .notEmpty()
        .withMessage("Department is required")
        .isLength({ max: 100 })
        .withMessage("Department must be at most 100 characters"),
];

const validateStatus = [
    query("is_active")
        .notEmpty()
        .withMessage("Active status is required")
        .isIn(["true", "false"])
        .withMessage("is_active must be true or false"),
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
    setUploadEntity("faculty"),
    uploadSingle("profile_image", "faculty"),
    organizeFiles,
    validateFileTypes,
    validateCreate,
    handleValidationErrors,
    createFaculty,
    cleanupOnError
);

router.get(
    "/search",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    searchFaculties
);

router.get(
    "/stats",
    protectRoute,
    checkRole(["admin", "author"]),
    validateStats,
    handleValidationErrors,
    getFacultyStatistics
);

router.get(
    "/department",
    moderateLimiter,
    validateDepartment,
    handleValidationErrors,
    getFacultyByDepartment
);

router.get(
    "/status",
    moderateLimiter,
    validateStatus,
    handleValidationErrors,
    getFacultyByStatus
);

router.get(
    "/active",
    moderateLimiter,
    validateSearch,
    handleValidationErrors,
    async (req, res, next) => {
        req.query.is_active = "true";
        next();
    },
    getFacultyByStatus
);

router.get(
    "/:id",
    moderateLimiter,
    validateId,
    handleValidationErrors,
    getFacultyById
);

router.get(
    "/",
    moderateLimiter,
    protectRoute,
    checkRole(["admin", "author"]),
    validateSearch,
    handleValidationErrors,
    getAllFaculties
);


router.put(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    setUploadEntity("faculty"),
    uploadSingle("profile_image", "faculty"),
    organizeFiles,
    validateFileTypes,
    validateId,
    validateUpdate,
    handleValidationErrors,
    updateFaculty,
    cleanupOnError
);

router.delete(
    "/:id",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    handleValidationErrors,
    deleteFaculty
);

router.patch(
    "/:id/toggle",
    strictLimiter,
    protectRoute,
    checkAdmin,
    validateId,
    validateToggle,
    handleValidationErrors,
    toggleFacultyStatus
);

export default router;