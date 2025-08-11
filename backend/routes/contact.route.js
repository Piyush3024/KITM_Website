


import express from "express";
import rateLimit from "express-rate-limit";
import { body, param, query, validationResult } from "express-validator";
import {
  createContact,
  readContact,
  getAllContacts,
  getContactsByType,
  deleteInquiry,
  updateInquiryStatus,
  bulkDeleteInquiries,
  searchInquiries,
  getInquiryStatistics,
} from "../controllers/contact.controller.js";
import { protectRoute, authRateLimit, checkRole } from "../middleware/auth.middleware.js";

const router = express.Router();

// Rate limiters
router.use(authRateLimit);

const moderateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
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
  body("full_name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s\u0900-\u097F]+$/)
    .withMessage("Full name can only contain letters and spaces"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 100 })
    .withMessage("Please provide a valid email address"),
  body("phone")
    .optional()
    .isLength({ max: 20 })
    .withMessage("Phone number must be at most 20 characters")
    .matches(/^\+?[1-9]\d{1,19}$/)
    .withMessage("Please provide a valid phone number"),
  body("subject")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Subject must be at most 200 characters"),
  body("message")
    .notEmpty()
    .isLength({ max: 65535 })
    .withMessage("Message is required and must be at most 65535 characters"),
  body("inquiry_type")
    .optional()
    .isIn(["admission", "general", "complaint", "suggestion", "partnership", "technical"])
    .withMessage("Invalid inquiry type"),
];

const validateId = [
  param("id")
    .notEmpty()
    .withMessage("Inquiry ID is required"),
];

const validateType = [
  param("type")
    .notEmpty()
    .withMessage("Inquiry type is required")
    .isIn(["admission", "general", "complaint", "suggestion", "partnership", "technical"])
    .withMessage("Invalid inquiry type"),
];
const validateStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["new", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
];

const validateBulkDelete = [
  body("ids")
    .optional()
    .isArray()
    .withMessage("IDs must be an array")
    .custom((value) => {
      if (value && !value.every((id) => typeof id === "string")) {
        throw new Error("All IDs must be strings");
      }
      return true;
    }),
  body("status")
    .optional()
    .isIn(["new", "pending", "resolved", "closed"])
    .withMessage("Invalid status"),
  body("inquiry_type")
    .optional()
    .isIn(["admission", "general", "complaint", "suggestion", "partnership", "technical"])
    .withMessage("Invalid inquiry type"),
  body()
    .custom((value, { req }) => {
      if (!req.body.ids && !req.body.status && !req.body.inquiry_type) {
        throw new Error("At least one filter (ids, status, or inquiry_type) is required");
      }
      return true;
    }),
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
    .isIn(["created_at", "updated_at", "status"])
    .withMessage("SortBy must be one of: created_at, updated_at, status"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("SortOrder must be either asc or desc"),
  query("status")
    .optional()
    .isIn(["new", "in_progress", "resolved", "closed"])
    .withMessage("Invalid status"),
  query("inquiry_type")
    .optional()
    .isIn(["admission", "general", "complaint", "suggestion", "partnership", "technical"])
    .withMessage("Invalid inquiry type"),
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
    .isIn(["created_at", "updated_at", "status"])
    .withMessage("SortBy must be one of: created_at, updated_at, status"),
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("SortOrder must be either asc or desc"),
  query("status")
    .optional()
    .isIn(["new", "pending", "resolved", "closed"])
    .withMessage("Invalid status"),
  query("inquiry_type")
    .optional()
    .isIn(["admission", "general", "complaint", "suggestion", "partnership", "technical"])
    .withMessage("Invalid inquiry type"),
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

// Routes
router.post(
  "/",
  moderateLimiter,
  validateCreate,
  handleValidationErrors,
  createContact
);

router.get(
  "/search",
  protectRoute,
  checkRole(["admin", "author"]),
  validateSearch,
  handleValidationErrors,
  searchInquiries
);

router.get(
  "/stats",
  protectRoute,
  checkRole(["admin", "author"]),
  validateStats,
  handleValidationErrors,
  getInquiryStatistics
);

router.get(
  "/type/:type",
  protectRoute,
  checkRole(["admin", "author"]),
  validateType,
  validateQueryParams,
  handleValidationErrors,
  getContactsByType
);

router.get(
  "/:id",
  protectRoute,
  checkRole(["admin", "author"]),
  validateId,
  handleValidationErrors,
  readContact
);

router.get(
  "/",
  protectRoute,
  checkRole(["admin", "author"]),
  validateQueryParams,
  handleValidationErrors,
  getAllContacts
);

router.delete(
  "/:id",
  protectRoute,
  checkRole(["admin", "author"]),
  validateId,
  handleValidationErrors,
  deleteInquiry
);

router.patch(
  "/:id/status",
  protectRoute,
  checkRole(["admin", "author"]),
  validateId,
  validateStatus,
  handleValidationErrors,
  updateInquiryStatus
);

router.delete(
  "/",
  protectRoute,
  checkRole(["admin", "author"]),
  validateBulkDelete,
  handleValidationErrors,
  bulkDeleteInquiries
);





export default router;

