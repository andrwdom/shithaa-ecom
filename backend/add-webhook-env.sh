#!/bin/bash

echo "🔧 Adding missing PhonePe webhook environment variables..."

# Add webhook authentication variables to .env
echo "" >> .env
echo "# PhonePe Webhook Authentication" >> .env
echo "PHONEPE_CALLBACK_USERNAME=shithaa_webhook" >> .env
echo "PHONEPE_CALLBACK_PASSWORD=webhook_secure_2024" >> .env

echo "✅ Webhook environment variables added to .env"
echo "📋 Added:"
echo "  - PHONEPE_CALLBACK_USERNAME=shithaa_webhook"
echo "  - PHONEPE_CALLBACK_PASSWORD=webhook_secure_2024"
echo ""
echo "🔑 IMPORTANT: Update these values in your PhonePe dashboard webhook configuration!"
