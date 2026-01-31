# OpenChat PWA Tech Stack Report

Last updated: 2026-01-31

This report is derived from repository configuration and source files in this workspace, including package.json files, Docker configs, API source, and documentation.

---

## 1) Frontend Tech (Next.js, React, UI, PWA)

### Core framework
- **Next.js 16.1.4** (App Router) with **React 19.2.3** and **React DOM 19.2.3**.
- **TypeScript** used for application source and types.
- **Static export support** via `next.config.ts` using `output: 'export'` when `STATIC_EXPORT=true` (for GitHub Pages).

### UI & styling
- **Tailwind CSS v4** (`@import "tailwindcss"` in `globals.css`).
- **Radix UI** components: avatar, dialog, dropdown-menu, tabs, toast.
- **Utility helpers**: `clsx`, `tailwind-merge`, `class-variance-authority`.
- **Icons**: `lucide-react`.
- **Animation**: `framer-motion`.

### State, data, and forms
- **TanStack React Query** for async data fetching and caching.
- **Zustand** for state management.
- **React Hook Form** + **@hookform/resolvers** for forms.
- **Zod** for schema validation.

### PWA features
- **Web App Manifest**: `apps/web/public/manifest.json` includes icons, theme colors, standalone display, scope, and start URL.
- **Service worker**: `apps/web/public/sw.js` provides **push notifications** and notification click handling. It handles install/activate events but does not implement offline caching.
- **Push notifications UI**: `PushNotificationManager.tsx` uses Push API, VAPID public key env, and subscription POSTs to the API.
- **Meta tags**: PWA-related metadata (`mobile-web-app-capable`, `apple-mobile-web-app-*`, theme colors) in `src/app/layout.tsx`.
- Note: There is no explicit service worker registration in the frontend source; registration may be handled elsewhere or expected to be added.

### Client storage & media
- **Dexie** for IndexedDB storage.
- **HEIC/HEIF conversion** via `heic2any`.
- **QR support**: `html5-qrcode` and `qrcode.react`.
- **Markdown rendering**: `react-markdown`.
- **Date handling**: `dayjs`.

---

## 2) Backend Tech (Node.js, Fastify, Auth, Real-time)

### Core runtime & framework
- **Node.js 20** (required by engines).
- **Fastify** as the primary HTTP framework (`apps/api/src/index.ts`).
- **CORS**, **Helmet**, **JWT**, and **Multipart** via Fastify plugins.
- **dotenv** for environment loading.

### Authentication & security
- **JWT-based auth**: `@fastify/jwt` for token signing/verification.
- **Password hashing**: `bcryptjs`.
- **Auth utilities** in `src/utils/auth.ts` and `authMiddleware` in `src/middleware/auth.ts`.
- **Rate limiting**: in-memory limiter in `src/middleware/security.ts` and `src/middleware/rateLimit.ts` (with warnings to use Redis in production).
- **Security headers** via `@fastify/helmet`.

### Real-time
- **Socket.IO** server with **Redis adapter** for scaling (`@socket.io/redis-adapter`).
- **Redis optional**: adapter is only enabled when `REDIS_URL` is set.
- Socket authentication uses JWT and user lookup in Prisma.
- Events include typing indicators, message broadcast, online status, and read receipts.

### File uploads & media processing
- **Multipart uploads** with Fastify.
- **Sharp** for image compression and thumbnails.
- Uploads stored on **local filesystem** under `UPLOAD_PATH` (default `./uploads`).

### API documentation
- **Swagger UI** HTML served at `/docs/ui` using `swagger-ui-express` with an OpenAPI JSON file (`src/docs/openapi.json`).
- JSON spec served at `/docs`.

---

## 3) Database & Storage (PostgreSQL, Redis, Prisma)

### Relational database
- **PostgreSQL 15** (Docker services for dev and test).
- **Prisma** ORM with **PostgreSQL datasource** (`prisma/schema.prisma`).
- Prisma models include User, Chat, Message, MessageReaction, MessageStatus, ChatAdmin, ChatInvitation, ChatParticipant.

