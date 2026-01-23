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
echo "🐳 Step 3: Deploy with Dockerfile"
echo "Deploying API using Dockerfile..."
railway deploy --dockerfile docker/api.Dockerfile

echo ""
echo "✅ Railway project setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Find your openchat project"
echo "3. Configure environment variables (see docs/RAILWAY_ENV_SETUP.md)"
echo "4. Get your project ID and service ID"
echo "5. Add Railway secrets to GitHub repository"
echo ""
echo "🎯 After setup, the CI/CD deployment is already re-enabled!"