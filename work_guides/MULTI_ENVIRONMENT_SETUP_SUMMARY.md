# Multi-Environment CI/CD Setup Summary

## What was created:

### 1. New Development CI/CD Workflow
**File**: `.github/workflows/ci-cd-develop.yml`
- Triggers on `develop` branch commits
- Deploys to Railway `develop` service
- Deploys frontend to separate GitHub Pages branch `gh-pages-dev`

### 2. Updated Production Workflow
**File**: `.github/workflows/ci-cd.yml`
- Now only triggers on `main` branch (removed develop trigger)
- Prevents conflicts between production and development deployments

### 3. Updated Next.js Configuration
**File**: `apps/web/next.config.ts`
- Supports dynamic base paths via `NEXT_PUBLIC_BASE_PATH`
- Allows different paths for production vs development

### 4. Setup Documentation
**File**: `docs/MULTI_ENVIRONMENT_SETUP.md`
- Complete guide for multi-environment setup
- Workflow explanations and best practices

### 5. Setup Script
**File**: `scripts/setup-railway-dev.sh`
- Automated Railway development environment setup
- Sets up environment variables and service configuration

## Environment URLs:

### Production (main branch)
- **Frontend**: https://shaifulshabuj.github.io/openchat-pwa/ 
- **Backend**: https://openchat-pwa-production.up.railway.app
- **Railway Service**: `openchat-pwa`

### Development (develop branch)  
- **Frontend**: https://shaifulshabuj.github.io/openchat-pwa-dev/
- **Backend**: https://openchat-pwa-develop.up.railway.app
- **Railway Service**: `develop`

## Next Steps:

1. **Create Railway development service**:
   ```bash
   ./scripts/setup-railway-dev.sh
   ```

2. **Enable GitHub Pages for development branch**:
   - Go to repository Settings → Pages
   - Create a second GitHub Pages source from `gh-pages-dev` branch
   - This will create a separate deployment at different URL

3. **Test development deployment**:
   ```bash
   git add .
   git commit -m "feat: add multi-environment CI/CD setup"
   git push origin develop
   ```

4. **Monitor deployments**:
   ```bash
   gh run watch
   railway logs --service develop
   ```

## Key Features:

- ✅ Separate environments for production and development
- ✅ Independent CI/CD pipelines 
- ✅ Separate Railway services and databases
- ✅ Separate GitHub Pages deployments
- ✅ Environment-specific configuration
- ✅ Automated setup scripts
- ✅ Comprehensive documentation

This setup provides complete isolation between production and development environments while maintaining the same deployment automation for both.