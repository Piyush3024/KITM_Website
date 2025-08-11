


import multer from "multer";
import path from "path";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { fileURLToPath } from "url";

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define entity configurations
const ENTITY_CONFIGS = {
    programs: {
        fields: {
            featured_image: 'featured_images',
            brochure_file: 'brochures',
            files: 'files'
        },
        defaultSubfolder: 'files'
    },
    notices: {
        fields: {
            attachment: 'attachments',
            files: 'files'
        },
        defaultSubfolder: 'attachments'
    },
    galleries: {
        fields: {
            image: 'images',
            thumbnail: 'thumbnails',
            files: 'files'
        },
        defaultSubfolder: 'images'
    },
    media: {
        fields: {
            file: 'files',
            thumbnail: 'thumbnails',
            cover: 'covers'
        },
        defaultSubfolder: 'files'
    },
    faculty: {
        fields: {
            profile_image: 'profile_images',
            cv: 'cvs',
            files: 'files'
        },
        defaultSubfolder: 'files'
    },
    events: {
        fields: {
            featured_image: 'featured_images',
            files: 'files'
        },
        defaultSubfolder: 'featured_images'
    },
    posts: {
        fields: {
            featured_image: 'featured_images'
        },
        defaultSubfolder: 'featured_images'
    },
     testimonials: {
        fields: {
            student_image: 'images',
            video_file: 'videos',
            files: 'files'
        },
        defaultSubfolder: 'images'
    },
    pages: {
    fields: {
        featured_image: 'featured_images'
    },
    defaultSubfolder: 'featured_images'
}
   
};

// Create upload directories dynamically
const createUploadDirs = () => {
    const baseUploadDir = 'uploads';
    
    // Create base uploads directory
    if (!fs.existsSync(baseUploadDir)) {
        fs.mkdirSync(baseUploadDir, { recursive: true });
        console.log(`Created directory: ${baseUploadDir}`);
    }
    
    // Create entity-specific directories
    Object.keys(ENTITY_CONFIGS).forEach(entity => {
        const entityConfig = ENTITY_CONFIGS[entity];
        const entityPath = path.join(baseUploadDir, entity);
        
        // Create entity base directory
        if (!fs.existsSync(entityPath)) {
            fs.mkdirSync(entityPath, { recursive: true });
            console.log(`Created directory: ${entityPath}`);
        }
        
        // Create field-specific subdirectories
        Object.values(entityConfig.fields).forEach(subfolder => {
            const subfolderPath = path.join(entityPath, subfolder);
            if (!fs.existsSync(subfolderPath)) {
                fs.mkdirSync(subfolderPath, { recursive: true });
                console.log(`Created directory: ${subfolderPath}`);
            }
        });
    });
    
    // Create fallback directories
    const fallbackDirs = ['documents', 'images'];
    fallbackDirs.forEach(dir => {
        const fullPath = path.join(baseUploadDir, dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`Created directory: ${fullPath}`);
        }
    });
};

// Initialize upload directories
createUploadDirs();

// Generate unique filename
const generateFileName = (file) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    return `${timestamp}-${random}${extension}`;
};

// Dynamic storage configuration
const createDynamicStorage = (entity = null) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            let uploadPath = 'uploads/';
            
            // Use entity from middleware parameter or fallback to request
            const targetEntity = entity || req.uploadEntity;
            
            if (targetEntity && ENTITY_CONFIGS[targetEntity]) {
                const entityConfig = ENTITY_CONFIGS[targetEntity];
                uploadPath += `${targetEntity}/`;
                
                // Get subfolder based on field name
                const subfolder = entityConfig.fields[file.fieldname] || entityConfig.defaultSubfolder;
                uploadPath += `${subfolder}/`;
            } else {
                // Fallback to original logic for unknown entities
                switch (file.fieldname) {
                    case 'featured_image':
                    case 'profile_image':
                    case 'image':
                    case 'thumbnail':
                    case 'cover':
                        uploadPath += file.mimetype.startsWith('image/') ? 'images/' : 'documents/';
                        break;
                    case 'brochure_file':
                    case 'cv':
                    case 'attachment':
                    case 'file':
                    case 'files':
                    default:
                        uploadPath += file.mimetype.startsWith('image/') ? 'images/' : 'documents/';
                        break;
                }
            }
            
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const fileName = generateFileName(file);
            cb(null, fileName);
        }
    });
};

// File filter - check by mimetype
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/avi",
        "video/mov",
        "video/webm"
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF, DOCX, PPT, PPTX, PNG, JPG, GIF, WEBP, MP4, AVI, MOV, WEBM  files are allowed"), false);
    }
};

