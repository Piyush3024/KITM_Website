import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
  createProgram,
  getProgramByIdOrSlug,
  getAllPrograms,
  updatePrograms,
  deleteProgram,
  searchPrograms,
  getProgramStatistics,
  toggleProgramStatus,
  getAllActivePrograms
} from "../controllers/program.controller.js";
import { protectRoute, authRateLimit, checkRole, checkAdmin } from "../middleware/auth.middleware.js";
import {
  uploadProgram,
  validateFileTypes,
  organizeFiles,
  uploadAny,
  cleanupOnError
} from '../middleware/multer.middleware.js';

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
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
    .withMessage("Name can only contain letters and spaces"),
  body("code")
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Code must be between 2 and 20 characters")
    .matches(/^[A-Z0-9-]+$/i)
    .withMessage("Code can only contain letters, numbers, and hyphens"),
  body("slug")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Slug must be at most 100 characters")
    .matches(/^[a-z0-9-]+$/i)
    .withMessage("Slug can only contain letters, numbers, and hyphens"),
  body("short_description")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Short description must be at most 65535 characters"),
  body("full_description")
    .optional()
    .isLength({ max: 4294967295 })
    .withMessage("Full description must be at most 4294967295 characters"),
  body("duration")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Duration must be at most 50 characters"),
  body("degree_type")
    .optional()
    .isIn(["bachelor", "master", "diploma", "certificate"])
    .withMessage("Invalid degree type"),
  body("affiliated_university")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Affiliated university must be at most 100 characters"),
  body("total_seats")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total seats must be a non-negative integer"),
  body("eligibility_criteria")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Eligibility criteria must be at most 65535 characters"),
  body("career_prospects")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Career prospects must be at most 65535 characters"),
  body("featured_image")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Featured image URL must be at most 255 characters"),
  body("brochure_file")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Brochure file URL must be at most 255 characters"),
  body("tuition_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tuition fee must be a non-negative number"),
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
    .withMessage("Sort order must be an integer"),
];

const validateUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
    .withMessage("Name can only contain letters and spaces"),
  body("code")
    .optional()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage("Code must be between 2 and 20 characters")
    .matches(/^[A-Z0-9-]+$/i)
    .withMessage("Code can only contain letters, numbers, and hyphens"),
  body("slug")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Slug must be at most 100 characters")
    .matches(/^[a-z0-9-]+$/i)
    .withMessage("Slug can only contain letters, numbers, and hyphens"),
  body("short_description")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Short description must be at most 65535 characters"),
  body("full_description")
    .optional()
    .isLength({ max: 4294967295 })
    .withMessage("Full description must be at most 4294967295 characters"),
  body("duration")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Duration must be at most 50 characters"),
  body("degree_type")
    .optional()
    .isIn(["bachelor", "master", "diploma", "certificate"])
    .withMessage("Invalid degree type"),
  body("affiliated_university")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Affiliated university must be at most 100 characters"),
  body("total_seats")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total seats must be a non-negative integer"),
  body("eligibility_criteria")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Eligibility criteria must be at most 65535 characters"),
  body("career_prospects")
    .optional()
    .isLength({ max: 65535 })
    .withMessage("Career prospects must be at most 65535 characters"),
  body("featured_image")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Featured image URL must be at most 255 characters"),
  body("brochure_file")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Brochure file URL must be at most 255 characters"),
  body("tuition_fee")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Tuition fee must be a non-negative number"),
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
    .withMessage("Sort order must be an integer"),
];

const validateId = [
  param("id")
    .notEmpty()
    .withMessage("Program ID is required"),
];

const validateIdOrSlug = [
  param("idOrSlug")
    .notEmpty()
    .withMessage("Program ID or slug is required"),
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
    .isIn(["sort_order", "created_at", "name"])
    .withMessage("SortBy must be one of: sort_order, created_at, name"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("SortOrder must be either asc or desc"),
  query("degree_type")
    .optional()
    .isIn(["bachelor", "master", "diploma", "certificate"])
    .withMessage("Invalid degree type"),
  query("is_active")
    .optional()
    .isIn(["true", "false"])
    .withMessage("is_active must be true or false"),
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
  uploadProgram,
  organizeFiles,
  validateFileTypes,
  validateCreate,
  handleValidationErrors,
  createProgram,
  cleanupOnError
);

router.get(
  "/search",
  moderateLimiter,
  validateSearch,
  handleValidationErrors,
  searchPrograms
);

router.get(
  "/stats",
  protectRoute,
  checkRole(["admin", "author"]),
  validateStats,
  handleValidationErrors,
  getProgramStatistics
);

router.get(
  "/active",
  moderateLimiter,
  validateSearch,
  handleValidationErrors,
  getAllActivePrograms
);

router.get(
  "/:idOrSlug",
  moderateLimiter,
  validateIdOrSlug,
  handleValidationErrors,
  getProgramByIdOrSlug
);

router.get(
  "/",
  moderateLimiter,
   protectRoute,
    checkRole(["admin", "author"]),
  validateSearch,
  handleValidationErrors,
  getAllPrograms
);


router.put(
  "/:id",
  strictLimiter,
  protectRoute,
  checkAdmin,
  uploadProgram,
  organizeFiles,
  validateFileTypes,
  validateId,
  validateUpdate,
  handleValidationErrors,
  updatePrograms,
  cleanupOnError
);

router.delete(
  "/:id",
  strictLimiter,
  protectRoute,
  checkAdmin,
  validateId,
  handleValidationErrors,
  deleteProgram
);


router.patch(
  "/:id/toggle",
  strictLimiter,
  protectRoute,
  checkAdmin,
  validateId,
  validateToggle,
  handleValidationErrors,
  toggleProgramStatus
);

export default router;