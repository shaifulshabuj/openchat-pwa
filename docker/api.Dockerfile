FROM node:20-alpine

# Install OpenSSL, curl, and required libraries for Prisma
RUN apk add --no-cache openssl openssl-dev curl libc6-compat

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Let Prisma auto-detect the correct engines for Alpine Linux
# This ensures compatibility with linux-musl architecture
ENV PRISMA_CLI_BINARY_TARGETS="linux-musl-openssl-3.0.x"

# Generate Prisma client with correct version for Alpine
RUN npx prisma@5.8.1 generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]