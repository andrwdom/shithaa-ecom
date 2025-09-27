import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EnhancedLogger from '../utils/enhancedLogger.js';

dotenv.config();

const maintenanceControl = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔧 MAINTENANCE CONTROL SYSTEM\n');
    
    const args = process.argv.slice(2);
    const command = args[0];
    const mode = args[1];
    
    if (!command || !['enable', 'disable', 'status'].includes(command)) {
      console.log('Usage: node maintenance-control.js <command> [mode]');
      console.log('');
      console.log('Commands:');
      console.log('  enable <mode>  - Enable maintenance mode');
      console.log('  disable <mode> - Disable maintenance mode');
      console.log('  status         - Check current status');
      console.log('');
      console.log('Modes:');
      console.log('  full           - Full maintenance mode (MAINTENANCE_MODE=true)');
      console.log('  checkout       - Disable checkout only (DISABLE_CHECKOUT=true)');
      console.log('  payments       - Disable payments only (DISABLE_PAYMENTS=true)');
      console.log('');
      console.log('Examples:');
      console.log('  node maintenance-control.js enable checkout');
      console.log('  node maintenance-control.js disable checkout');
      console.log('  node maintenance-control.js status');
      process.exit(1);
    }
    
    if (command === 'status') {
      console.log('📊 CURRENT MAINTENANCE STATUS:');
      console.log(`   MAINTENANCE_MODE: ${process.env.MAINTENANCE_MODE || 'false'}`);
      console.log(`   DISABLE_CHECKOUT: ${process.env.DISABLE_CHECKOUT || 'false'}`);
      console.log(`   DISABLE_PAYMENTS: ${process.env.DISABLE_PAYMENTS || 'false'}`);
      console.log(`   Server Time: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`   Uptime: ${Math.floor(process.uptime() / 60)} minutes`);
      
      // Check if any maintenance mode is active
      const isMaintenanceActive = process.env.MAINTENANCE_MODE === 'true' || 
                                 process.env.DISABLE_CHECKOUT === 'true' || 
                                 process.env.DISABLE_PAYMENTS === 'true';
      
      if (isMaintenanceActive) {
        console.log('\n🚨 MAINTENANCE MODE IS ACTIVE');
        console.log('   - New checkouts are blocked');
        console.log('   - Payment processing may be disabled');
        console.log('   - Only browsing is allowed');
      } else {
        console.log('\n✅ SYSTEM IS FULLY OPERATIONAL');
      }
      
      await mongoose.connection.close();
      return;
    }
    
    if (!mode || !['full', 'checkout', 'payments'].includes(mode)) {
      console.log('❌ Invalid mode. Use: full, checkout, or payments');
      process.exit(1);
    }
    
    const action = command === 'enable' ? 'enable' : 'disable';
    const value = command === 'enable' ? 'true' : 'false';
    
    let envVar = '';
    let description = '';
    
    switch (mode) {
      case 'full':
        envVar = 'MAINTENANCE_MODE';
        description = 'Full maintenance mode (blocks all non-essential operations)';
        break;
      case 'checkout':
        envVar = 'DISABLE_CHECKOUT';
        description = 'Disable checkout operations only';
        break;
      case 'payments':
        envVar = 'DISABLE_PAYMENTS';
        description = 'Disable payment processing only';
        break;
    }
    
    console.log(`🔧 ${action.toUpperCase()}ING ${mode.toUpperCase()} MAINTENANCE MODE`);
    console.log(`   Environment Variable: ${envVar}=${value}`);
    console.log(`   Description: ${description}`);
    console.log('');
    
    // Log the maintenance mode change
    EnhancedLogger.info(`Maintenance mode ${action}d via script`, {
      mode,
      action,
      value,
      envVar,
      description,
      timestamp: new Date().toISOString(),
      user: 'maintenance-script'
    });
    
    console.log('📝 INSTRUCTIONS:');
    console.log('');
    console.log('1. Update your .env file:');
    console.log(`   ${envVar}=${value}`);
    console.log('');
    console.log('2. Restart the backend service:');
    console.log('   pm2 restart shithaa-backend');
    console.log('');
    console.log('3. Verify the change:');
    console.log('   node scripts/maintenance-control.js status');
    console.log('');
    console.log('4. Check the API:');
    console.log('   curl http://localhost:3000/api/maintenance/status');
    console.log('');
    
    if (action === 'enable') {
      console.log('🚨 MAINTENANCE MODE ENABLED');
      console.log('   - System is now in maintenance mode');
      console.log('   - Users will see maintenance messages');
      console.log('   - Only essential operations are allowed');
    } else {
      console.log('✅ MAINTENANCE MODE DISABLED');
      console.log('   - System is now fully operational');
      console.log('   - All features are available');
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Maintenance control error:', error);
  }
};

maintenanceControl();
