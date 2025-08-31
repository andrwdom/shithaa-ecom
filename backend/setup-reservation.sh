#!/bin/bash

echo "🚀 Setting up Reservation System Environment Variables..."
echo "=" .repeat(60)

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Creating one..."
    touch .env
fi

# Check if RESERVATION_ENABLED is already set
if grep -q "RESERVATION_ENABLED" .env; then
    echo "✅ RESERVATION_ENABLED already exists in .env"
    echo "Current value: $(grep RESERVATION_ENABLED .env)"
else
    echo "➕ Adding RESERVATION_ENABLED=true to .env"
    echo "RESERVATION_ENABLED=true" >> .env
fi

# Check if PHONEPE_WEBHOOK_SECRET is set
if grep -q "PHONEPE_WEBHOOK_SECRET" .env; then
    echo "✅ PHONEPE_WEBHOOK_SECRET already exists in .env"
else
    echo "⚠️ PHONEPE_WEBHOOK_SECRET not found in .env"
    echo "   You can add it manually for webhook signature verification"
fi

echo ""
echo "📋 Environment setup complete!"
echo ""
echo "🔧 Next steps:"
echo "   1. Restart your server: pm2 restart all"
echo "   2. Test the system: node scripts/test-reservation.js"
echo "   3. Run concurrency test: node scripts/concurrency-test.js single"
echo ""
echo "💡 To enable the reservation system, ensure RESERVATION_ENABLED=true in .env"
