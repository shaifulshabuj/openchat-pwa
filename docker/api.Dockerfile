FROM node:20-alpine

# Install OpenSSL 3.x, curl, and required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev curl libc6-compat

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Set environment variables for Prisma client generation
# Force Prisma to use openssl-3.0.x for Alpine Linux
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"
ENV PRISMA_ENGINE_TYPE="binary"

# Generate Prisma client with explicit OpenSSL 3.0 target
RUN npx prisma generate --generator client

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]