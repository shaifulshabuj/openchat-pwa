#!/bin/bash

# Simplified Railway Development Environment Variables Setup
# Run this AFTER manually creating the 'develop' service in Railway dashboard

echo "🔧 Setting up Railway Development Environment Variables"
echo "======================================================"

cd /Volumes/SATECHI_WD_BLACK_2/openchat

# Link to develop service
echo "🔗 Linking to develop service..."
railway link --service develop

echo "⚙️ Setting development environment variables..."

# Set basic environment variables
railway variables set NODE_ENV="development"
railway variables set PORT="8080" 
railway variables set CORS_ORIGIN="https://shaifulshabuj.github.io"

# Generate a development JWT secret
DEV_JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev-jwt-secret-$(date +%s)")
railway variables set JWT_SECRET="$DEV_JWT_SECRET"

# Set DATABASE_URL (pointing to the same Postgres service but different database)
# This uses the Railway internal Postgres reference
railway variables set DATABASE_URL="postgresql://postgres:\${{Postgres.POSTGRES_PASSWORD}}@postgres.railway.internal:5432/railway_dev"

echo ""
echo "✅ Development environment variables set:"
railway variables

echo ""
echo "🎯 Next steps:"
echo "1. Test deployment: railway up"
echo "2. Or commit to trigger CI/CD: git push origin develop" 
echo "3. Monitor: gh run watch"

# Switch back to production service
railway link --service openchat-pwa
echo ""
echo "🔄 Switched back to production service"