### Caching / real-time scaling
- **Redis 7** (Docker) used for Socket.IO adapter and health checks.

### File storage
- **Local filesystem** storage for uploads; no external object storage configured in repo.

---

## 4) DevOps & Deploy (Docker, CI/CD, Hosting)

### Docker
- **Dockerfiles** for API and Web: `docker/api.Dockerfile`, `docker/web.Dockerfile`.
- **Test dockerfiles**: `docker/apiTest.Dockerfile`, `docker/webTest.Dockerfile`.
- **Docker Compose**:
  - `docker-compose.yml` for dev (Postgres, Redis, API, web).
  - `docker-compose.local-test.yml` for local test stack.
  - `docker-compose.test.yml` for test DB/Redis only.

### CI/CD (GitHub Actions)
- Workflow: `.github/workflows/ci-cd.yml`.
  - Installs pnpm, generates Prisma client, runs type checks and lint.
  - Tests are currently skipped with a TODO.
  - Builds frontend on main and uploads artifacts.
  - Deploys frontend to **GitHub Pages** (static export).
  - Deploys backend to **Railway** using Railway CLI.

### Hosting / deployment
- **Railway** for backend deployment (`railway.toml` uses Dockerfile build).
- **GitHub Pages** for frontend static export.

---

## 5) Development Tools (TypeScript, linting, testing, tooling)

### Monorepo tooling
- **pnpm** workspaces with **Turborepo** for task orchestration.
- Root scripts: `dev`, `build`, `lint`, `type-check`, `test`, `format`.

### Type checking & linting
- **TypeScript 5.x** across apps and packages.
- **ESLint** configured at root and in app packages (web lint currently defers to type-check).
- **Prettier** formatting (`.prettierrc.js` per repo guidelines).

### Testing
- **Vitest** for API tests (`apps/api/src/tests/*.test.ts`).
- Web app has no configured test runner in package.json.

### Other tooling
- **tsx** for TypeScript execution and watch in API dev.
- **Prisma CLI** for schema migrations and client generation.

---

## 6) Monitoring & Analytics

### Backend monitoring/logging
- **Fastify logger** enabled (verbose in dev, info level in prod).
- **Performance middleware** adds `x-response-time` header and logs slow requests (>200ms) in production.
- **Health endpoint** `/health` checks PostgreSQL and Redis connectivity.
- **Security logging** for suspicious requests (console-based; hooks for external monitoring are noted but not implemented).

### Frontend analytics & error handling
- **Lightweight analytics utility** (`src/utils/analytics.ts`) sending events/perf via `navigator.sendBeacon` to `NEXT_PUBLIC_ANALYTICS_ENDPOINT` when set.
- **React ErrorBoundary** with optional hook for error reporting (Sentry example comment).

### External monitoring (planned/ops)
- `docs/MULTI_ENVIRONMENT_SETUP.md` references **Railway logs**, **GitHub Actions**, and health checks for monitoring.
- No explicit third-party APM or analytics SDKs are installed in package.json at this time.

---

## Quick Reference: Key Dependencies by Area

### Frontend
- next, react, react-dom
- @tanstack/react-query, zustand
- tailwindcss, @tailwindcss/postcss
- radix UI components, lucide-react
- react-hook-form, zod
- framer-motion, dexie, dayjs
- socket.io-client

### Backend
- fastify, @fastify/cors, @fastify/helmet, @fastify/jwt, @fastify/multipart
- socket.io, @socket.io/redis-adapter, redis
- prisma, @prisma/client, pg
- bcryptjs, jsonwebtoken
- sharp, multer (dependency present), dotenv
- swagger-ui-express

---

## Notable Gaps / TODOs (from code and configs)
- CI currently **skips tests** in GitHub Actions (see `ci-cd.yml`).
- **Service worker registration** is not found in the web source (service worker file exists).
- Security rate limiter uses **in-memory store**; notes suggest Redis-backed limiter for production.
- No configured **third-party monitoring/analytics** SDKs (Sentry/Datadog etc.) in dependencies.
