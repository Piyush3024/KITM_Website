// import express from "express"
// import rateLimit from "express-rate-limit"
// import { body, validationResult } from "express-validator"
// import { login, register, logout, setPassword, forgotPassword, resetPassword } from "../controllers/auth.controller.js"
// import { protectRoute, authRateLimit, checkAdmin, requireTemporaryPassword } from "../middleware/auth.middleware.js"

// const router = express.Router()

// router.use(authRateLimit)

// const strictLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5,
//   message: {
//     success: false,
//     message: 'Too many attempts. Please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // Removed keyGenerator - uses default IPv6-safe implementation
//   handler: (req, res) => {
//     console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
//     res.status(429).json({
//       success: false,
//       message: 'Too many attempts. Please try again later.',
//       timestamp: new Date().toISOString(),
//       retryAfter: Math.ceil(15 * 60) // seconds
//     });
//   }
// });

// const moderateLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10,
//   message: {
//     success: false,
//     message: 'Too many requests. Please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   // Removed keyGenerator - uses default IPv6-safe implementation
//   handler: (req, res) => {
//     console.warn(`Moderate rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
//     res.status(429).json({
//       success: false,
//       message: 'Too many requests. Please try again later.',
//       timestamp: new Date().toISOString(),
//       retryAfter: Math.ceil(15 * 60)
//     });
//   }
// });


// const validateLogin = [
//   body()
//     .custom((value, { req }) => {
//       const { email, username } = req.body;
      

//       if (!email && !username) {
//         throw new Error('Either email or username is required');
//       }
      

//       if (email) {
//         if (typeof email !== 'string' || email.length > 254) {
//           throw new Error('Email must be a valid string with maximum 254 characters');
//         }

//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(email)) {
//           throw new Error('Please provide a valid email address');
//         }
//       }
      
      
//       if (username) {
//         if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
//           throw new Error('Username must be between 3 and 50 characters');
//         }
      
//         const usernameRegex = /^[a-zA-Z0-9_-]+$/;
//         if (!usernameRegex.test(username)) {
//           throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
//         }
//       }
      
//       return true;
//     }),
  
//   body('password')
//     .notEmpty()
//     .isLength({ max: 128 })
//     .withMessage("Password is required and must be maximum 128 characters")
// ]

// const validateForgot = [
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .isLength({ max: 254 }) // RFC 5321 limit
//     .withMessage('Please provide a valid email address'),
// ]

// const validateResetPassword = [
//   body('password')
//     .notEmpty()
//     .isLength({ max: 128 })
//     .withMessage("Password is required")
// ]

// const validateRegistration = [
//   body('email')
//     .isEmail()
//     .normalizeEmail()
//     .isLength({ max: 254 }) // RFC 5321 limit
//     .withMessage('Please provide a valid email address'),

//   body('username')
//     .trim()
//     .isLength({ min: 2, max: 50 })
//     .withMessage('Name must be between 2 and 50 characters')
//     .matches(/^[a-zA-Z\s\u0900-\u097F]+$/) // Allow English and Nepali characters
//     .withMessage('Name can only contain letters and spaces'),
// ]

// const handleValidationErrors = (req, res, next) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     // Log validation failures for security monitoring
//     console.warn(`Validation failed for ${req.method} ${req.path}:`, {
//       ip: req.ip,
//       errors: errors.array(),
//       body: req.body ? Object.keys(req.body) : 'no body'
//     });

//     return res.status(400).json({
//       success: false,
//       message: 'Validation failed',
//       errors: errors.array().map(error => ({
//         field: error.path || error.param,
//         message: error.msg,
//         value: error.value ? '[REDACTED]' : undefined // Don't leak sensitive data
//       })),
//       timestamp: new Date().toISOString()
//     });
//   }
//   next();
// };

// router.post("/login", strictLimiter, validateLogin, handleValidationErrors,  login)

// router.post('/register',
//   strictLimiter,
//   validateRegistration,
//   handleValidationErrors,
//   protectRoute,
//   checkAdmin,
//   register
// );

