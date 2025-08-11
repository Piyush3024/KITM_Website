import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
  createApplication,
  getApplicationById,
  getAllApplications,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
  getApplicationStatistics,
  bulkUpdateApplications,
} from "../controllers/application.controller.js";
import { protectRoute, authRateLimit, checkRole } from "../middleware/auth.middleware.js";
import { 
  uploadFields, 
  validateFileTypes, 
  organizeFiles, 
  cleanupOnError,
  setUploadEntity 
} from "../middleware/multer.middleware.js";

const router = express.Router();

// Rate limiters
const publicApplicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit to 5 application submissions per hour per IP
  message: {
    success: false,
    message: "Too many application submissions. Please try again later.",
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Application rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many application submissions. Please try again later.",
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(60 * 60),
    });
  },
});

const moderateAdminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    timestamp: new Date().toISOString(),
  },
});

// Validation middleware for creating applications
const validateCreateApplication = [
  // Personal Information
  body("full_name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
    .withMessage("Full name can only contain letters and spaces"),
  
  body("date_of_birth")
    .isISO8601()
    .withMessage("Please provide a valid date of birth")
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 16 || age > 60) {
        throw new Error("Age must be between 16 and 60 years");
      }
      return true;
    }),
  
  body("gender")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  
  body("nationality")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Nationality must be at most 50 characters"),
  
  body("religion")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Religion must be at most 50 characters"),
  
  body("blood_group")
    .optional()
    .isLength({ max: 5 })
    .withMessage("Blood group must be at most 5 characters"),
  
  body("marital_status")
    .optional()
    .isIn(["single", "married", "divorced", "widowed"])
    .withMessage("Invalid marital status"),
  
  // Contact Information
  body("phone")
    .isMobilePhone("ne-NP")
    .withMessage("Please provide a valid Nepali phone number")
    .isLength({ max: 20 })
    .withMessage("Phone number must be at most 20 characters"),
  
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Please provide a valid email address"),
  
  body("permanent_address")
    .notEmpty()
    .withMessage("Permanent address is required")
    .isLength({ max: 1000 })
    .withMessage("Permanent address must be at most 1000 characters"),
  
  body("temporary_address")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Temporary address must be at most 1000 characters"),
  
  // Family Information
  body("father_name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Father's name must be at most 100 characters"),
  
  body("father_phone")
    .optional()
    .isMobilePhone("ne-NP")
    .withMessage("Please provide a valid phone number for father"),
  
  body("mother_name")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Mother's name must be at most 100 characters"),
  
  body("mother_phone")
    .optional()
    .isMobilePhone("ne-NP")
    .withMessage("Please provide a valid phone number for mother"),
  
  // Program Information
  body("program_applied")
    .notEmpty()
    .withMessage("Program applied is required")
    .isLength({ max: 50 })
    .withMessage("Program applied must be at most 50 characters"),
  
  // Entrance Test Information (optional - filled by student)
  body("entrance_test_rollNumber")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Entrance test roll number must be at most 20 characters"),
  
  body("entrance_test_date")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid entrance test date"),
  
  body("entrance_test_score")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Entrance test score must be between 0 and 100"),
  
  // Education Records
  body("education_records")
    .optional()
    .isArray()
    .withMessage("Education records must be an array"),
  
  body("education_records.*.level")
    .optional()
    .isIn(["slc_see", "plus2_intermediate", "bachelor", "master", "phd", "diploma", "certificate"])
    .withMessage("Invalid education level"),
  
  body("education_records.*.board")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Board must be at most 100 characters"),
  
  body("education_records.*.institution")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Institution must be at most 200 characters"),
  
  body("education_records.*.year_completed")
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage("Year completed must be valid"),
  
  body("education_records.*.percentage")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Percentage must be between 0 and 100"),
  
  body("education_records.*.cgpa")
    .optional()
    .isFloat({ min: 0, max: 4 })
    .withMessage("CGPA must be between 0 and 4"),
  
  // Status
  body("status")
    .optional()
    .isIn(["draft", "submitted"])
    .withMessage("Status must be draft or submitted"),
  
  // Agreements
  body("declaration_agreed")
    .optional()
    .isBoolean()
    .withMessage("Declaration agreed must be boolean"),
  
  body("terms_agreed")
    .optional()
    .isBoolean()
    .withMessage("Terms agreed must be boolean"),
  
  // Custom validation for submitted applications
  body()
    .custom((value, { req }) => {
      if (req.body.status === "submitted") {
        if (!req.body.declaration_agreed || !req.body.terms_agreed) {
          throw new Error("Declaration and terms must be agreed for submission");
        }
      }
      return true;
    }),
];

// Validation for ID parameter
const validateId = [
  param("id")
    .notEmpty()
    .withMessage("Application ID is required"),
];

