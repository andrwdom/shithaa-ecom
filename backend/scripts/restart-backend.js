#!/usr/bin/env node

/**
 * Backend Restart Script
 * This script helps restart the backend after fixes
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const restartBackend = async () => {
  try {
    console.log('🔄 Restarting backend services...');
    
    // Check PM2 status
    console.log('📊 Current PM2 status:');
    const { stdout: statusOutput } = await execAsync('pm2 status');
    console.log(statusOutput);
    
    // Restart backend
    console.log('🔄 Restarting shithaa-backend...');
    const { stdout: restartOutput } = await execAsync('pm2 restart shithaa-backend');
    console.log(restartOutput);
    
    // Check status after restart
    console.log('📊 PM2 status after restart:');
    const { stdout: statusAfterOutput } = await execAsync('pm2 status');
    console.log(statusAfterOutput);
    
    // Check backend logs
    console.log('📋 Recent backend logs:');
    const { stdout: logsOutput } = await execAsync('pm2 logs shithaa-backend --lines 20');
    console.log(logsOutput);
    
    console.log('✅ Backend restart completed!');
    
  } catch (error) {
    console.error('❌ Error restarting backend:', error);
  }
};

// Run the restart
restartBackend();
