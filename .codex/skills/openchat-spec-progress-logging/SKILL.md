---
name: openchat-spec-progress-logging
description: "Spec-driven testing, progress tracking, and fix logging for OpenChat. Use when comparing the app to work_reports/00_SPECIFICATION_OPENCHAT_PWA.md and updating project status, checklists, or changelogs."
---

# OpenChat Spec Progress & Logging

## Workflow

1) Read spec and current status
- Spec: `work_reports/00_SPECIFICATION_OPENCHAT_PWA.md`
- Status: `work_reports/01_PROJECT_STATUS.md`
- Feature checklist: `work_reports/00_FEATURE_CHECKLIST.md`

2) Validate current state
- Cross-check implemented features vs spec.
- Mark items as ✅ / ⚠️ / ❌ with short, precise gaps.

3) Log progress and fixes
- Add a dated entry to `work_reports/01_PROJECT_STATUS.md` for new progress.
- Update `work_reports/00_FEATURE_CHECKLIST.md` for newly verified features.
- If bugs were fixed, add a dated entry to `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`.
- Update `CHANGELOG.md` only when user requests it explicitly.

## Output Rules

- Use concise, timestamped entries (include timezone).
- Avoid duplicating long descriptions across files; summarize once and reference.

## Outputs to Update

- `work_reports/01_PROJECT_STATUS.md`
- `work_reports/00_FEATURE_CHECKLIST.md`
- `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`
