FROM node:20-alpine

# Install OpenSSL for Prisma compatibility
RUN apk update && apk add --no-cache openssl

WORKDIR /app

COPY apps/api/package.json ./package.json

RUN npm install

COPY apps/api ./

ENV PRISMA_ENGINE_TYPE="binary"

RUN PRISMA_CLI_BINARY_TARGETS="linux-musl" npm run db:generate

EXPOSE 8080

# Use dev server for local testing (sync schema on startup)
CMD ["sh", "-c", "npx prisma db push && npm run dev"]
