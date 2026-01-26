# Codex Work Progress and Reply

## Progress Summary
- Updated read receipts tests to align with current API responses and sender read behavior: `apps/api/src/tests/read-receipts.test.ts`.
- Updated message delete test expectations to match API response payload: `apps/api/src/tests/message-crud.test.ts`.
- Added OpenAPI spec (JSON-formatted YAML) for required endpoints: `apps/api/src/docs/openapi.yaml`.
- Wired docs routes to serve spec at `/docs` and Swagger UI at `/docs/ui`: `apps/api/src/routes/docs.ts`.
- Added Swagger UI dependencies to API package manifest: `apps/api/package.json`.
- Added test utility scaffolding (helpers/factories/setup): `apps/api/src/tests/utils/testHelpers.ts`, `apps/api/src/tests/utils/testFactories.ts`, `apps/api/src/tests/setup.ts`.

## Blocking Issue
- Environment is running Node `v14.13.1`. Tests and npm install fail because the repo expects Node 20+.
- `npm install swagger-ui-express @types/swagger-ui-express` failed during Prisma postinstall due to unsupported Node (syntax error on `??=`).
- `npx vitest run src/tests/read-receipts.test.ts --reporter=verbose` failed because `node:timers/promises` is not available in Node 14.

## What To Do Next
1. Switch to Node 20+ (or 22+) and re-run dependency install in `apps/api`:
   ```bash
   cd apps/api
   npm install
   ```
2. Re-run tests:
   ```bash
   npx vitest run src/tests/read-receipts.test.ts --reporter=verbose
   npx vitest run src/tests/message-crud.test.ts --reporter=verbose
   ```
3. Run verification commands if needed:
   ```bash
   npm test
   npm run type-check
   pnpm build
   ```

## Notes
- OpenAPI docs are served at `/docs` (JSON) and `/docs/ui` (Swagger UI).
- The API route for current profile is `/api/auth/me` (not `/api/auth/profile`).
