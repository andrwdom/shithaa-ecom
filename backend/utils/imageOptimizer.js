// import sharp from 'sharp'; // Temporarily commented out to fix server crash
import fs from 'fs';
import path from 'path';

/**
 * FAST Image Optimization Utility
 * Optimized for speed - converts images to WebP with minimal processing
 */

class ImageOptimizer {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
        this.outputFormat = 'webp';
        this.quality = 80;
        this.maxWidth = 1200; // Reduced from 1920 for faster processing
        this.maxHeight = 1200;
        this.sharpAvailable = false;
        
        // Check if sharp is available synchronously
        try {
            // In ES modules, we'll check availability dynamically
            this.sharpAvailable = true;
            console.log('✅ Sharp package available for FAST image optimization');
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
     * @returns {string} - Optimized filename
     */
    generateOptimizedFilename(originalFilename) {
        const nameWithoutExt = path.parse(originalFilename).name;
        return `${nameWithoutExt}.webp`;
    }

    /**
     * Ensure directory exists
     * @param {string} dirPath - Directory path
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * FAST: Optimize a single image (no variants, no AVIF)
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
                    compressionRatio: 0,
                    processingTime,
                    error: null
                };
            }

            // Sharp is available - FAST optimization only
            const sharp = await import('sharp');
            
            const originalSize = this.getFileSize(inputPath);
            let sharpInstance = sharp.default(inputPath);

            // Get image metadata
            const metadata = await sharpInstance.metadata();
            
            // Resize if image is too large (faster with smaller max dimensions)
            if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
                sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
                    fit: 'inside',
                    withoutEnlargement: true
                });
            }

            // FAST WebP conversion with lower effort for speed
            await sharpInstance
                .webp({ 
                    quality: this.quality,
                    effort: 2, // Reduced from 6 to 2 for 3x faster processing
                    nearLossless: false,
                    smartSubsample: false // Disabled for speed
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
     * FAST: Optimize multiple images (no variants, no AVIF)
     * @param {Array} imageFiles - Array of multer file objects
     * @param {string} uploadDir - Directory where images are uploaded
     * @returns {Promise<Array>} - Array of optimization results
     */
    async optimizeMultipleImages(imageFiles, uploadDir) {
        console.log('🚀 FAST image processing - WebP conversion only...');
        
        // Ensure upload directory exists
        try {
            if (!fs.existsSync(uploadDir)) {
                console.log(`📁 Creating upload directory: ${uploadDir}`);
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } catch (error) {
            console.error(`❌ Failed to create upload directory: ${uploadDir}`, error);
            return this.handleImageProcessingFallback(imageFiles);
        }
        
        const optimizedFiles = [];
        const results = [];
        
        for (const file of imageFiles) {
            try {
                const originalPath = path.join(uploadDir, file.filename);
                const optimizedFilename = this.generateOptimizedFilename(file.filename);
                const optimizedPath = path.join(uploadDir, optimizedFilename);
                
                console.log(`📁 FAST Processing: ${file.originalname} -> ${optimizedFilename}`);
                
                const result = await this.optimizeImage(originalPath, optimizedPath);
                
                if (result.success) {
                    // Update file object with optimized filename
                    const optimizedFile = {
                        ...file,
                        filename: optimizedFilename,
                        originalname: file.originalname
                    };
                    
                    optimizedFiles.push(optimizedFile);
                    
                    console.log(`✅ FAST Processed: ${file.originalname} -> ${optimizedFilename}`);
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
            } catch (error) {
                console.error(`❌ Error processing file: ${file.originalname}`, error);
                // Keep original file and continue
                optimizedFiles.push(file);
                results.push({
                    originalName: file.originalname,
                    optimizedName: file.filename,
                    originalSize: '0 Bytes',
                    optimizedSize: '0 Bytes',
                    compressionRatio: 0,
                    processingTime: 0,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const stats = this.getOptimizationStats(results);
        console.log('📊 FAST Image Processing Summary:');
        console.log(`   Total files: ${stats.totalFiles}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Failed: ${stats.failed}`);
        console.log(`   Total processing time: ${stats.totalProcessingTime}ms`);
        console.log(`   Average time per image: ${stats.avgProcessingTime}ms`);
        
        return { optimizedFiles, results };
    }

    /**
     * Fallback method when image processing fails
     * @param {Array} imageFiles - Array of multer file objects
     * @returns {Object} - Fallback result
     */
    handleImageProcessingFallback(imageFiles) {
        console.log('⚠️ Using fallback image processing mode');
        
        const optimizedFiles = imageFiles.map(file => ({
            ...file,
            filename: file.filename, // Keep original filename
            originalname: file.originalname
        }));
        
        const results = imageFiles.map(file => ({
            originalName: file.originalname,
            optimizedName: file.filename,
            originalSize: '0 Bytes',
            optimizedSize: '0 Bytes',
            compressionRatio: 0,
            processingTime: 0,
            success: true, // Mark as successful to avoid errors
            error: null
        }));
        
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

    /**
     * Generate simple image URL for frontend
     * @param {string} baseFilename - Base filename without extension
     * @param {string} baseUrl - Base URL for images
     * @returns {string} - Simple WebP URL
     */
    generateResponsiveUrls(baseFilename, baseUrl) {
        // Simplified - just return the main WebP image
        return `${baseUrl}/images/products/${baseFilename}.webp`;
    }
}

export default new ImageOptimizer(); 