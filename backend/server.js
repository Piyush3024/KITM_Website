import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down'; 
import { PrismaClient } from '@prisma/client';


//api routes
import authRoutes from './routes/auth.route.js';
import contactRoutes from './routes/contact.route.js';
import programRoutes from './routes/program.route.js';
import noticeRoutes from './routes/notice.route.js';
import eventRoutes from "./routes/event.route.js";
import postRoutes from "./routes/post.route.js";
import pagesRoutes from "./routes/pages.route.js";
import facultyRoutes from "./routes/faculty.route.js";
import testimonialRoutes from "./routes/testimonial.route.js"
import galleriesRoutes from "./routes/galleries.route.js"
import mediaRoutes from "./routes/media.route.js"
import settingRoutes from "./routes/settings.route.js"
import partnerRoutes from "./routes/partners.route.js"
import applicationRoutes from "./routes/application.route.js"

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';


const setupLogging = () => {
  if (!IS_PRODUCTION) {
    // Development logging
    app.use(morgan('dev'));
  } else {
    // Production logging with more details
    app.use(morgan('combined', {
      skip: (req, res) => res.statusCode < 400 // Only log errors in production
    }));
  }
};

// Security middleware setup
const setupSecurity = () => {
  // Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: IS_PRODUCTION ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Enhanced CORS configuration
  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    process.env.ADMIN_URL || 'http://localhost:3001',
  ].filter(Boolean);

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'X-CSRF-Token',
      'X-API-Key'
    ],
    maxAge: 86400, // 24 hours
  }));

  app.options('*', cors());
};

// Enhanced rate limiting setup
const setupRateLimiting = () => {
  // Global rate limiter with IPv6 support
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PRODUCTION ? 100 : 1000, // More permissive in development
    message: { 
      success: false, 
      message: 'Too many requests from this IP, please try again later', 
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: 'Too many requests from this IP, please try again later',
        retryAfter: Math.round(15 * 60) // 15 minutes
      });
    }
  });

  // Speed limiter for additional protection
  const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests at full speed
    delayMs: 100 // Add 100ms delay per request after delayAfter
  });

  app.use(globalLimiter);
  app.use(speedLimiter);
};

// Body parsing and compression setup
const setupMiddleware = () => {
  // Compression middleware
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: IS_PRODUCTION ? 6 : 1
  }));

  // Body parsing
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({
          success: false,
          message: 'Invalid JSON format',
        });
        throw new Error('Invalid JSON');
      }
    }
  }));

  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 1000
  }));

  app.use(cookieParser(process.env.COOKIE_SECRET));

  // Trust proxy if behind reverse proxy (Nginx, etc.)
  if (IS_PRODUCTION) {
    app.set('trust proxy', 1);
  }
};

// Static files and uploads setup
const setupStaticFiles = async () => {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }

  // Serve static files with proper headers
  app.use('/uploads', 
    express.static(uploadsDir, {
      maxAge: IS_PRODUCTION ? '7d' : '0',
      etag: true,
      lastModified: true,
      setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
          res.set('Content-Type', 'application/pdf');
        }
      }
    })
  );
};

// API routes setup
const setupRoutes = () => {
  // Health check endpoint with more comprehensive info
  app.get('/api/health', (req, res) => {
    const healthCheck = {
      status: 'ok',
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      node_version: process.version,
      memory: process.memoryUsage(),
    };
    
    res.status(200).json(healthCheck);
  });
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'success',
      message: 'KITM backend API is running',
      environment: NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      documentation: process.env.API_DOCS_URL || '/api/docs'
    });
  });
  
  // API routes - wrapped in try-catch to catch route definition errors

    app.use('/api/auth', authRoutes);
    app.use('/api/contacts', contactRoutes);
    app.use('/api/programs', programRoutes);
    app.use('/api/notices', noticeRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/pages', pagesRoutes);
    app.use('/api/faculty', facultyRoutes);
    app.use('/api/testimonials', testimonialRoutes);
    app.use('/api/galleries', galleriesRoutes);
    app.use('/api/media', mediaRoutes);
    app.use('/api/settings', settingRoutes);
    app.use('/api/partners', partnerRoutes);
    app.use('/api/applications', applicationRoutes);

  
  
  // API not found handler (more specific than global 404)
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      path: req.originalUrl
    });
  });
};

// Enhanced error handling
const setupErrorHandling = () => {
  // Global error handler
  app.use((err, req, res, next) => {
    // Log error details
    console.error('Error occurred:', {
      message: err.message,
      stack: IS_PRODUCTION ? undefined : err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(err.errors).map(e => e.message)
      });
    }

    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry',
      });
    }

    // Default error response
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: IS_PRODUCTION ? 'Internal server error' : err.message,
      ...(IS_PRODUCTION ? {} : { stack: err.stack })
    });
  });

  // 404 handler for all other routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl
    });
  });
};

// Graceful shutdown handling
const setupGracefulShutdown = (server) => {
  const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Force shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in production, just log the error
    if (!IS_PRODUCTION) {
      process.exit(1);
    }
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
};

// Main server startup function
async function startServer() {
  try {
    console.log('Starting KITM backend server...');
    
    // Setup all middleware and configurations
    setupLogging();
    setupSecurity();
    setupRateLimiting();
    setupMiddleware();
    
    // Setup static files
    await setupStaticFiles();
    
    // Setup routes
    setupRoutes();
    
    // Setup error handling (must be last)
    setupErrorHandling();
    
    // Connect to database
    await prisma.$connect();
    console.log('Connected to database');
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`📝 API Documentation: ${process.env.API_DOCS_URL || 'Not configured'}`);
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();