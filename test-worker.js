#!/usr/bin/env node

// Simple test to verify the worker can be imported and run
import { expireOldReservations } from './backend/workers/reservationExpiryWorker.js';

console.log('Testing reservation worker...');

try {
  const result = await expireOldReservations();
  console.log('Worker test result:', result);
  process.exit(0);
} catch (error) {
  console.error('Worker test failed:', error);
  process.exit(1);
}
