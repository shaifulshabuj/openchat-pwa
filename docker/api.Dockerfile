FROM node:20-alpine

# Install OpenSSL 3.x, curl, and required libraries for Prisma
# Use specific OpenSSL package that Prisma recognizes
RUN apk add --no-cache openssl=3.1.4-r5 openssl-dev curl libc6-compat

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Set environment variables for Prisma client generation
# Force Prisma to use the correct OpenSSL version for Alpine Linux 3.18
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x,native"
ENV PRISMA_ENGINE_TYPE="binary"
ENV OPENSSL_ROOT_DIR="/usr"
ENV OPENSSL_LIBRARIES="/usr/lib"

# Generate Prisma client with explicit OpenSSL 3.0 target
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]