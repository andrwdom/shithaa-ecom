// import sharp from 'sharp'; // Temporarily commented out to fix server crash
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
        this.quality = 80;
        this.maxWidth = 1920;
        this.maxHeight = 1920;
        this.sharpAvailable = false;
        
        // Check if sharp is available synchronously
        try {
            require('sharp');
            this.sharpAvailable = true;
            console.log('✅ Sharp package available for image optimization');
        } catch (error) {
            console.log('⚠️ Sharp package not available - using fallback mode');
            this.sharpAvailable = false;
        }
    }

    /**
     * Check if file is a supported image format
     * @param {string} filename - Original filename
     * @returns {boolean} - True if supported
     */
    isSupportedFormat(filename) {
        const ext = path.extname(filename).toLowerCase().substring(1);
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
        const startTime = Date.now();
        
        try {
            if (!this.sharpAvailable) {
                // Fallback: copy original file
                console.log(`⚠️ Sharp not available - copying original file`);
                fs.copyFileSync(inputPath, outputPath);
                
                const originalSize = this.getFileSize(inputPath);
                const optimizedSize = this.getFileSize(outputPath);
                const processingTime = Date.now() - startTime;
                
                return {
                    success: true,
                    originalSize,
                    optimizedSize,
                    compressionRatio: 0, // No compression since we're just copying
                    processingTime,
                    error: null
                };
            }

            // Sharp is available - use it for optimization
            const sharp = await import('sharp');
            
            const originalSize = this.getFileSize(inputPath);
            let sharpInstance = sharp.default(inputPath);

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
                    effort: 6,
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
            console.error(`❌ Failed to process image: ${inputPath}`, error);
            return {
                success: false,
                originalSize: 0,
                optimizedSize: 0,
                compressionRatio: 0,
                processingTime: Date.now() - startTime,
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
        console.log('🔄 Starting image processing...');
        
        const optimizedFiles = [];
        const results = [];
        
        for (const file of imageFiles) {
            const originalPath = path.join(uploadDir, file.filename);
            const optimizedFilename = this.generateOptimizedFilename(file.filename);
            const optimizedPath = path.join(uploadDir, optimizedFilename);
            
            console.log(`📁 Processing: ${file.originalname} -> ${optimizedFilename}`);
            
            const result = await this.optimizeImage(originalPath, optimizedPath);
            
            if (result.success) {
                // Update file object with optimized filename
                const optimizedFile = {
                    ...file,
                    filename: optimizedFilename,
                    originalname: file.originalname
                };
                
                optimizedFiles.push(optimizedFile);
                
                console.log(`✅ Processed: ${file.originalname} -> ${optimizedFilename}`);
                console.log(`   Size: ${this.formatFileSize(result.originalSize)} -> ${this.formatFileSize(result.optimizedSize)}`);
                if (result.compressionRatio > 0) {
                    console.log(`   Compression: ${result.compressionRatio}%`);
                }
                console.log(`   Time: ${result.processingTime}ms`);
            } else {
                console.error(`❌ Failed to process: ${file.originalname}`, result.error);
                // Keep original file if processing fails
                optimizedFiles.push(file);
            }
            
            results.push({
                originalName: file.originalname,
                optimizedName: optimizedFilename,
                originalSize: this.formatFileSize(result.originalSize),
                optimizedSize: this.formatFileSize(result.optimizedSize),
                compressionRatio: result.compressionRatio,
                processingTime: result.processingTime,
                success: result.success,
                error: result.error
            });
        }
        
        const stats = this.getOptimizationStats(results);
        console.log('📊 Image Processing Summary:');
        console.log(`   Total files: ${stats.totalFiles}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Failed: ${stats.failed}`);
        console.log(`   Total processing time: ${stats.totalProcessingTime}ms`);
        
        return { optimizedFiles, results };
    }

    /**
     * Get optimization statistics
     * @param {Array} results - Array of optimization results
     * @returns {Object} - Summary statistics
     */
    getOptimizationStats(results) {
        const totalFiles = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = totalFiles - successful;
        const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
        
        return {
            totalFiles,
            successful,
            failed,
            totalProcessingTime,
            avgProcessingTime: totalFiles > 0 ? Math.round(totalProcessingTime / totalFiles) : 0
        };
    }
}

export default new ImageOptimizer(); 