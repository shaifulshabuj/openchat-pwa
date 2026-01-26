# 🤖 Codex CLI Agent Instructions - OpenChat PWA Next Priorities

**Project:** OpenChat PWA  
**Current Status:** ✅ Critical issues resolved, API documentation complete, Node.js v22 ready  
**Agent Role:** Complete remaining test fixes and deploy production build  
**Last Update:** January 26, 2026 - Previous priorities completed successfully  

---

## ⚠️ **STRICT AGENT CONSTRAINTS**

```bash
🚫 DO NOT:
- Make any unrelated changes outside assigned tasks
- Modify working code that isn't part of the specific task
- Commit anything to GitHub (leave all changes uncommitted)
- Update documentation unless specifically requested
- Install new dependencies unless absolutely necessary
- Change database schema or migrations
- Modify auth logic (already fixed and working)
- Touch React component logic unless part of specific task

✅ DO:
- Focus ONLY on assigned task
- Run tests to verify your changes
- Follow existing code patterns and styles
- Maintain existing API response formats
- Test locally before completing each task
```

---

## 📋 **COMPLETED TASKS STATUS**

**✅ TASK 3: OpenAPI Documentation - COMPLETED**
- ✅ Created: `apps/api/src/docs/openapi.json`
- ✅ Comprehensive API spec with all endpoints documented
- ✅ Proper schemas, authentication, examples included

**✅ TASK 4: Swagger UI Integration - COMPLETED**  
- ✅ Created: `apps/api/src/routes/docs.ts`
- ✅ Working endpoints: `GET /docs` (JSON spec), `GET /docs/ui` (Swagger interface)
- ✅ Successfully tested and verified functional

**✅ TASK 5: Test Utilities - COMPLETED**
- ✅ Added comprehensive test helper functions
- ✅ Test factories and setup utilities implemented

**✅ READ RECEIPTS & MESSAGE CRUD TESTS - COMPLETED**
- ✅ Updated `apps/api/src/tests/read-receipts.test.ts` (12 tests)
- ✅ Updated `apps/api/src/tests/message-crud.test.ts` (8 tests)  
- ✅ Tests aligned with current API responses
- ✅ Test structure validated and ready

**⏭️ SKIPPED: Database Test Environment Setup**
- Tests require PostgreSQL connection for execution
- Test code is correct and complete
- Skipping database setup for now - focusing on production priorities

---

## 🎯 **PRIORITY TASK 1: Production Build Optimization**

**Current Status:** API runs successfully but needs production optimization  
**Target:** Prepare production-ready build with optimizations  

**Instructions:**

```bash
TASK: Optimize API for production deployment

CURRENT STATUS:
- API server runs successfully on localhost:8002
- Swagger documentation working at /docs and /docs/ui
- Missing production optimizations

OPTIMIZATIONS NEEDED:
1. Production build configuration
2. Environment variable validation
3. Production-ready error handling
4. Performance optimizations
5. Security headers optimization

STEPS:
1. Review current production build process
2. Add environment validation middleware
3. Optimize bundle size and dependencies
4. Add production logging configuration
5. Test production build locally
6. Document deployment requirements

SUCCESS CRITERIA:
- Production build runs without development dependencies
- Environment validation prevents startup with invalid config  
- Optimized bundle size
- Production-ready logging and error handling
- Ready for Railway deployment

FILES TO MODIFY:
- apps/api/package.json (production scripts)
- apps/api/src/middleware/ (production middleware)
- apps/api/src/index.ts (production configuration)

TESTING:
- NODE_ENV=production npm start
- Verify no development dependencies loaded
- Test all endpoints work in production mode
```

---

## 🎯 **PRIORITY TASK 2: Deploy to Production (GitHub Pages)**

**Current Status:** Web app build ready, CI/CD pipeline fixed  
**Target:** Deploy optimized web application to GitHub Pages  

**Instructions:**

