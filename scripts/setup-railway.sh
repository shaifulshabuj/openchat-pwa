#!/bin/bash

# Railway Deployment Setup Script
# Run this script to complete Railway deployment setup

echo "🚀 Railway Deployment Setup for OpenChat API"
echo "============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed"
fi

echo ""
echo "🔐 Step 1: Login to Railway"
echo "This will open your browser for authentication..."
railway login

echo ""
echo "🏗️  Step 2: Initialize Railway Project"
echo "Creating new Railway project..."
railway init

echo ""
echo "🐳 Step 3: Configure Railway Project"
echo "Setting up deployment configuration..."

# Create railway.toml for proper deployment
cat > railway.toml << EOF
[build]
builder = "dockerfile"
dockerfilePath = "docker/api.Dockerfile"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
EOF

echo "✅ Railway configuration created"

echo ""
echo "🚀 Step 4: Deploy to Railway"
echo "Deploying API..."
railway up

echo ""
echo "✅ Railway project setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Find your openchat project: https://railway.com/project/4990c08c-83a4-45be-bb24-b914ad8b96d9"
echo "3. Configure environment variables (see docs/RAILWAY_ENV_SETUP.md)"
echo "4. Add Railway secrets to GitHub repository"
echo ""
echo "🎯 Your project URL: https://railway.com/project/4990c08c-83a4-45be-bb24-b914ad8b96d9"
echo "🎯 After setup, the CI/CD deployment is already re-enabled!"