import multer from "multer";
import path from "path";

// SECURITY: Secure file upload configuration with MIME type and size validation
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Use different folders for products and carousel
        if (req.baseUrl.includes('carousel')) {
            cb(null, "/var/www/shithaa-ecom/uploads/carousel/");
        } else {
            cb(null, "/var/www/shithaa-ecom/uploads/products/");
        }
    },
    filename: function (req, file, cb) {
        // SECURITY: Generate unique filename, ignore client-provided names
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// SECURITY: File type validation - only allow safe image formats
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
]);

const fileFilter = (req, file, cb) => {
    // SECURITY: Validate MIME type and reject unsafe files
    if (allowedMimeTypes.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed. Only JPEG, PNG, and WebP images are accepted.`), false);
    }
};

// SECURITY: Configure multer with security limits
const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 4 // Maximum 4 files per request
    }
});

export default upload;