```bash
TASK: Deploy optimized web application to production

BACKGROUND:
- Previous auth hydration issues have been resolved
- Static export compatibility fixes implemented  
- Apps/web is ready for GitHub Pages deployment
- CI/CD pipeline lockfile issues fixed

DEPLOYMENT PROCESS:
1. Test CI/CD pipeline with recent fixes
2. Verify GitHub Pages deployment workflow
3. Update production environment variables
4. Test deployment pipeline
5. Verify production functionality

STEPS:
1. Push changes to trigger CI/CD pipeline
2. Monitor GitHub Actions workflow execution
3. Test static export: cd apps/web && STATIC_EXPORT=true npm run build
4. Verify GitHub Pages configuration
5. Test deployed application functionality
6. Verify auth state persistence works in production

SUCCESS CRITERIA:
- CI/CD pipeline runs successfully without lockfile errors
- Web app successfully deployed to GitHub Pages
- Authentication works without hydration errors
- All static assets load correctly
- PWA functionality works in production

FILES TO VERIFY:
- .github/workflows/ci-cd.yml (updated with --no-frozen-lockfile)
- apps/web/next.config.js (production configuration)
- apps/web/.env.production (production environment)

VERIFICATION:
- Test deployed app functionality
- Verify PWA installation works
- Check performance metrics
- Confirm no console errors
```

---

## 🎯 **PRIORITY TASK 3: API Production Optimization**

**Current Status:** API runs successfully, needs production optimization  
**Target:** Prepare production-ready API build with optimizations  

**Instructions:**

```bash
TASK: Optimize API for production deployment on Railway

CURRENT STATUS:
- API server runs successfully on localhost:8002
- Swagger documentation working at /docs and /docs/ui
- Missing production optimizations

OPTIMIZATIONS NEEDED:
1. Production build configuration
2. Environment variable validation
3. Production-ready error handling
4. Performance optimizations
5. Security headers optimization

STEPS:
1. Review current production build process
2. Add environment validation middleware
3. Optimize bundle size and dependencies
4. Add production logging configuration
5. Test production build locally
6. Document Railway deployment requirements

SUCCESS CRITERIA:
- Production build runs without development dependencies
- Environment validation prevents startup with invalid config  
- Optimized bundle size and performance
- Production-ready logging and error handling
- Ready for Railway deployment

FILES TO MODIFY:
- apps/api/package.json (production scripts)
- apps/api/src/middleware/ (production middleware)
- apps/api/src/index.ts (production configuration)

TESTING:
- NODE_ENV=production npm start
- Verify no development dependencies loaded
- Test all endpoints work in production mode
```

**Current Status:** Web app build ready, needs production deployment  
**Target:** Deploy optimized web application to GitHub Pages  

**Instructions:**

```bash
TASK: Deploy optimized web application to production

BACKGROUND:
- Previous auth hydration issues have been resolved
- Static export compatibility fixes implemented  
- Apps/web is ready for GitHub Pages deployment

DEPLOYMENT PROCESS:
1. Build optimized web application
2. Configure GitHub Pages deployment
3. Update production environment variables
4. Test deployment pipeline
5. Verify production functionality

STEPS:
1. cd apps/web && STATIC_EXPORT=true npm run build
2. Test static export locally: npm run start
3. Configure GitHub Actions for automated deployment
4. Update any hardcoded URLs for production
5. Deploy and test live application
6. Verify auth state persistence works in production

SUCCESS CRITERIA:
- Web app successfully deployed to GitHub Pages
- Authentication works without hydration errors
- All static assets load correctly
- PWA functionality works in production
- Performance optimized for production

FILES TO MODIFY:
- .github/workflows/ (deployment workflow)
- apps/web/next.config.js (production configuration)
- apps/web/.env.production (production environment)

VERIFICATION:
- Test deployed app functionality
- Verify PWA installation works
- Check performance metrics
- Confirm no console errors
```

---

## 🎯 **PRIORITY TASK 4: Add Real-Time Chat Features**

**Current Status:** Socket.IO backend ready, needs frontend integration  
**Target:** Implement real-time messaging functionality  

**Instructions:**

```bash
TASK: Implement real-time chat features using Socket.IO

CURRENT STATUS:
- Socket.IO server configured and running
- Backend real-time infrastructure ready
- Frontend needs Socket.IO client integration

FEATURES TO IMPLEMENT:
1. Real-time message sending/receiving
2. Typing indicators
3. Online status indicators  
4. Message delivery confirmations
5. Real-time notifications

STEPS:
1. Install Socket.IO client in apps/web
2. Create Socket.IO service for frontend
3. Implement real-time message updates
4. Add typing indicators component
5. Add online status tracking
6. Test real-time functionality across browser tabs

SUCCESS CRITERIA:
- Messages appear in real-time without page refresh
- Typing indicators work between users
- Online/offline status updates correctly
- No performance degradation
- Proper error handling for connection issues

FILES TO MODIFY:
- apps/web/src/services/socket.ts (new file)
- apps/web/src/store/ (real-time state management)
- apps/web/src/components/Chat/ (real-time UI)

TESTING:
- Open multiple browser tabs
- Test real-time message delivery
- Test connection recovery after network loss
```

