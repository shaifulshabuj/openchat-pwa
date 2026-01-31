# OpenChat Continuation Task Prompt (Copilot Standard)

You are continuing development for OpenChat PWA. Follow the steps below exactly.

## Context
- Spec: `@work_reports/00_SPECIFICATION_OPENCHAT_PWA.md`
- Feature checklist: `@work_reports/00_FEATURE_CHECKLIST.md`
- Project status log: `@work_reports/01_PROJECT_STATUS.md`

## Goal
Complete all remaining features in the checklist, aligned with the specification.

## Required Workflow
1. **Discover**
   - Read spec + checklist to identify remaining gaps.
   - Scan recent fixes in `@work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`.
2. **Plan**
   - Break work into small tasks (1–3 files each).
   - Assign to Codex CLI for implementation.
3. **Implement**
   - Use Codex CLI for each subtask.
   - Follow existing patterns and repo conventions.
4. **Verify (Mandatory)**
   - Run tests using Docker-based testing only.
   - Use Playwright MCP for UI verification.
   - Log Playwright runs to `.codex/works/test_log/YYMMDDHHMMSS_log_<testing item name>.md`.
5. **Document**
   - Update `@work_reports/01_PROJECT_STATUS.md` with latest status.
   - Update `@work_reports/02_LOCAL_TEST_REPORT.md` and `@work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` for tests and fixes.
   - Update `@work_reports/00_FEATURE_CHECKLIST.md` with ✅/⚠️/❌ statuses.
   - Update `@CHANGELOG.md` **only if explicitly requested**.

## Constraints
- Use Docker-based testing only (no local `pnpm`/`npm` build/run for tests).
- Do not change the spec file unless explicitly told.
- Keep changes focused and incremental.
- Always verify before marking tasks complete.
