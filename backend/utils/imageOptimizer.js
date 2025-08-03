import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Image Optimization Utility
 * Converts uploaded images to WebP format with compression
 */

class ImageOptimizer {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
        this.outputFormat = 'webp';
        this.quality = 80; // WebP quality (0-100)
        this.maxWidth = 1920; // Maximum width for resizing
        this.maxHeight = 1920; // Maximum height for resizing
    }

    /**
     * Check if file is a supported image format
     * @param {string} filename - Original filename
     * @returns {boolean} - True if supported
     */
    isSupportedFormat(filename) {
        const ext = path.extname(filename).toLowerCase().slice(1);
        return this.supportedFormats.includes(ext);
    }

    /**
     * Get file size in bytes
     * @param {string} filePath - Path to file
     * @returns {number} - File size in bytes
     */
    getFileSize(filePath) {
        try {
            const stats = fs.statSync(filePath);
            return stats.size;
        } catch (error) {
            console.error('Error getting file size:', error);
            return 0;
        }
    }

    /**
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate optimized filename
     * @param {string} originalFilename - Original filename
     * @returns {string} - Optimized filename with .webp extension
     */
    generateOptimizedFilename(originalFilename) {
        const nameWithoutExt = path.parse(originalFilename).name;
        return `${nameWithoutExt}.webp`;
    }

    /**
     * Optimize a single image
     * @param {string} inputPath - Path to input image
     * @param {string} outputPath - Path for output image
     * @returns {Promise<Object>} - Optimization result with stats
     */
    async optimizeImage(inputPath, outputPath) {
        try {
            const startTime = Date.now();
            const originalSize = this.getFileSize(inputPath);

            // Create Sharp instance
            let sharpInstance = sharp(inputPath);

            // Get image metadata
            const metadata = await sharpInstance.metadata();
            
            // Resize if image is too large
            if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
                sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // Convert to WebP with compression
            await sharpInstance
                .webp({ 
                    quality: this.quality,
                    effort: 6, // Higher effort = better compression but slower
                    nearLossless: false,
                    smartSubsample: true
                })
                .toFile(outputPath);

            const optimizedSize = this.getFileSize(outputPath);
            const compressionRatio = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
            const processingTime = Date.now() - startTime;

            return {
                success: true,
                originalSize,
                optimizedSize,
                compressionRatio: parseFloat(compressionRatio),
                processingTime,
                originalFormat: metadata.format,
                dimensions: {
                    width: metadata.width,
                    height: metadata.height
                },
                outputPath
            };

        } catch (error) {
            console.error('Image optimization error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Optimize multiple images
     * @param {Array} imageFiles - Array of multer file objects
     * @param {string} uploadDir - Directory where images are uploaded
     * @returns {Promise<Array>} - Array of optimization results
     */
    async optimizeMultipleImages(imageFiles, uploadDir) {
        const results = [];
        const optimizedFiles = [];

        for (const file of imageFiles) {
            if (!file) continue;

            const inputPath = path.join(uploadDir, file.filename);
            const optimizedFilename = this.generateOptimizedFilename(file.filename);
            const outputPath = path.join(uploadDir, optimizedFilename);

            // Check if file exists
            if (!fs.existsSync(inputPath)) {
                console.warn(`File not found: ${inputPath}`);
                continue;
            }

            // Check if it's a supported format
            if (!this.isSupportedFormat(file.originalname)) {
                console.warn(`Unsupported format: ${file.originalname}`);
                // Copy original file as-is
                optimizedFiles.push({
                    ...file,
                    filename: file.filename,
                    originalSize: this.getFileSize(inputPath),
                    optimizedSize: this.getFileSize(inputPath),
                    compressionRatio: 0
                });
                continue;
            }

            // Optimize the image
            const result = await this.optimizeImage(inputPath, outputPath);

            if (result.success) {
                // Delete original file
                try {
                    fs.unlinkSync(inputPath);
                } catch (error) {
                    console.error('Error deleting original file:', error);
                }

                // Update file object with optimized data
                const optimizedFile = {
                    ...file,
                    filename: optimizedFilename,
                    originalSize: result.originalSize,
                    optimizedSize: result.optimizedSize,
                    compressionRatio: result.compressionRatio,
                    processingTime: result.processingTime,
                    originalFormat: result.originalFormat,
                    dimensions: result.dimensions
                };

                optimizedFiles.push(optimizedFile);
                results.push({
                    originalName: file.originalname,
                    optimizedName: optimizedFilename,
                    ...result
                });

                console.log(`✅ Optimized: ${file.originalname} -> ${optimizedFilename}`);
                console.log(`   Size: ${this.formatFileSize(result.originalSize)} -> ${this.formatFileSize(result.optimizedSize)}`);
                console.log(`   Compression: ${result.compressionRatio}%`);
                console.log(`   Time: ${result.processingTime}ms`);

            } else {
                console.error(`❌ Failed to optimize: ${file.originalname}`, result.error);
                // Keep original file if optimization fails
                optimizedFiles.push({
                    ...file,
                    originalSize: this.getFileSize(inputPath),
                    optimizedSize: this.getFileSize(inputPath),
                    compressionRatio: 0
                });
            }
        }

        return {
            optimizedFiles,
            results
        };
    }

    /**
     * Get optimization statistics
     * @param {Array} results - Array of optimization results
     * @returns {Object} - Summary statistics
     */
    getOptimizationStats(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0);
        const totalOptimizedSize = successful.reduce((sum, r) => sum + r.optimizedSize, 0);
        const totalProcessingTime = successful.reduce((sum, r) => sum + r.processingTime, 0);
        const avgCompressionRatio = successful.length > 0 
            ? successful.reduce((sum, r) => sum + r.compressionRatio, 0) / successful.length 
            : 0;

        return {
            totalFiles: results.length,
            successful: successful.length,
            failed: failed.length,
            totalOriginalSize,
            totalOptimizedSize,
            totalSizeReduction: totalOriginalSize - totalOptimizedSize,
            avgCompressionRatio: parseFloat(avgCompressionRatio.toFixed(2)),
            avgProcessingTime: successful.length > 0 ? totalProcessingTime / successful.length : 0,
            totalProcessingTime
        };
    }
}

export default new ImageOptimizer(); 