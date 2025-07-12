import multer from "multer";
import path from "path";

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
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

export default upload;