# Local Test: Uncommitted Changes Validation

## Context
This prompt initiates testing of the latest uncommitted changes in the repository. The goal is to validate changes before committing to ensure code quality and functionality.

## Objective
Test uncommitted changes locally, review for correctness, document findings, and determine commit readiness.

## References
- Project Status: `./work_reports/01_PROJECT_STATUS.md`
- Test Report: `./work_reports/02_LOCAL_TEST_REPORT.md`
- Commit Checklist: `./work_reports/03_READY_TO_COMMIT.md`

## Tasks

### 1. Analyze Uncommitted Changes
- Get git diff of all uncommitted changes
- Review code changes for:
  - Code quality and best practices
  - Potential bugs or issues
  - Breaking changes
  - Missing tests or documentation
  - Consistency with project patterns

### 2. Run Local Tests
- Start the development environment:
  - Install dependencies if needed: `pnpm install`
  - Start backend API: `cd apps/api && pnpm dev`
  - Start frontend: `cd apps/web && pnpm dev`
- Test all modified functionality:
  - Manual testing of changed features
  - Automated tests if available: `pnpm test`
  - Linting: `pnpm lint`
  - Type checking: `pnpm type-check`

### 3. Document Test Results
- Update `./work_reports/02_LOCAL_TEST_REPORT.md` with:
  - Summary of changes tested
  - Test results for each change
  - Issues discovered (if any)
  - Suggested fixes (if needed)
  - Screenshots or logs (if relevant)

### 4. Decision Path

#### If Tests Pass:
- Update `./work_reports/01_PROJECT_STATUS.md` with latest status
- Update `./work_reports/02_LOCAL_TEST_REPORT.md` with successful test results
- Create/update `./work_reports/03_READY_TO_COMMIT.md` with:
  - List of files ready to commit
  - Summary of changes
  - Confirmation that all tests pass
  - Recommended commit message

#### If Tests Fail:
- Update `./work_reports/02_LOCAL_TEST_REPORT.md` with:
  - Detailed failure information
  - Root cause analysis
  - Specific fixes needed
  - Priority of fixes
- DO NOT update `03_READY_TO_COMMIT.md` until issues are resolved

## Success Criteria
- [ ] All uncommitted changes reviewed
- [ ] Local testing completed
- [ ] Test results documented
- [ ] Project status updated
- [ ] Commit readiness determined
- [ ] Issues documented with fixes (if any)

## Output Format
- Updated test report with clear pass/fail status
- Updated project status reflecting current state
- READY_TO_COMMIT file only if all tests pass