// Create multer configuration with dynamic storage
const createMulterConfig = (entity = null) => ({
    storage: createDynamicStorage(entity),
    fileFilter,
    limits: { fileSize: 25 * 1024 * 1024, files: 10 }, // 25MB/file, max 10 files
});

// Enhanced upload middleware functions with entity support
export const uploadAny = (entity = null) => {
    return multer(createMulterConfig(entity)).any();
};

export const uploadSingle = (fieldName, entity = null) => {
    return multer(createMulterConfig(entity)).single(fieldName);
};

export const uploadArray = (fieldName, maxCount = 5, entity = null) => {
    return multer(createMulterConfig(entity)).array(fieldName, maxCount);
};

export const uploadFields = (fields, entity = null) => {
    return multer(createMulterConfig(entity)).fields(fields);
};

// Entity-specific upload middleware
export const uploadProgram = multer(createMulterConfig('programs')).fields([
    { name: 'featured_image', maxCount: 1 },
    { name: 'brochure_file', maxCount: 1 },
    { name: 'files', maxCount: 5 }
]);

export const uploadNotice = multer(createMulterConfig('notices')).fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'files', maxCount: 3 }
]);

export const uploadGallery = multer(createMulterConfig('galleries')).fields([
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'files', maxCount: 10 }
]);

export const uploadMedia = multer(createMulterConfig('media')).fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
]);

export const uploadFaculty = multer(createMulterConfig('faculty')).fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'cv', maxCount: 1 },
    { name: 'files', maxCount: 3 }
]);

export const uploadTestimonial = multer(createMulterConfig('testimonials')).fields([
    { name: 'student_image', maxCount: 1 },
    { name: 'video_file', maxCount: 1 },
    { name: 'files', maxCount: 5 }
]);


// Legacy support - keeping the original upload (without entity specification)
export const upload = uploadAny();

// Utility function to add entity to request for dynamic routing
export const setUploadEntity = (entity) => {
    return (req, res, next) => {
        req.uploadEntity = entity;
        next();
    };
};

// File URL generator helper
export const generateFileUrl = (req, filePath) => {
    if (!filePath) return null;
    const protocol = req.protocol;
    const host = req.get('host');
    // Normalize path separators for URL
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `${protocol}://${host}/${normalizedPath}`;
};

// File handling utility for local storage
export const handleLocalFileUploads = (req) => {
    const uploadedFiles = {};
    
    if (!req.files || Object.keys(req.files).length === 0) {
        return uploadedFiles;
    }

    // Handle both array format and object format
    const fileEntries = Array.isArray(req.files) 
        ? req.files.map(file => [file.fieldname, [file]])
        : Object.entries(req.files);

    for (const [fieldName, fileArray] of fileEntries) {
        if (fileArray && fileArray.length > 0) {
            if (fileArray.length === 1) {
                // Single file upload - return relative path
                uploadedFiles[fieldName] = fileArray[0].path;
            } else {
                // Multiple files upload - return array of relative paths
                uploadedFiles[fieldName] = fileArray.map(file => file.path);
            }
        }
    }
    
    return uploadedFiles;
};

// File deletion utility
export const deleteFile = (filePath) => {
    if (!filePath) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        const fullPath = path.join(process.cwd(), filePath);
        
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (err) {
                // File doesn't exist, consider it successful
                console.log(`File doesn't exist: ${fullPath}`);
                return resolve();
            }
            
            fs.unlink(fullPath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(`Error deleting file: ${fullPath}`, unlinkErr);
                    reject(unlinkErr);
                } else {
                    console.log(`File deleted successfully: ${fullPath}`);
                    resolve();
                }
            });
        });
    });
};

// Delete multiple files utility
export const deleteFiles = async (filePaths) => {
    if (!filePaths || filePaths.length === 0) return;
    
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    
    try {
        await Promise.all(paths.map(path => deleteFile(path)));
    } catch (error) {
        console.error('Error deleting files:', error);
    }
};