// router.post('/logout', 
//   protectRoute, 
//   logout
// );
// router.post('/reset',
//   strictLimiter,
//   moderateLimiter,
//   validateResetPassword, 
//   protectRoute,
//   requireTemporaryPassword, 
//   setPassword
// );

// router.post('/forgot',
//   strictLimiter,
//   moderateLimiter,
//   validateResetPassword, 
//   protectRoute,
//   forgotPassword
// );
// router.post('/reset-password/:token',
//   strictLimiter,
//   moderateLimiter,
//   validateResetPassword, 
//   resetPassword
// );


// export default router;


import express from "express"
import rateLimit from "express-rate-limit"
import { body, validationResult } from "express-validator"
import { login, register, logout, setPassword, forgotPassword, resetPassword } from "../controllers/auth.controller.js"
import { protectRoute, authRateLimit, checkAdmin, requireTemporaryPassword } from "../middleware/auth.middleware.js"

const router = express.Router()

// router.use(authRateLimit)

 const  strictLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second for tests, 15 minutes for production
  max: process.env.NODE_ENV === 'test' ? 10 : 50, // Lower limit for tests
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Removed keyGenerator - uses default IPv6-safe implementation
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many attempts. Please try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: process.env.NODE_ENV === 'test' ? 1 : Math.ceil(15 * 60) // seconds
    });
  }
});

const moderateLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second for tests, 15 minutes for production
  max: process.env.NODE_ENV === 'test' ? 20 : 100, // Lower limit for tests
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Removed keyGenerator - uses default IPv6-safe implementation
  handler: (req, res) => {
    console.warn(`Moderate rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: process.env.NODE_ENV === 'test' ? 1 : Math.ceil(15 * 60) // seconds
    });
  }
});


const validateLogin = [
  body()
    .custom((value, { req }) => {
      const { email, username } = req.body;
      

      if (!email && !username) {
        throw new Error('Either email or username is required');
      }
      

      if (email) {
        if (typeof email !== 'string' || email.length > 254) {
          throw new Error('Email must be a valid string with maximum 254 characters');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error('Please provide a valid email address');
        }
      }
      
      
      if (username) {
        if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
          throw new Error('Username must be between 3 and 50 characters');
        }
      
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
          throw new Error('Username can only contain letters, numbers, underscores, and hyphens');
        }
      }
      
      return true;
    }),
  
  body('password')
    .notEmpty()
    .isLength({ max: 128 })
    .withMessage("Password is required and must be maximum 128 characters")
]

const validateForgot = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 }) // RFC 5321 limit
    .withMessage('Please provide a valid email address'),
]

const validateResetPassword = [
  body('password')
    .notEmpty()
    .isLength({ max: 128 })
    .withMessage("Password is required")
]

const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 254 }) // RFC 5321 limit
    .withMessage('Please provide a valid email address'),

  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/) // Allow letters, numbers, hyphens, and underscores
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
]

const validateSetPassword = [
  body('newPassword') // ✅ Match controller field name
    .notEmpty()
    .isLength({ min: 1, max: 128 })
    .withMessage("New password is required")
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    console.warn(`Validation failed for ${req.method} ${req.path}:`, {
      ip: req.ip,
      errors: errors.array(),
      body: req.body ? Object.keys(req.body) : 'no body'
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value ? '[REDACTED]' : undefined // Don't leak sensitive data
      })),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

router.post("/login",
   strictLimiter,
   validateLogin,
    handleValidationErrors, 
     login)

router.post('/register',
  strictLimiter,
  validateRegistration,
  handleValidationErrors,
  protectRoute,
  checkAdmin,
  register
);

router.post('/logout', 
  protectRoute, 
  logout
);
router.post('/reset',
  strictLimiter,
  moderateLimiter,
  validateSetPassword, 
  protectRoute,
  requireTemporaryPassword, 
  setPassword
);

router.post('/forgot',
  strictLimiter,
  moderateLimiter,
  validateForgot, 
  forgotPassword
);
router.post('/reset-password/:token',
  strictLimiter,
  moderateLimiter,
  validateResetPassword, 
  resetPassword
);


export default router;