// import sharp from 'sharp'; // Temporarily commented out to fix server crash
import fs from 'fs';
import path from 'path';

/**
 * Image Optimization Utility
 * Converts uploaded images to WebP format with compression and generates multiple size variants
 */

class ImageOptimizer {
    constructor() {
        this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
        this.outputFormat = 'webp';
        this.quality = 80;
        this.maxWidth = 1920;
        this.maxHeight = 1920;
        this.sharpAvailable = false;
        
        // Size variants for responsive images
        this.sizeVariants = {
            thumbnail: { width: 200, height: 300, suffix: 'thumb' },
            small: { width: 300, height: 400, suffix: 'small' },
            medium: { width: 400, height: 600, suffix: 'medium' },
            large: { width: 800, height: 1200, suffix: 'large' }
        };
        
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
     * Generate optimized filename for a specific size variant
     * @param {string} originalFilename - Original filename
     * @param {string} suffix - Size variant suffix
     * @returns {string} - Optimized filename with size suffix
     */
    generateOptimizedFilename(originalFilename, suffix = '') {
        const nameWithoutExt = path.parse(originalFilename).name;
        const suffixPart = suffix ? `-${suffix}` : '';
        return `${nameWithoutExt}${suffixPart}.webp`;
    }

    /**
     * Generate AVIF filename for a specific size variant
     * @param {string} originalFilename - Original filename
     * @param {string} suffix - Size variant suffix
     * @returns {string} - AVIF filename with size suffix
     */
    generateAVIFFilename(originalFilename, suffix = '') {
        const nameWithoutExt = path.parse(originalFilename).name;
        const suffixPart = suffix ? `-${suffix}` : '';
        return `${nameWithoutExt}${suffixPart}.avif`;
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
     * Generate all size variants for an image
     * @param {string} inputPath - Path to input image
     * @param {string} outputDir - Directory for output images
     * @param {string} baseFilename - Base filename without extension
     * @returns {Promise<Object>} - Generation result with stats
     */
    async generateSizeVariants(inputPath, outputDir, baseFilename) {
        if (!this.sharpAvailable) {
            console.log('⚠️ Sharp not available - skipping size variant generation');
            return { success: false, variants: [], error: 'Sharp not available' };
        }

        try {
            const sharp = await import('sharp');
            const variants = [];
            const startTime = Date.now();

            // Generate each size variant
            for (const [sizeName, sizeConfig] of Object.entries(this.sizeVariants)) {
                const variantFilename = this.generateOptimizedFilename(baseFilename, sizeConfig.suffix);
                const variantPath = path.join(outputDir, variantFilename);
                const avifFilename = this.generateAVIFFilename(baseFilename, sizeConfig.suffix);
                const avifPath = path.join(outputDir, avifFilename);

                console.log(`🔄 Generating ${sizeName} variant: ${variantFilename}`);

                // Generate WebP variant
                await sharp.default(inputPath)
                    .resize(sizeConfig.width, sizeConfig.height, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp({ 
                        quality: this.quality,
                        effort: 6,
                        nearLossless: false,
                        smartSubsample: true
                    })
                    .toFile(variantPath);

                // Generate AVIF variant
                await sharp.default(inputPath)
                    .resize(sizeConfig.width, sizeConfig.height, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .avif({ 
                        quality: this.quality,
                        effort: 6,
                        chromaSubsampling: '4:2:0'
                    })
                    .toFile(avifPath);

                const webpSize = this.getFileSize(variantPath);
                const avifSize = this.getFileSize(avifPath);

                variants.push({
                    size: sizeName,
                    webp: {
                        filename: variantFilename,
                        path: variantPath,
                        size: webpSize,
                        dimensions: { width: sizeConfig.width, height: sizeConfig.height }
                    },
                    avif: {
                        filename: avifFilename,
                        path: avifPath,
                        size: avifSize,
                        dimensions: { width: sizeConfig.width, height: sizeConfig.height }
                    }
                });

                console.log(`✅ Generated ${sizeName}: WebP ${this.formatFileSize(webpSize)}, AVIF ${this.formatFileSize(avifSize)}`);
            }

            const processingTime = Date.now() - startTime;
            console.log(`🎯 Generated ${variants.length} size variants in ${processingTime}ms`);

            return {
                success: true,
                variants,
                processingTime,
                totalVariants: variants.length
            };

        } catch (error) {
            console.error('❌ Error generating size variants:', error);
            return {
                success: false,
                variants: [],
                error: error.message
            };
        }
    }

    /**
     * Optimize a single image with size variants
     * @param {string} inputPath - Path to input image
     * @param {string} outputPath - Path for output image
     * @param {string} outputDir - Directory for output images
     * @returns {Promise<Object>} - Optimization result with stats
     */
    async optimizeImage(inputPath, outputPath, outputDir) {
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
                    error: null,
                    variants: []
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

            // Generate AVIF version of the main image
            const avifPath = outputPath.replace('.webp', '.avif');
            await sharp.default(inputPath)
                .resize(metadata.width > this.maxWidth ? this.maxWidth : metadata.width, 
                       metadata.height > this.maxHeight ? this.maxHeight : metadata.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .avif({ 
                    quality: this.quality,
                    effort: 6,
                    chromaSubsampling: '4:2:0'
                })
                .toFile(avifPath);

            // Generate size variants
            const baseFilename = path.basename(outputPath, '.webp');
            const variantsResult = await this.generateSizeVariants(inputPath, outputDir, baseFilename);

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
                outputPath,
                variants: variantsResult.variants || [],
                avifPath
            };

        } catch (error) {
            console.error(`❌ Failed to process image: ${inputPath}`, error);
            return {
                success: false,
                originalSize: 0,
                optimizedSize: 0,
                compressionRatio: 0,
                processingTime: Date.now() - startTime,
                error: error.message,
                variants: []
            };
        }
    }

    /**
     * Optimize multiple images with size variants
     * @param {Array} imageFiles - Array of multer file objects
     * @param {string} uploadDir - Directory where images are uploaded
     * @returns {Promise<Array>} - Array of optimization results
     */
    async optimizeMultipleImages(imageFiles, uploadDir) {
        console.log('🔄 Starting image processing with size variants...');
        
        const optimizedFiles = [];
        const results = [];
        
        for (const file of imageFiles) {
            const originalPath = path.join(uploadDir, file.filename);
            const optimizedFilename = this.generateOptimizedFilename(file.filename);
            const optimizedPath = path.join(uploadDir, optimizedFilename);
            
            console.log(`📁 Processing: ${file.originalname} -> ${optimizedFilename}`);
            
            const result = await this.optimizeImage(originalPath, optimizedPath, uploadDir);
            
            if (result.success) {
                // Update file object with optimized filename
                const optimizedFile = {
                    ...file,
                    filename: optimizedFilename,
                    originalname: file.originalname,
                    variants: result.variants || []
                };
                
                optimizedFiles.push(optimizedFile);
                
                console.log(`✅ Processed: ${file.originalname} -> ${optimizedFilename}`);
                console.log(`   Size: ${this.formatFileSize(result.originalSize)} -> ${this.formatFileSize(result.optimizedSize)}`);
                if (result.compressionRatio > 0) {
                    console.log(`   Compression: ${result.compressionRatio}%`);
                }
                if (result.variants && result.variants.length > 0) {
                    console.log(`   Variants: ${result.variants.length} size variants generated`);
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
                error: result.error,
                variants: result.variants || []
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
        const totalVariants = results.reduce((sum, r) => sum + (r.variants?.length || 0), 0);
        
        return {
            totalFiles,
            successful,
            failed,
            totalProcessingTime,
            totalVariants,
            avgProcessingTime: totalFiles > 0 ? Math.round(totalProcessingTime / totalFiles) : 0
        };
    }

    /**
     * Generate responsive image URLs for frontend
     * @param {string} baseFilename - Base filename without extension
     * @param {string} baseUrl - Base URL for images
     * @returns {Object} - Object with URLs for different sizes and formats
     */
    generateResponsiveUrls(baseFilename, baseUrl) {
        const urls = {
            original: `${baseUrl}/images/products/${baseFilename}.webp`,
            avif: `${baseUrl}/images/products/${baseFilename}.avif`,
            variants: {}
        };

        // Add variant URLs
        for (const [sizeName, sizeConfig] of Object.entries(this.sizeVariants)) {
            urls.variants[sizeName] = {
                webp: `${baseUrl}/images/products/${baseFilename}-${sizeConfig.suffix}.webp`,
                avif: `${baseUrl}/images/products/${baseFilename}-${sizeConfig.suffix}.avif`,
                dimensions: sizeConfig
            };
        }

        return urls;
    }
}

export default new ImageOptimizer(); 