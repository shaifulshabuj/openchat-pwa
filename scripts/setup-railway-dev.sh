#!/bin/bash

# OpenChat PWA - Railway Development Environment Setup Script
# This script helps set up the development environment in Railway

set -e

echo "🚀 OpenChat PWA - Railway Development Environment Setup"
echo "======================================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
else
    echo "✅ Railway CLI found"
fi

echo ""

# Check if logged in to Railway
echo "🔑 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
else
    echo "✅ Railway authentication verified"
fi

echo ""

# List existing services
echo "📋 Current Railway services:"
railway service list

echo ""

# Check if develop service exists
echo "🔍 Checking if 'develop' service exists..."
if railway service list | grep -q "develop"; then
    echo "✅ Development service 'develop' already exists"
    SERVICE_EXISTS=true
else
    echo "❌ Development service 'develop' not found"
    SERVICE_EXISTS=false
fi

echo ""

if [ "$SERVICE_EXISTS" = false ]; then
    echo "🏗️ Creating development service..."
    echo "Please create the development service in Railway dashboard:"
    echo ""
    echo "1. Go to your Railway dashboard"
    echo "2. Click 'New Service' → 'Empty Service'" 
    echo "3. Name it 'develop'"
    echo "4. Click 'Create'"
    echo ""
    echo "After creating the service, run this script again."
    echo ""
    echo "🔗 Railway Dashboard: https://railway.app/dashboard"
    exit 0
fi

# Set up environment variables for development service
echo "⚙️ Setting up development environment variables..."

# Get production DATABASE_URL as reference (but we'll modify it)
echo "📋 Getting production database configuration..."
PROD_DB_URL=$(railway variables get DATABASE_URL --service openchat-pwa 2>/dev/null || echo "")

if [ -z "$PROD_DB_URL" ]; then
    echo "❌ Could not get production DATABASE_URL. Please ensure production service exists."
    echo "Setting up with placeholder DATABASE_URL..."
    DEV_DB_URL="postgresql://postgres:password@postgres.railway.internal:5432/openchat_dev"
else
    # Modify the database name for development
    DEV_DB_URL=$(echo "$PROD_DB_URL" | sed 's/openchat[^?]*/openchat_dev/')
    echo "✅ Generated development DATABASE_URL based on production"
fi

# Set development environment variables
echo "Setting environment variables for develop service..."

railway variables set DATABASE_URL="$DEV_DB_URL" --service develop
railway variables set NODE_ENV="development" --service develop  
railway variables set PORT="8080" --service develop
railway variables set CORS_ORIGIN="https://shaifulshabuj.github.io" --service develop

# Get JWT_SECRET from production (or prompt for new one)
JWT_SECRET=$(railway variables get JWT_SECRET --service openchat-pwa 2>/dev/null || echo "")
if [ -z "$JWT_SECRET" ]; then
    echo "🔐 JWT_SECRET not found in production. Please set it manually:"
    echo "railway variables set JWT_SECRET=\"your-jwt-secret-here\" --service develop"
else
    railway variables set JWT_SECRET="$JWT_SECRET" --service develop
    echo "✅ JWT_SECRET copied from production"
fi

echo ""
echo "✅ Development environment variables set!"

# Show current variables
echo "📋 Current development environment variables:"
railway variables --service develop

echo ""
echo "🎯 Next Steps:"
echo "==============="
echo ""
echo "1. ✅ Development service created and configured"
echo "2. 🔄 Commit changes to 'develop' branch to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'feat: add development environment setup'"
echo "   git push origin develop"
echo ""
echo "3. 📱 Monitor deployment:"
echo "   gh run watch"
echo ""
echo "4. 🧪 Test development environment:"
echo "   curl https://openchat-pwa-develop.up.railway.app/health"
echo "   open https://shaifulshabuj.github.io/openchat-pwa/dev/"
echo ""
echo "5. 📊 Monitor logs:"
echo "   railway logs --service develop"
echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "📖 For full documentation, see: docs/MULTI_ENVIRONMENT_SETUP.md"