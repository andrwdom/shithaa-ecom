# Draft Order Reconciliation System

## Overview

The Draft Order Reconciliation System is a critical component that ensures no paid orders are lost due to webhook delivery failures, network issues, or other problems. It runs as a separate PM2 process and automatically reconciles draft orders by checking their payment status with PhonePe.

## Features

- ✅ **Real PhonePe API Integration**: Uses actual PhonePe status API to check payment status
- ✅ **Atomic Stock Commit**: Uses the `commitOrder` function for safe stock deduction
- ✅ **Rate Limiting**: Respects PhonePe API rate limits (30 calls/minute)
- ✅ **Comprehensive Logging**: Detailed logs for monitoring and debugging
- ✅ **Error Handling**: Robust error handling with retry logic
- ✅ **Idempotency**: Prevents duplicate processing of orders
- ✅ **Configurable**: Adjustable intervals and limits

## How It Works

1. **Discovery**: Finds draft orders older than 5 minutes that are still pending payment
2. **Verification**: Checks payment status with PhonePe API
3. **Processing**: 
   - If paid → Confirms order using `commitOrder` (atomic stock deduction)
   - If failed → Cancels order
   - If still pending and old → Cancels order
4. **Logging**: Records all actions for monitoring

## Configuration

### Environment Variables

```bash
MONGODB_URI=mongodb://localhost:27017/shitha_maternity_db
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
NODE_ENV=production
```

### Job Settings

- **Interval**: 60 seconds (configurable)
- **Lookback**: 5 minutes (configurable)
- **Max Orders**: 20 per run (configurable)
- **Rate Limit**: 30 API calls per minute

## Installation

### 1. Start the Reconciliation Job

```bash
# Using PM2 (recommended)
cd /var/www/shithaa-ecom/backend
pm2 start ecosystem.reconciliation.config.js

# Or start manually
node jobs/reconcileDrafts.js
```

### 2. Monitor the Job

```bash
# Check status
pm2 status

# View logs
pm2 logs shithaa-reconciliation

# View real-time logs
pm2 logs shithaa-reconciliation --lines 50 -f
```

### 3. Stop the Job

```bash
pm2 stop shithaa-reconciliation
```

## Testing

### Run the Test Script

```bash
cd /var/www/shithaa-ecom/backend
node test-reconciliation.js
```

This will:
1. Create a test draft order
2. Start the reconciliation job
3. Wait for processing
4. Check the results
5. Clean up

### Manual Testing

1. Create a draft order in the database
2. Start the reconciliation job
3. Check the order status after a few minutes
4. Verify the order was processed correctly

## Monitoring

### Log Files

- `logs/reconciliation.log` - Combined logs
- `logs/reconciliation-out.log` - Standard output
- `logs/reconciliation-err.log` - Error logs

### Key Metrics to Monitor

- **Processing Rate**: Orders processed per minute
- **Success Rate**: Percentage of successful reconciliations
- **API Errors**: PhonePe API call failures
- **Stock Commit Failures**: Failed stock deductions

### Alert Conditions

- High error rate (>10%)
- API rate limit exceeded
- Stock commit failures
- Job not running

## Troubleshooting

### Common Issues

1. **PhonePe API Errors**
   - Check credentials are correct
   - Verify network connectivity
   - Check rate limits

2. **Stock Commit Failures**
   - Check product stock levels
   - Verify product IDs in orders
   - Check database connectivity

3. **Job Not Running**
   - Check PM2 status
   - Check logs for errors
   - Verify environment variables

### Debug Mode

Enable debug logging by setting:

```bash
export LOG_LEVEL=debug
```

## Integration with Existing Systems

### Webhook System

The reconciliation job works alongside the webhook system:
- Webhooks handle real-time payment confirmations
- Reconciliation handles missed webhooks
- Both use the same `commitOrder` function for consistency

### Stock Management

- Uses atomic `commitOrder` function
- Prevents overselling
- Handles rollback on failures

### Order Management

- Updates order status atomically
- Maintains audit trail
- Preserves order history

## Performance Considerations

### Rate Limiting

- Respects PhonePe API limits
- Processes orders in batches
- Implements exponential backoff

### Memory Usage

- Limited to 500MB per PM2 process
- Automatic restart on memory limit
- Efficient database queries

### Database Impact

- Uses indexed queries
- Processes orders in small batches
- Minimizes database load

## Security

### API Security

- Uses PhonePe's checksum verification
- Secure credential storage
- Rate limiting protection

### Data Protection

- No sensitive data in logs
- Secure database connections
- Audit trail maintenance

## Maintenance

### Regular Tasks

1. **Monitor Logs**: Check for errors daily
2. **Verify Processing**: Ensure orders are being processed
3. **Check Metrics**: Monitor success rates
4. **Update Credentials**: Rotate API keys as needed

### Updates

1. **Code Updates**: Deploy new versions
2. **Configuration Changes**: Update settings
3. **Dependency Updates**: Keep packages current

## Support

For issues or questions:

1. Check the logs first
2. Review this documentation
3. Test with the test script
4. Contact the development team

## Changelog

### v1.0.0
- Initial implementation
- PhonePe API integration
- Atomic stock commit
- PM2 process management
- Comprehensive logging
