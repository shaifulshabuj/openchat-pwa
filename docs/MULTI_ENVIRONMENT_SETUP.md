# 🚀 OpenChat PWA - Multi-Environment CI/CD Setup

## Overview

OpenChat PWA now supports two deployment environments with separate CI/CD pipelines:

- **Production Environment**: Stable releases from `main` branch
- **Development Environment**: Latest features from `develop` branch

## Environments

### 🌟 Production Environment

**Branch**: `main`  
**Frontend URL**: https://shaifulshabuj.github.io/openchat-pwa/  
**Backend URL**: https://openchat-pwa-production.up.railway.app  
**Railway Service**: `openchat-pwa`  
**GitHub Pages Environment**: `github-pages`  

**Triggered by**: Commits to `main` branch  
**Workflow**: `.github/workflows/ci-cd.yml`  

### 🧪 Development Environment

**Branch**: `develop`  
**Frontend URL**: https://shaifulshabuj.github.io/openchat-pwa/dev/  
**Backend URL**: https://openchat-pwa-develop.up.railway.app  
**Railway Service**: `develop`  
**GitHub Pages Environment**: `github-pages-dev`  

**Triggered by**: Commits to `develop` branch  
**Workflow**: `.github/workflows/ci-cd-develop.yml`  

## Workflow Structure

### Production Pipeline (`ci-cd.yml`)
```
main branch → Test → Build Frontend → Deploy Frontend (GitHub Pages) → Deploy Backend (Railway)
```

### Development Pipeline (`ci-cd-develop.yml`)
```
develop branch → Test → Build Frontend → Deploy Frontend (GitHub Pages /dev) → Deploy Backend (Railway develop)
```

## GitHub Pages Structure

The GitHub Pages deployment creates a two-environment setup:

```
https://shaifulshabuj.github.io/openchat-pwa/
├── index.html              # Environment selector page
├── (production files)      # Production app files (main branch)
└── dev/                    # Development environment
    └── (development files) # Development app files (develop branch)
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch from develop
git checkout develop
git checkout -b feature/new-feature

# Make changes, commit, and push
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create PR to develop branch
gh pr create --base develop --title "Add new feature"
```

### 2. Development Deployment
```bash
# Merge PR to develop branch (triggers development CI/CD)
git checkout develop
git merge feature/new-feature
git push origin develop

# Development deployment will be available at:
# Frontend: https://shaifulshabuj.github.io/openchat-pwa/dev/
# Backend: https://openchat-pwa-develop.up.railway.app
```

### 3. Production Release
```bash
# After testing in development, merge to main
git checkout main
git merge develop
git push origin main

# Production deployment will be available at:
# Frontend: https://shaifulshabuj.github.io/openchat-pwa/
# Backend: https://openchat-pwa-production.up.railway.app
```

## Configuration Differences

### Environment Variables

**Production**:
```env
NEXT_PUBLIC_API_URL=https://openchat-pwa-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://openchat-pwa-production.up.railway.app
NEXT_PUBLIC_BASE_PATH=/openchat-pwa
```

**Development**:
```env
NEXT_PUBLIC_API_URL=https://openchat-pwa-develop.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://openchat-pwa-develop.up.railway.app
NEXT_PUBLIC_BASE_PATH=/openchat-pwa/dev
```

### Railway Services

Both environments use the same Railway project but different services:

**Production Service**: `openchat-pwa`
- Database: Production PostgreSQL instance
- Environment: Production variables
- Domain: `openchat-pwa-production.up.railway.app`

**Development Service**: `develop`
- Database: Development PostgreSQL instance (separate from production)
- Environment: Development variables
- Domain: `openchat-pwa-develop.up.railway.app`

## Database Management

### Production Database
- **Service**: Production PostgreSQL in Railway
- **Migrations**: Applied automatically via `prisma db push`
- **Data**: Persistent production user data

### Development Database  
- **Service**: Development PostgreSQL in Railway (separate instance)
- **Migrations**: Applied automatically via `prisma db push`
- **Data**: Test data, safe to reset/modify

## Required Railway Setup

### 1. Create Development Service

In Railway dashboard:
1. Go to your OpenChat project
2. Click "New Service" → "Empty Service"
3. Name it `develop`
4. Add environment variables (see below)

### 2. Development Environment Variables

Add these to the `develop` service in Railway:

```env
DATABASE_URL=postgresql://postgres:...@postgres.railway.internal:5432/develop_db
NODE_ENV=development
JWT_SECRET=[same as production or different for security]
CORS_ORIGIN=https://shaifulshabuj.github.io
PORT=8080
```

### 3. Development Database

Option A: Separate PostgreSQL service for development
```bash
# In Railway dashboard, add new PostgreSQL service for development
# Name: openchat-postgres-dev
```

Option B: Use same PostgreSQL service with different database
```env
# In develop service, use different database name
DATABASE_URL=postgresql://postgres:...@postgres.railway.internal:5432/openchat_dev
```

## GitHub Secrets Required

Ensure these secrets are set in GitHub repository settings:

```
RAILWAY_TOKEN=rwy_...  # Railway API token with access to the project
```

## Monitoring and Logs

### Production Monitoring
```bash
# Railway logs
railway logs --service openchat-pwa

# GitHub Actions
gh run list --workflow=ci-cd.yml

# Health check
curl https://openchat-pwa-production.up.railway.app/health
```

### Development Monitoring
```bash
# Railway logs
railway logs --service develop

# GitHub Actions
gh run list --workflow=ci-cd-develop.yml

# Health check
curl https://openchat-pwa-develop.up.railway.app/health
```

## Testing the Setup

### 1. Test Development Deployment
```bash
# Make a test change to develop branch
git checkout develop
echo "# Test change" >> README.md
git add README.md
git commit -m "test: trigger development deployment"
git push origin develop

# Monitor the deployment
gh run watch
```

### 2. Verify Environments
```bash
# Check both environments are running
curl https://shaifulshabuj.github.io/openchat-pwa/
curl https://shaifulshabuj.github.io/openchat-pwa/dev/

# Check backend health
curl https://openchat-pwa-production.up.railway.app/health
curl https://openchat-pwa-develop.up.railway.app/health
```

## Rollback Strategy

### Production Rollback
```bash
# Revert to previous commit on main
git revert HEAD
git push origin main
```

### Development Reset
```bash
# Force push previous state to develop
git reset --hard HEAD~1
git push --force origin develop
```

## Best Practices

1. **Always test in development first** before merging to main
2. **Use feature branches** for new development
3. **Keep develop branch up to date** with main periodically
4. **Monitor both environments** for issues
5. **Separate databases** prevent development data from affecting production
6. **Use different JWT secrets** for additional security isolation

## Troubleshooting

### Common Issues

**1. Railway Service Not Found**
```bash
# Ensure service name matches in workflow
railway up --detach --service develop
```

**2. GitHub Pages Path Issues**
```bash
# Check NEXT_PUBLIC_BASE_PATH in build environment
echo $NEXT_PUBLIC_BASE_PATH
```

**3. Database Connection Issues**
```bash
# Verify DATABASE_URL in Railway service environment
railway variables --service develop
```

**4. CORS Issues**
```bash
# Update CORS_ORIGIN to include GitHub Pages domains
CORS_ORIGIN=https://shaifulshabuj.github.io
```

---

**Last Updated**: January 27, 2026  
**Setup Status**: Ready for testing  
**Next Steps**: Create Railway develop service and test deployment