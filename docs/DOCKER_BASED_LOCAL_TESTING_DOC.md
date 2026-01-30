# Docker-Based Local Testing

This guide runs the API + Web in Docker using the test Postgres/Redis services and the test Dockerfiles.

## Prerequisites
- Docker Desktop (or Docker Engine) running locally.
- Ports free: `3000`, `8080`, `5433`, `6380`.

## 1) Build and run API + Web (includes Postgres + Redis)

```bash
docker compose -f docker-compose.local-test.yml up --build -d
```

Dockerfiles used:
- `docker/apiTest.Dockerfile`
- `docker/webTest.Dockerfile`

Services:
- API: `http://localhost:8080`
- Web: `http://localhost:3000`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

## 2) Run API tests inside the container

```bash
docker compose -f docker-compose.local-test.yml exec api npm test
```

## 3) Run lint/type-check/build inside containers (optional)

```bash
# API
docker compose -f docker-compose.local-test.yml exec api npm run lint
docker compose -f docker-compose.local-test.yml exec api npm run type-check

# Web
docker compose -f docker-compose.local-test.yml exec web npm run lint
docker compose -f docker-compose.local-test.yml exec web npm run type-check
docker compose -f docker-compose.local-test.yml exec web npm run build
```

## 4) Stop containers

```bash
docker compose -f docker-compose.local-test.yml down
```

## Troubleshooting

### Build fails copying node_modules
If you see errors like “cannot replace ... node_modules ... with file”, ensure `.dockerignore` excludes `node_modules` and rebuild:

```bash
docker builder prune -f
docker compose -f docker-compose.local-test.yml up --build -d
```

### npm ERESOLVE / peer dependency conflicts
The web Dockerfiles use `npm install --legacy-peer-deps` to bypass peer conflicts (React 19 vs older peer ranges).
If you still see ERESOLVE errors, rebuild with a clean cache:

```bash
docker builder prune -f
docker compose -f docker-compose.local-test.yml up --build -d
```

### Prisma P3005 on non-empty DB
If you see `P3005` (schema not empty) during startup, ensure the API test Dockerfile runs `prisma db push` (current default). Rebuild the API container:

```bash
docker compose -f docker-compose.local-test.yml build --no-cache api
docker compose -f docker-compose.local-test.yml up -d
```

## Notes
- The API container uses `DATABASE_URL` and `REDIS_URL` pointing to the local test services.
- The Web container uses `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` pointing to `localhost:8080`.
- The API test container runs `prisma db push` on startup to keep the schema in sync.
- If Docker socket permissions fail, ensure Docker Desktop is running and your user has access.
