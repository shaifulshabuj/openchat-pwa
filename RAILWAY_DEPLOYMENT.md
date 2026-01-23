# 🚀 Railway Deployment - Complete Setup Guide

## Quick Start

Railway deployment is now ready! Follow these steps to complete the setup:

### 1. Run the Setup Script
```bash
# Make the script executable (if not already)
chmod +x scripts/setup-railway.sh

# Run the setup script
./scripts/setup-railway.sh
```

### 2. Manual Setup Steps

If you prefer manual setup:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway (opens browser)
railway login

# Initialize project
railway init

# Deploy with Dockerfile
railway deploy --dockerfile docker/api.Dockerfile
```

### 3. Configure Environment Variables

After deployment, set up environment variables in Railway dashboard:

**Go to**: https://railway.app/dashboard → Your Project → Variables

**Required Variables**:
```
NODE_ENV=production
PORT=8000
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
DATABASE_URL=postgresql://user:password@host:port/database
```

**Optional Variables**:
```
REDIS_URL=redis://user:password@host:port
MAX_FILE_SIZE=10485760
FRONTEND_URL=https://your-frontend-domain.com
```

📖 **Detailed setup**: See [docs/RAILWAY_ENV_SETUP.md](docs/RAILWAY_ENV_SETUP.md)

### 4. Add GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
RAILWAY_TOKEN=your-railway-api-token
```

**To get your Railway token**:
1. Go to https://railway.app/account/tokens
2. Create a new token
3. Copy the value

### 5. Database Setup (Auto-Provisioning)

Railway can automatically provision PostgreSQL:

```bash
# After railway init, add PostgreSQL service
railway service create --template postgres

# Railway will automatically configure DATABASE_URL
```

## Verification

After setup, verify deployment:

1. **Check deployment status**:
   ```bash
   railway status
   ```

2. **View logs**:
   ```bash
   railway logs
   ```

3. **Test API**:
   ```bash
   curl https://your-service.up.railway.app/
   ```

4. **Test CI/CD**: Push to main branch to trigger automated deployment

## Current Status

✅ **Railway CLI**: Installed and ready  
✅ **Dockerfile**: Updated for production use  
✅ **CI/CD Workflow**: Re-enabled and configured  
✅ **Environment Setup**: Documentation and scripts ready  
🔧 **Manual Setup**: Required (one-time authentication)  

## File Changes Made

- ✅ **docker/api.Dockerfile**: Updated for production build
- ✅ **.github/workflows/ci-cd.yml**: Re-enabled Railway deployment
- ✅ **scripts/setup-railway.sh**: Automated setup script
- ✅ **docs/RAILWAY_ENV_SETUP.md**: Comprehensive environment guide

## Next Steps

1. Run `./scripts/setup-railway.sh` 
2. Configure environment variables in Railway dashboard
3. Add `RAILWAY_TOKEN` to GitHub secrets
4. Test deployment by pushing to main branch

The deployment pipeline is now ready for production! 🎉