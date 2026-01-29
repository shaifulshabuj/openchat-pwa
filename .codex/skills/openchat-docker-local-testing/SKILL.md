---
name: openchat-docker-local-testing
description: "Docker-based local testing setup for OpenChat PWA. Use when building or troubleshooting docker-compose.local-test.yml or apiTest/webTest Dockerfiles, or when documenting local Docker testing workflows."
---

# OpenChat Docker Local Testing

## Workflow

1) Validate Docker test stack files
- Confirm `docker-compose.local-test.yml` and `docker-compose.test.yml` exist.
- Verify Dockerfiles for test images: `docker/apiTest.Dockerfile`, `docker/webTest.Dockerfile`.
- Ensure `.dockerignore` excludes `node_modules`, `.next`, `dist`, and logs.

2) Build and run local test stack
- Build: `docker compose -f docker-compose.local-test.yml build --no-cache` when troubleshooting.
- Run: `docker compose -f docker-compose.local-test.yml up -d`.
- Check logs: `docker compose -f docker-compose.local-test.yml logs -f web api`.

3) Common failure fixes
- If `next: not found`, verify Dockerfile copies `apps/web/package.json` and installs deps inside container.
- If npm peer conflicts (React 19), use `npm install --legacy-peer-deps` in web test Dockerfile.
- If COPY errors on `node_modules`, confirm `.dockerignore` includes `node_modules`.

4) Document updates
- Update `docs/DOCKER_BASED_LOCAL_TESTING_DOC.md` with new commands and known issues.
- Add a dated entry to `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md` for fixes.

## Outputs to Update

- `docs/DOCKER_BASED_LOCAL_TESTING_DOC.md`
- `work_reports/02_LOCAL_TEST_THEN_FIX_LOG.md`
- `work_reports/01_PROJECT_STATUS.md` (if behavior changes)

## Quality Gate

- Containers for API and Web start without errors.
- Web is reachable at `http://localhost:3000` and API at `http://localhost:4000` (or configured ports).
- Logs show no fatal errors after startup.