// Enhanced file validation middleware with buffer check for uploaded files
export const validateFileTypes = async (req, res, next) => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0) || 
        (!Array.isArray(req.files) && Object.keys(req.files).length === 0)) {
        return next();
    }

    try {
        // Handle both array format (from .array() or .any()) and object format (from .fields())
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        
        for (const file of files) {
            // Read file buffer for validation (since we're using disk storage, we need to read the file)
            let fileBuffer;
            try {
                fileBuffer = fs.readFileSync(file.path);
            } catch (readError) {
                console.error('Error reading uploaded file:', readError);
                return res.status(400).json({
                    success: false,
                    message: `Error reading uploaded file: ${file.originalname}`
                });
            }

            const fileType = await fileTypeFromBuffer(fileBuffer);
            
            // Debug logging
            console.log(`File validation for ${file.originalname}:`);
            console.log(`- Original MIME type: ${file.mimetype}`);
            console.log(`- Detected MIME type: ${fileType ? fileType.mime : 'null'}`);
            console.log(`- File extension: ${fileType ? fileType.ext : 'unknown'}`);

            const allowedMimes = [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "image/png",
                "image/jpeg", // This is what fileTypeFromBuffer returns for JPG files
                "image/gif",
                "image/webp",
                "video/mp4",
                "video/avi",
                "video/quicktime", // For MOV files
                "video/webm"
            ];

            // Check if detected file type matches allowed types
            if (!fileType || !allowedMimes.includes(fileType.mime)) {
                // Delete the invalid file
                await deleteFile(file.path);
                return res.status(400).json({
                    success: false,
                    message: `Invalid file type for ${file.originalname}. Only PDF, DOCX, PPT, PPTX, PNG, JPG, GIF, WEBP, MP4, AVI, MOV, WEBM files are allowed.`
                });
            }

            // Additional JPEG integrity check: ensure file contains EOI marker (0xFFD9)
            if (fileType.mime === 'image/jpeg') {
                let hasEOI = false;
                for (let i = 0; i < fileBuffer.length - 1; i++) {
                    if (fileBuffer[i] === 0xFF && fileBuffer[i + 1] === 0xD9) { hasEOI = true; break; }
                }
                if (!hasEOI) {
                    await deleteFile(file.path);
                    return res.status(400).json({
                        success: false,
                        message: `Invalid file type for ${file.originalname}.`
                    });
                }
            }

            // Additional security: Check if detected type matches the original mimetype
            // Handle both image/jpg and image/jpeg as they're equivalent
            const isValidMimeMatch = fileType.mime === file.mimetype ||
                (file.mimetype === "image/jpg" && fileType.mime === "image/jpeg") ||
                (file.mimetype === "image/jpeg" && fileType.mime === "image/jpeg") || 
                 (file.mimetype === "video/mov" && fileType.mime === "video/quicktime");
                
            if (!isValidMimeMatch) {
                // Delete the suspicious file
                await deleteFile(file.path);
                return res.status(400).json({
                    success: false,
                    message: `File type mismatch detected for ${file.originalname}. Please upload a valid file.`
                });
            }
        }
        next();
    } catch (error) {
        console.error("File validation error:", error);
        
        // Clean up uploaded files on validation error
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            await Promise.all(files.map(file => deleteFile(file.path)));
        }
        
        return res.status(400).json({
            success: false,
            message: "Error validating uploaded files"
        });
    }
};

// Middleware to organize files by field name for easier access
export const organizeFiles = (req, res, next) => {
    if (req.files && Array.isArray(req.files)) {
        // Convert array format to object format for consistency
        const organizedFiles = {};
        req.files.forEach(file => {
            if (!organizedFiles[file.fieldname]) {
                organizedFiles[file.fieldname] = [];
            }
            organizedFiles[file.fieldname].push(file);
        });
        req.files = organizedFiles;
    }
    next();
};

// Cleanup middleware for handling upload errors
export const cleanupOnError = (err, req, res, next) => {
    if (err && req.files) {
        // Delete uploaded files if there was an error
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        files.forEach(file => {
            deleteFile(file.path).catch(console.error);
        });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Upload error' });
    }
    next();
};

// Utility function to get entity configuration
export const getEntityConfig = (entity) => {
    return ENTITY_CONFIGS[entity] || null;
};

// Function to add new entity configuration dynamically
export const addEntityConfig = (entityName, config) => {
    ENTITY_CONFIGS[entityName] = config;
    
    // Create directories for the new entity
    const baseUploadDir = 'uploads';
    const entityPath = path.join(baseUploadDir, entityName);
    
    if (!fs.existsSync(entityPath)) {
        fs.mkdirSync(entityPath, { recursive: true });
        console.log(`Created directory: ${entityPath}`);
    }
    
    // Create field-specific subdirectories
    Object.values(config.fields).forEach(subfolder => {
        const subfolderPath = path.join(entityPath, subfolder);
        if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true });
            console.log(`Created directory: ${subfolderPath}`);
        }
    });
};