// Validation for status update
const validateStatusUpdate = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "draft", "submitted", "under_review", "document_verification", 
      "provisionally_selected", "enrollment_completed", "rejected", 
      "cancelled", "waitlisted"
    ])
    .withMessage("Invalid status"),
  
  body("reason")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Reason must be at most 1000 characters"),
  
  body("notes")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Notes must be at most 2000 characters"),
];

// Validation for application update
const validateUpdateApplication = [
  // Same validations as create but all optional
  body("full_name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  
  body("date_of_birth")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),
  
  body("gender")
    .optional()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be male, female, or other"),
  
  body("phone")
    .optional()
    .isMobilePhone("ne-NP")
    .withMessage("Please provide a valid Nepali phone number"),
  
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  body("program_applied")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Program applied must be between 1 and 50 characters"),
];

// Validation for query parameters
const validateQueryParams = [
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
    .isIn(["created_at", "updated_at", "status", "full_name", "application_number"])
    .withMessage("Invalid sort field"),
  
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be asc or desc"),
  
  query("status")
    .optional()
    .isIn([
      "draft", "submitted", "under_review", "document_verification", 
      "provisionally_selected", "enrollment_completed", "rejected", 
      "cancelled", "waitlisted"
    ])
    .withMessage("Invalid status filter"),
  
  query("program_applied")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Program filter must be at most 50 characters"),
  
  query("search")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Search query must be at most 200 characters"),
  
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be valid ISO 8601 date"),
  
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be valid ISO 8601 date"),
];

// Validation for bulk operations
const validateBulkOperations = [
  body("ids")
    .isArray({ min: 1 })
    .withMessage("Application IDs array is required"),
  
  body("ids.*")
    .notEmpty()
    .withMessage("Each ID must be provided"),
  
  body("action")
    .isIn(["updateStatus", "delete"])
    .withMessage("Action must be updateStatus or delete"),
  
  body("status")
    .if(body("action").equals("updateStatus"))
    .notEmpty()
    .withMessage("Status is required for updateStatus action")
    .isIn([
      "under_review", "document_verification", "provisionally_selected", 
      "enrollment_completed", "rejected", "cancelled", "waitlisted"
    ])
    .withMessage("Invalid status for bulk operation"),
  
  body("reason")
    .optional()
    .isLength({ max: 1000 })
    .withMessage("Reason must be at most 1000 characters"),
];

// Statistics validation
const validateStatsQuery = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be valid ISO 8601 date"),
  
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be valid ISO 8601 date"),
  
  query("program")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Program filter must be at most 50 characters"),
  
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

// Error handling middleware
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
      message: errors.array()[0].msg,
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

// Document upload configuration for applications
const applicationUploadFields = [
  { name: 'photo', maxCount: 1 },
  { name: 'citizenship', maxCount: 1 },
  { name: 'slc_certificate', maxCount: 1 },
  { name: 'plus2_certificate', maxCount: 1 },
  { name: 'plus2_transcript', maxCount: 1 },
  { name: 'bachelor_certificate', maxCount: 1 },
  { name: 'bachelor_transcript', maxCount: 1 },
  { name: 'character_certificate', maxCount: 1 },
  { name: 'migration_certificate', maxCount: 1 },
  { name: 'medical_certificate', maxCount: 1 },
  { name: 'other', maxCount: 3 }
];

// Routes

// Public route - Create application (with file upload support)
router.post(
  "/",
  publicApplicationLimiter,
  setUploadEntity('applications'),
  uploadFields(applicationUploadFields, 'applications'),
  organizeFiles,
  validateFileTypes,
  validateCreateApplication,
  handleValidationErrors,
  createApplication,
  cleanupOnError
);

// Admin/Author routes - All protected
router.use(protectRoute);
router.use(checkRole(["admin", "author"]));
router.use(moderateAdminLimiter);

// Get all applications with filtering and pagination
router.get(
  "/",
  validateQueryParams,
  handleValidationErrors,
  getAllApplications
);

// Get application statistics
router.get(
  "/stats",
  validateStatsQuery,
  handleValidationErrors,
  getApplicationStatistics
);

// Get specific application by ID
router.get(
  "/:id",
  validateId,
  handleValidationErrors,
  getApplicationById
);

// Update application status
router.patch(
  "/:id/status",
  validateId,
  validateStatusUpdate,
  handleValidationErrors,
  updateApplicationStatus
);

// Update application details
router.put(
  "/:id",
  validateId,
  validateUpdateApplication,
  handleValidationErrors,
  updateApplication
);

// Soft delete application
router.delete(
  "/:id",
  validateId,
  handleValidationErrors,
  deleteApplication
);

// Bulk operations on applications
router.post(
  "/bulk",
  validateBulkOperations,
  handleValidationErrors,
  bulkUpdateApplications
);

export default router;