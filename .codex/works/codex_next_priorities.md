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

---

## 🎯 **PRIORITY TASK 1: Complete Database Test Environment Setup**

**Current Status:** Tests created but require running database to execute  
**Target:** Set up test database environment for complete test verification  

**Instructions:**

```bash
TASK: Setup test database environment to run all tests successfully

CURRENT ISSUE: 
- Tests fail with "Can't reach database server at localhost:5432"
- Need PostgreSQL test environment or alternative approach

SOLUTION OPTIONS:
1. Setup local PostgreSQL test database
2. Use test database with Docker Compose  
3. Implement in-memory database for tests
4. Mock database interactions for unit tests

RECOMMENDED APPROACH:
Use docker-compose test environment for integration testing

STEPS:
1. Check if docker-compose.yml has test database setup
2. Create test database environment using Docker
3. Configure test DATABASE_URL for test environment
4. Ensure tests can run independently with clean database
5. Run all test suites to verify functionality

SUCCESS CRITERIA:
- All tests can execute without database connection errors
- Read receipts tests: 12/12 passing ✅
- Message CRUD tests: 8/8 passing ✅  
- Full test suite achieves 80%+ pass rate

FILES TO INVESTIGATE:
- docker-compose.yml (test database services)
- apps/api/.env.example (test database configuration)
- apps/api/src/tests/*.test.ts (test database requirements)

FILES TO MODIFY:
- Test environment configuration files
- Docker setup if needed
```

---

## 🎯 **PRIORITY TASK 2: Optimize Production Build Process**

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

## 🎯 **PRIORITY TASK 3: Add OpenAPI Documentation**

**Current Status:** No API documentation  
**Target:** Create comprehensive OpenAPI spec for all endpoints  

**Instructions:**

```bash
TASK: Create OpenAPI/Swagger documentation for the API

CREATE FILE: apps/api/src/docs/openapi.yaml

DOCUMENT ALL ENDPOINTS:
- POST /api/auth/login
- POST /api/auth/register  
- GET /api/auth/profile
- GET /api/chats
- POST /api/chats/:chatId/messages
- PUT /api/chats/:chatId/messages/:messageId
- DELETE /api/chats/:chatId/messages/:messageId
- POST /api/reactions/add
- GET /api/reactions/:messageId
- DELETE /api/reactions/remove
- POST /api/message-status/mark-read
- GET /api/message-status/:messageId/read-by

INCLUDE FOR EACH ENDPOINT:
- Request/response schemas
- Authentication requirements
- Example requests/responses
- Error response formats
- Status codes

REFERENCE EXISTING API:
- Check actual route files in apps/api/src/routes/
- Use exact response formats from working API
- Include authentication patterns (JWT Bearer)

SUCCESS CRITERIA:
- Complete OpenAPI 3.0 spec created
- All current endpoints documented
- Request/response examples included
- Ready for Swagger UI integration

FILES TO CREATE:
- apps/api/src/docs/openapi.yaml (new file)

FILES TO REFERENCE (READ ONLY):
- apps/api/src/routes/*.ts (for endpoint details)
```

---

## 🎯 **PRIORITY TASK 4: Add Swagger UI Integration**

**Current Status:** OpenAPI spec created (from Task 3)  
**Target:** Integrate Swagger UI for interactive API documentation  

**Instructions:**

```bash
TASK: Add Swagger UI endpoint to serve API documentation

STEPS:
1. Install swagger-ui-express: npm install swagger-ui-express @types/swagger-ui-express
2. Create endpoint in apps/api/src/routes/docs.ts
3. Serve OpenAPI spec at GET /docs
4. Add interactive Swagger UI at GET /docs/ui

IMPLEMENTATION:
- Mount at /docs and /docs/ui routes
- Serve the openapi.yaml created in Task 3
- Ensure it works with current FastifyInstance setup
- Follow existing route registration patterns

SUCCESS CRITERIA:
- GET /docs returns OpenAPI spec JSON
- GET /docs/ui shows interactive Swagger interface
- All endpoints testable through Swagger UI
- Follows existing Fastify routing patterns

FILES TO MODIFY:
- apps/api/src/routes/docs.ts (enhance existing or create)
- apps/api/src/index.ts (register docs routes)
- apps/api/package.json (add dependencies)

CONSTRAINTS:
- Don't break existing /health endpoint
- Follow Fastify plugin patterns
- Use existing authentication middleware
```

---

## 🎯 **PRIORITY TASK 5: Optimize Test Performance**

**Current Status:** Tests run in ~1s but could be optimized  
**Target:** Improve test performance and add test utilities  

**Instructions:**

```bash
TASK: Optimize test suite performance and add test utilities

OPTIMIZATIONS:
1. Create shared test utilities for common operations
2. Optimize database setup/teardown between tests
3. Add test data factories for consistent test data
4. Parallelize test execution where safe

CREATE FILES:
- apps/api/src/tests/utils/testHelpers.ts
- apps/api/src/tests/utils/testFactories.ts
- apps/api/src/tests/setup.ts

SHARED UTILITIES TO CREATE:
- createTestUser() helper
- createTestChat() helper  
- createTestMessage() helper
- clearTestData() helper
- getAuthToken() helper

SUCCESS CRITERIA:
- Test utilities reduce code duplication
- All tests still pass with shared utilities
- Test run time maintained or improved
- Consistent test data patterns

FILES TO CREATE:
- apps/api/src/tests/utils/ (new directory)
- Test utility files

FILES TO MODIFY:
- Existing test files to use new utilities (optional optimization)
```

---

## 📊 **PROGRESS TRACKING**

After completing each task, run this verification:

```bash
# Check overall test status
cd apps/api && npm test

# Target metrics:
# - Test pass rate: 80%+ (current: 65%)
# - Read receipts: 100% passing  
# - Message CRUD: 100% passing
# - API documentation: Available at /docs
# - Test performance: Maintained or improved
```

---

## 🎯 **SESSION GUIDELINES**

**Work Order:**
1. Complete Task 1 (Read receipts tests) → Verify → Report
2. Complete Task 2 (Message CRUD tests) → Verify → Report  
3. Complete Task 3 (OpenAPI docs) → Verify → Report
4. Complete Task 4 (Swagger UI) → Verify → Report
5. Complete Task 5 (Test optimization) → Verify → Report

**After Each Task:**

```bash
# Verification commands
npm test                    # Ensure tests still pass
npm run type-check         # Ensure no TypeScript errors  
pnpm build                 # Ensure build still works
```

**Reporting Format:**

```TASK [N] COMPLETED: [Task Name]
- Files modified: [list]
- Test results: [pass/fail counts]
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

**Current Repository State:** All critical issues resolved, production-ready codebase  
**Your Mission:** Complete these final enhancements to achieve 80%+ test coverage and full API documentation

---

*These instructions are optimized for efficiency and focused delivery. Stick to the specified tasks and avoid scope creep.*
