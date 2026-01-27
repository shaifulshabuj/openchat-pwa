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
    echo "Opening browser for authentication..."
    railway login
    echo "✅ Railway authentication completed"
else
    echo "✅ Railway authentication verified"
fi

echo ""

# Check current Railway project status
echo "📊 Current Railway Project Status:"
railway status
echo ""

# Check if we're in the right project
PROJECT_NAME=$(railway status | grep "Project:" | cut -d' ' -f2)
if [ "$PROJECT_NAME" = "openchat-pwa" ]; then
    echo "✅ Connected to OpenChat PWA project"
else
    echo "❌ Not connected to OpenChat PWA project. Current project: $PROJECT_NAME"
    echo "Please run: railway open"
    echo "Then navigate to the OpenChat PWA project and run this script from that directory"
    exit 1
fi

echo ""

# Check if develop service already exists by trying to link to it
echo "🔍 Checking if 'develop' service exists..."

# Temporarily switch to develop service to check if it exists
if railway link --service develop 2>/dev/null; then
    echo "✅ Development service 'develop' already exists"
    SERVICE_EXISTS=true
    # Link back to main service for now
    railway link --service openchat-pwa
else
    echo "❌ Development service 'develop' not found"
    SERVICE_EXISTS=false
fi

echo ""

if [ "$SERVICE_EXISTS" = false ]; then
    echo "🏗️ Creating development service..."
    echo ""
    echo "Please create the development service manually:"
    echo ""
    echo "1. Railway dashboard should have opened in your browser"
    echo "   If not, run: railway open"
    echo ""
    echo "2. In the OpenChat PWA project dashboard:"
    echo "   → Click '+ Add Service'"
    echo "   → Select 'Empty Service'"
    echo "   → Name it: 'develop'"
    echo "   → Click 'Create'"
    echo ""
    echo "3. After creating the service, press Enter to continue..."
    echo ""
    read -p "Press Enter after creating the 'develop' service in Railway dashboard..."
    
    echo ""
    echo "🔄 Checking for newly created service..."
    if railway link --service develop 2>/dev/null; then
        echo "✅ Development service 'develop' found and linked!"
        SERVICE_EXISTS=true
    else
        echo "❌ Could not find 'develop' service. Please ensure it was created correctly."
        echo "Service name must be exactly: develop"
        exit 1
    fi
fi

echo ""
echo "🔗 Configuring development service..."

# Link to the develop service for configuration
railway link --service develop
echo "✅ Linked to develop service"

echo ""

# Set up environment variables for development service
echo "⚙️ Setting up development environment variables..."

# Get production DATABASE_URL as reference
echo "📋 Getting production database configuration..."

# Switch to production service to get DATABASE_URL
railway link --service openchat-pwa
PROD_DB_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
railway link --service develop  # Switch back to develop service

if [ -z "$PROD_DB_URL" ]; then
    echo "❌ Could not get production DATABASE_URL. Setting up with default..."
    # Use the Railway PostgreSQL internal URL format
    DEV_DB_URL="postgresql://postgres:\${{Postgres.POSTGRES_PASSWORD}}@postgres.railway.internal:5432/railway"
else
    # Use the same database connection but with different database name for isolation
    DEV_DB_URL=$(echo "$PROD_DB_URL" | sed 's/railway$/railway_dev/')
    echo "✅ Generated development DATABASE_URL based on production"
fi

# Set development environment variables
echo "🔧 Setting environment variables for develop service..."

railway variables set DATABASE_URL="$DEV_DB_URL"
railway variables set NODE_ENV="development" 
railway variables set PORT="8080"
railway variables set CORS_ORIGIN="https://shaifulshabuj.github.io"

# Get JWT_SECRET from production service
railway link --service openchat-pwa
JWT_SECRET=$(railway variables get JWT_SECRET 2>/dev/null || echo "")
railway link --service develop  # Switch back to develop service

if [ -z "$JWT_SECRET" ]; then
    echo "🔐 JWT_SECRET not found in production. Generating new one for development..."
    # Generate a random JWT secret for development
    DEV_JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "dev-jwt-secret-$(date +%s)")
    railway variables set JWT_SECRET="$DEV_JWT_SECRET"
    echo "✅ New JWT_SECRET generated for development"
else
    # Use the same JWT secret for development (you may want to use different for security isolation)
    railway variables set JWT_SECRET="$JWT_SECRET"
    echo "✅ JWT_SECRET copied from production"
fi

echo ""
echo "✅ Development environment variables set!"

# Show current variables for the develop service
echo ""
echo "📋 Current development environment variables:"
railway variables

echo ""
echo "📁 Creating Railway configuration for development deployment..."

# Create a railway.toml specifically for the develop service (if needed)
if [ ! -f "railway.toml" ]; then
    cat > railway.toml << EOF
[build]
builder = "dockerfile"
dockerfilePath = "docker/api.Dockerfile"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
EOF
    echo "✅ Railway configuration created (railway.toml)"
else
    echo "✅ Railway configuration already exists"
fi

echo ""
echo "🎯 Next Steps:"
echo "==============="
echo ""
echo "1. ✅ Development service created and configured"
echo "   Service Name: develop"
echo "   Project: OpenChat PWA"
echo ""
echo "2. 🔄 Test deployment manually:"
echo "   railway up"
echo ""
echo "3. 🔄 Or commit changes to trigger CI/CD:"
echo "   git add ."
echo "   git commit -m 'feat: trigger development deployment'"
echo "   git push origin develop"
echo ""
echo "4. 📱 Monitor deployment:"
echo "   gh run watch"
echo "   railway logs"
echo ""
echo "5. 🧪 Test development environment once deployed:"
echo "   curl https://openchat-pwa-develop.up.railway.app/health"
echo ""
echo "6. 🌐 Development URLs (after successful deployment):"
echo "   Backend:  https://openchat-pwa-develop.up.railway.app"
echo "   Frontend: https://shaifulshabuj.github.io/openchat-pwa-dev/"
echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "🔗 Railway Dashboard: https://railway.app/project/4990c08c-83a4-45be-bb24-b914ad8b96d9"
echo "📖 For troubleshooting, see: docs/MULTI_ENVIRONMENT_SETUP.md"

# Switch back to production service as default
railway link --service openchat-pwa
echo ""
echo "🔄 Switched back to production service for normal operations"