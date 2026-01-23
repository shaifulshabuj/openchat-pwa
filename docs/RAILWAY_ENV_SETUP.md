# Railway Environment Variables Setup

After initializing your Railway project, configure these environment variables in the Railway dashboard:

## Required Environment Variables

### 1. Application Configuration
```
NODE_ENV=production
PORT=8000
```

### 2. Database Configuration
```
DATABASE_URL=postgresql://user:password@host:port/database
```
**Note**: Railway can auto-provision a PostgreSQL database. 
- Go to your project dashboard
- Click "Add Service" → "Database" → "PostgreSQL"
- Railway will automatically create and configure DATABASE_URL

### 3. JWT Configuration
```
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
```
**Generate strong JWT secret**:
```bash
openssl rand -base64 32
```

### 4. Redis Configuration (Optional)
```
REDIS_URL=redis://user:password@host:port
```
**Note**: Railway can auto-provision Redis if needed.
- Go to your project dashboard  
- Click "Add Service" → "Database" → "Redis"

### 5. File Upload Configuration
```
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads
```

### 6. CORS Configuration
```
ALLOWED_ORIGINS=https://your-frontend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Setting Environment Variables

### Via Railway Dashboard:
1. Go to https://railway.app/dashboard
2. Select your openchat project
3. Click on your API service
4. Go to "Variables" tab
5. Add each variable with its value

### Via Railway CLI:
```bash
# Navigate to your project directory
cd /path/to/openchat

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=8000
railway variables set JWT_SECRET="your-jwt-secret-here"
railway variables set DATABASE_URL="your-database-url"
# ... add other variables
```

## Database Setup

### Option 1: Railway PostgreSQL (Recommended)
```bash
# Add PostgreSQL service to your project
railway service create --name postgresql --image postgres:15

# Railway will automatically set DATABASE_URL
```

### Option 2: External Database
Configure your own PostgreSQL instance and set the DATABASE_URL manually.

## After Configuration

1. **Get Project Information**:
   ```bash
   railway status
   ```
   Note down:
   - Project ID
   - Service ID

2. **Add GitHub Secrets**:
   In your GitHub repository settings → Secrets and variables → Actions:
   ```
   RAILWAY_TOKEN=your-railway-token
   RAILWAY_PROJECT_ID=your-project-id (if needed)
   RAILWAY_SERVICE_ID=your-service-id (if needed)
   ```

3. **Re-enable CI/CD Deployment**:
   Uncomment the deployment section in `.github/workflows/ci-cd.yml`

4. **Test Deployment**:
   ```bash
   # Push to main branch to trigger deployment
   git push origin main
   ```

## Getting Railway Token

1. Go to https://railway.app/account/tokens
2. Create a new token
3. Copy the token value
4. Add it as `RAILWAY_TOKEN` in GitHub secrets

## Verification

After setup, your API should be accessible at:
```
https://your-service-name.up.railway.app
```

Test the health endpoint:
```bash
curl https://your-service-name.up.railway.app/
```

## Troubleshooting

### Common Issues:
1. **Database Connection**: Ensure DATABASE_URL is correctly formatted
2. **Build Failures**: Check that Dockerfile builds successfully locally
3. **Environment Variables**: Verify all required variables are set
4. **Port Configuration**: Ensure PORT=8000 matches Dockerfile EXPOSE

### Useful Commands:
```bash
# Check deployment logs
railway logs

# Redeploy service
railway deploy

# Check service status
railway status

# Open service in browser
railway open
```