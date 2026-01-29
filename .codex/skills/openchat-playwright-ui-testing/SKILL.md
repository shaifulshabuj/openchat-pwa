---
name: openchat-playwright-ui-testing
description: "UI-level testing for OpenChat using the Playwright MCP tool. Use when running browser-based flows, creating test users, or validating UI behavior against the spec."
---

# OpenChat Playwright UI Testing

## Workflow

1) Prep environment
- Ensure Web app is running (local Docker or `pnpm dev`).
- Use the latest test guidance in `.github/prompts/local_test_00_against_spec.md`.

2) Playwright MCP test pass
- Use Playwright MCP tool for navigation and interactions.
- Create 2–3 test users (email pattern: `test+<tag>@example.com`).
- Validate flows: register → login → contacts → request/accept → chat → reply → reactions → forward → block/unblock.
- Capture any UI/UX issues (layout, theming, errors).

3) Record findings and fixes
- Log test results in `work_reports/02_LOCAL_TEST_REPORT.md`.
- If fixes are applied, add a dated entry in `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`.

## Test Checklist (minimum)

- Authentication (register/login/logout)
- Contact request flow (send/accept/decline)
- Chat send/receive
- Reply + reactions
- Forward and copy
- Block/unblock
- Unread badge

## Outputs to Update

- `work_reports/02_LOCAL_TEST_REPORT.md`
- `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` (if fixes)
- `work_reports/01_PROJECT_STATUS.md` (if new progress)
