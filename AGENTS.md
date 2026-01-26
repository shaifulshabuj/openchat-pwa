# Repository Guidelines

## Project Structure & Module Organization
This is a pnpm/Turborepo monorepo. Core paths:
- `apps/web/`: Next.js PWA frontend (`src/`, `public/`, `app/` routes).
- `apps/api/`: Fastify/Socket.io backend (`src/`, `prisma/`, `src/tests/`).
- `packages/`: shared code (`ui/`, `config/`, `types/`).
- `docs/`, `docker/`, `docker-compose.yml`: documentation and container setup.

## Build, Test, and Development Commands
Run from repo root unless noted:
- `pnpm dev`: start all apps via Turborepo.
- `pnpm build`: build all apps/packages.
- `pnpm test`: run workspace tests (API uses Vitest).
- `pnpm lint`: run lint tasks (web lint delegates to `pnpm type-check`).
- `pnpm type-check`: TypeScript type checks across workspaces.
- `pnpm format`: Prettier formatting for TS/JS/JSON/MD.
For containers: `docker-compose up` starts Postgres, Redis, API, and web dev servers.

## Coding Style & Naming Conventions
Formatting is enforced by Prettier (`.prettierrc.js`): 2-space indent, single quotes, no semicolons, 100-char line width. TypeScript is the default across `apps/` and `packages/`. Use descriptive filenames aligned with feature (`ChatList.tsx`, `messageStatus.ts`).

## Testing Guidelines
API tests live in `apps/api/src/tests/` and run with Vitest (`pnpm --filter openchat-api test`). Test files use `*.test.ts` naming. No web test framework is configured yet; prefer adding unit tests alongside new API routes or services.

## Commit & Pull Request Guidelines
Recent commits follow Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `chore:`), sometimes with an emoji prefix (e.g., `🔧 Fix ...`). Keep commits scoped and descriptive. PRs should include:
- a short summary and testing notes,
- linked issues (if any),
- screenshots/GIFs for UI changes in `apps/web/`.

## Security & Configuration Tips
Local env setup uses example files: `apps/web/.env.example` → `apps/web/.env.local`, `apps/api/.env.example` → `apps/api/.env`. Do not commit secrets; use `.env` files and `docker-compose.yml` defaults for local dev.
