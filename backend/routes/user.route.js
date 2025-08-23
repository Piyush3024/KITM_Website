// routes/user.routes.js
import express from "express";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import {
  getUsers,
  getUserById,
  updateUser,
  updateRole,
  getAllAdmins,
  getAllAuthors,
  deleteUser,
} from "../controllers/user.controller.js";
import { protectRoute, checkAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Rate limiters
const moderateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 20 : 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10 : 50,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    timestamp: new Date().toISOString()
  },
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      })),
    });
  }
  next();
};

const validateUpdateUser = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be 2-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email must be valid and under 254 characters'),
];

const validateUpdateRole = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'author'])
    .withMessage('Invalid role value'),
];

// Public routes
router.get("/", moderateLimiter, getUsers);


// Admin-only routes
router.put(
  "/:id/role",
  strictLimiter,
  protectRoute,
  checkAdmin,
  validateUpdateRole,
  handleValidationErrors,
  updateRole
);

router.put(
  "/:id",
  moderateLimiter,
  protectRoute,
  validateUpdateUser,
  handleValidationErrors,
  updateUser
);
// Special filtered user lists
router.get(
  "/admins",
  moderateLimiter,
  protectRoute,
  checkAdmin,
  getAllAdmins
);

router.get(
  "/authors",
  moderateLimiter,
  protectRoute,
  getAllAuthors
);

router.delete(
  "/:id",
  strictLimiter,
  protectRoute,
  checkAdmin,
  deleteUser
);

router.get("/:id", moderateLimiter, getUserById);


export default router;