---

## 🎯 **PRIORITY TASK 5: Performance Optimization & Monitoring**

**Current Status:** Application functional, needs performance optimization  
**Target:** Optimize performance and add monitoring capabilities  

**Instructions:**

```bash
TASK: Implement performance optimizations and monitoring

PERFORMANCE AREAS:
1. API response time optimization
2. Database query optimization  
3. Frontend bundle size optimization
4. Image optimization and lazy loading
5. Caching strategies

MONITORING FEATURES:
1. API performance metrics
2. Error tracking and logging
3. User analytics (privacy-focused)
4. Performance monitoring
5. Health check endpoints

STEPS:
1. Analyze current performance bottlenecks
2. Implement database query optimizations
3. Add API response caching where appropriate
4. Optimize frontend bundle splitting
5. Add performance monitoring middleware
6. Create comprehensive health check endpoint

SUCCESS CRITERIA:
- API response times under 200ms for most endpoints
- Frontend bundle size optimized
- Performance monitoring dashboard available
- Error tracking implemented
- Comprehensive logging for debugging

FILES TO MODIFY:
- apps/api/src/middleware/performance.ts (new file)
- apps/api/src/routes/health.ts (enhanced)
- apps/web/src/utils/analytics.ts (new file)
- apps/web/next.config.js (bundle optimization)

METRICS TO TRACK:
- API response times
- Database query performance  
- Frontend load times
- Error rates
- User engagement (privacy-focused)
```

---

## 📊 **UPDATED PROGRESS TRACKING**

After completing each task, run this verification:

```bash
# Check overall system status
cd apps/api && npm test                    # Test database environment
cd ../web && npm run build               # Production build verification  
curl http://localhost:8002/docs          # API documentation check
curl http://localhost:8002/health        # Health check verification

# Target metrics after all tasks:
# - Test environment: Database tests running successfully
# - Production build: Optimized and ready for deployment
# - GitHub Pages: Successfully deployed and functional
# - Real-time features: Working across multiple clients
# - Performance: Optimized response times and monitoring
```

---

## 🎯 **SESSION GUIDELINES**

**Work Order:**
1. Complete Task 1 (Database test environment) → Verify → Report
2. Complete Task 2 (Production optimization) → Verify → Report  
3. Complete Task 3 (GitHub Pages deployment) → Verify → Report
4. Complete Task 4 (Real-time features) → Verify → Report
5. Complete Task 5 (Performance monitoring) → Verify → Report

**After Each Task:**

```bash
# Verification commands based on task
# Task 1: npm test (verify database tests work)
# Task 2: NODE_ENV=production npm start (verify production build)  
# Task 3: Check deployed GitHub Pages URL
# Task 4: Test real-time features across browser tabs
# Task 5: Check performance metrics and monitoring
```

**Reporting Format:**

```
TASK [N] COMPLETED: [Task Name]
- Files modified: [list]
- Test results: [pass/fail counts]  
- Verification: [endpoints/features tested]
- Issues encountered: [any problems]
- Ready for next task: [yes/no]
```

---

## ⚠️ **FINAL REMINDERS**

- **NO GITHUB COMMITS** - Leave all changes uncommitted for manual review
- **FOCUSED SCOPE** - Only work on assigned tasks, ignore other "improvements"  
- **TEST VERIFICATION** - Always verify your changes don't break existing functionality
- **EXISTING PATTERNS** - Follow established code patterns and conventions
- **MINIMAL CHANGES** - Make the smallest possible changes to achieve objectives

**Current Repository State:** ✅ Critical issues resolved, API documentation complete, ready for production  
**Your Mission:** Complete production deployment, test environment, and advanced features for full production release

---

*Updated January 26, 2026 - Previous documentation and test priorities completed. Focus now on deployment, real-time features, and performance optimization.*
