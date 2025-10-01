/**
 * 🚀 AMAZON-LEVEL DATABASE CONFIGURATION
 * 
 * This module provides enterprise-grade MongoDB connection configuration
 * with optimal performance settings for high-traffic applications.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { DatabaseOptimizer } from '../utils/queryOptimizer.js';

dotenv.config();

// =====================================================================================
// DATABASE CONNECTION CONFIGURATION
// =====================================================================================

export class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000; // 5 seconds
    }

    /**
     * 🔧 Get optimized MongoDB connection options
     */
    getConnectionOptions() {
        return {
            // ===============================
            // CONNECTION POOL OPTIMIZATION 
            // ===============================
            maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 20,    // Maximum connections
            minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 5,     // Minimum connections
            maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000, // 30s idle timeout
            waitQueueTimeoutMS: 5000,     // How long to wait for connection from pool
            
            // ===============================
            // TIMEOUT CONFIGURATION
            // ===============================
            serverSelectionTimeoutMS: 5000,  // How long to try to connect
            socketTimeoutMS: 45000,           // How long to wait for response
            connectTimeoutMS: 10000,          // How long to wait for initial connection
            heartbeatFrequencyMS: 10000,      // How often to check server health
            
            // ===============================
            // PERFORMANCE OPTIMIZATION
            // ===============================
            bufferMaxEntries: 0,              // Disable mongoose buffering for production
            bufferCommands: false,            // Disable mongoose command buffering
            
            // ===============================
            // READ/WRITE PREFERENCES
            // ===============================
            readPreference: process.env.DB_READ_PREFERENCE || 'primaryPreferred',
            writeConcern: {
                w: process.env.DB_WRITE_CONCERN_W || 'majority',
                j: process.env.DB_WRITE_CONCERN_J === 'true' || true,
                wtimeout: parseInt(process.env.DB_WRITE_CONCERN_TIMEOUT) || 1000
            },
            readConcern: {
                level: process.env.DB_READ_CONCERN_LEVEL || 'local'
            },
            
            // ===============================
            // NETWORK OPTIMIZATION
            // ===============================
            compressors: ['zlib'],            // Enable network compression
            zlibCompressionLevel: 6,          // Compression level (1-9)
            
            // ===============================
            // RELIABILITY FEATURES
            // ===============================
            retryWrites: true,                // Retry failed writes
            retryReads: true,                 // Retry failed reads
            
            // ===============================
            // AUTHENTICATION & SSL
            // ===============================
            ...(process.env.DB_AUTH_SOURCE && { authSource: process.env.DB_AUTH_SOURCE }),
            ...(process.env.DB_USE_SSL === 'true' && { ssl: true }),
            ...(process.env.DB_SSL_VALIDATE === 'false' && { sslValidate: false }),
            
            // ===============================
            // MONITORING & DEBUGGING
            // ===============================
            monitorCommands: process.env.NODE_ENV === 'development',
            loggerLevel: process.env.DB_LOG_LEVEL || 'info',
            
            // ===============================
            // ADVANCED OPTIONS
            // ===============================
            autoIndex: process.env.NODE_ENV !== 'production', // Only build indexes in development
            autoCreate: process.env.NODE_ENV !== 'production'  // Only create collections in development
        };
    }

    /**
     * 🚀 Connect to MongoDB with optimized settings and retry logic
     */
    async connect() {
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        console.log('🔌 Attempting MongoDB connection...');
        console.log('📊 Connection Configuration:');
        console.log(`   • Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   • Max Pool Size: ${this.getConnectionOptions().maxPoolSize}`);
        console.log(`   • Read Preference: ${this.getConnectionOptions().readPreference}`);
        console.log(`   • Write Concern: ${JSON.stringify(this.getConnectionOptions().writeConcern)}`);

        while (this.connectionAttempts < this.maxRetries && !this.isConnected) {
            try {
                this.connectionAttempts++;
                console.log(`📡 Connection attempt ${this.connectionAttempts}/${this.maxRetries}`);

                await mongoose.connect(mongoUri, this.getConnectionOptions());
                
                this.isConnected = true;
                console.log('✅ MongoDB connected successfully with optimized configuration');
                
                // Setup connection monitoring
                this.setupConnectionMonitoring();
                
                // Enable database profiler in development
                if (process.env.NODE_ENV === 'development') {
                    await this.enableDatabaseProfiler();
                }
                
                // Log connection stats
                await this.logConnectionStats();
                
                break;

            } catch (error) {
                console.error(`❌ MongoDB connection attempt ${this.connectionAttempts} failed:`, error.message);
                
                if (this.connectionAttempts >= this.maxRetries) {
                    console.error('💥 Max connection attempts reached. Exiting...');
                    throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
                }
                
                console.log(`⏳ Retrying in ${this.retryDelay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
    }

    /**
     * 📊 Setup connection monitoring and event handlers
     */
    setupConnectionMonitoring() {
        const db = mongoose.connection;

        // Connection events
        db.on('connected', () => {
            console.log('🟢 MongoDB connection established');
        });

        db.on('disconnected', () => {
            console.log('🔴 MongoDB connection lost');
            this.isConnected = false;
        });

        db.on('reconnected', () => {
            console.log('🟡 MongoDB reconnected');
            this.isConnected = true;
        });

        db.on('error', (error) => {
            console.error('💥 MongoDB connection error:', error.message);
        });

        // Connection pool monitoring
        if (process.env.NODE_ENV === 'development') {
            db.on('connectionPoolCreated', () => {
                console.log('🏊 Connection pool created');
            });

            db.on('connectionCreated', (event) => {
                console.log(`🔗 New connection created (ID: ${event.connectionId})`);
            });

            db.on('connectionClosed', (event) => {
                console.log(`🔚 Connection closed (ID: ${event.connectionId})`);
            });
        }

        // Graceful shutdown handling
        process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => this.gracefulShutdown('SIGUSR2')); // Nodemon restart
    }

    /**
     * 📈 Enable MongoDB profiler for query optimization
     */
    async enableDatabaseProfiler() {
        try {
            await DatabaseOptimizer.enableProfiler(1, 100); // Profile slow operations > 100ms
            console.log('📊 Database profiler enabled for query optimization');
        } catch (error) {
            console.warn('⚠️  Failed to enable database profiler:', error.message);
        }
    }

    /**
     * 📊 Log connection statistics
     */
    async logConnectionStats() {
        try {
            const db = mongoose.connection.db;
            const admin = db.admin();
            const stats = await admin.serverStatus();
            
            console.log('📊 MongoDB Server Statistics:');
            console.log(`   • Version: ${stats.version}`);
            console.log(`   • Uptime: ${Math.floor(stats.uptime / 3600)} hours`);
            console.log(`   • Connections: ${stats.connections.current}/${stats.connections.available}`);
            console.log(`   • Network: In ${(stats.network.bytesIn / 1024 / 1024).toFixed(2)}MB, Out ${(stats.network.bytesOut / 1024 / 1024).toFixed(2)}MB`);
            
            if (stats.wiredTiger) {
                const cache = stats.wiredTiger['cache'];
                console.log(`   • Cache: ${(cache['bytes currently in the cache'] / 1024 / 1024).toFixed(2)}MB / ${(cache['maximum bytes configured'] / 1024 / 1024).toFixed(2)}MB`);
            }

        } catch (error) {
            console.warn('⚠️  Failed to retrieve server statistics:', error.message);
        }
    }

    /**
     * 🔄 Graceful shutdown handling
     */
    async gracefulShutdown(signal) {
        console.log(`\n🛑 Received ${signal}, initiating graceful shutdown...`);
        
        try {
            // Close MongoDB connection
            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed gracefully');
            
            process.exit(0);
        } catch (error) {
            console.error('❌ Error during graceful shutdown:', error.message);
            process.exit(1);
        }
    }

    /**
     * 🏥 Health check for database connection
     */
    async healthCheck() {
        try {
            const db = mongoose.connection.db;
            const result = await db.admin().ping();
            
            return {
                status: 'healthy',
                connected: this.isConnected,
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name,
                ping: result.ok === 1,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                connected: false,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// =====================================================================================
// CONNECTION INSTANCE AND UTILITIES
// =====================================================================================

// Singleton connection instance
export const dbConnection = new DatabaseConnection();

/**
 * 🚀 Initialize optimized database connection
 */
export async function connectDatabase() {
    try {
        await dbConnection.connect();
        return true;
    } catch (error) {
        console.error('💥 Failed to establish database connection:', error.message);
        throw error;
    }
}

/**
 * 📊 Get database connection status
 */
export function getDatabaseStatus() {
    return {
        connected: dbConnection.isConnected,
        readyState: mongoose.connection.readyState,
        readyStateDescription: getReadyStateDescription(mongoose.connection.readyState),
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
    };
}

/**
 * 🏥 Database health check endpoint
 */
export async function checkDatabaseHealth() {
    return await dbConnection.healthCheck();
}

// Helper function to describe connection states
function getReadyStateDescription(state) {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
}

// =====================================================================================
// MONGOOSE OPTIMIZATION SETTINGS
// =====================================================================================

/**
 * 🔧 Configure Mongoose for optimal performance
 */
export function configureMongoose() {
    // Disable Mongoose's default behavior of pluralizing collection names
    mongoose.pluralize(null);

    // Set global options for better performance
    mongoose.set('strictQuery', false);        // Allow dynamic queries
    mongoose.set('sanitizeFilter', true);      // Sanitize query filters
    mongoose.set('runValidators', true);       // Run schema validators on updates
    mongoose.set('returnOriginal', false);     // Return updated document by default

    // Optimize for production
    if (process.env.NODE_ENV === 'production') {
        mongoose.set('debug', false);          // Disable debug logging
        mongoose.set('bufferCommands', false); // Disable command buffering
    } else {
        mongoose.set('debug', true);           // Enable debug logging in development
    }

    console.log('⚙️  Mongoose configured for optimal performance');
}

// Export default configuration
export default {
    DatabaseConnection,
    dbConnection,
    connectDatabase,
    getDatabaseStatus,
    checkDatabaseHealth,
    configureMongoose
};
