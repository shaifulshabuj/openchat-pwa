FROM node:20-alpine

# Install OpenSSL 3.x, curl, and required libraries for Prisma
# Let Alpine install the latest compatible OpenSSL version
RUN apk add --no-cache openssl openssl-dev curl libc6-compat

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Set environment variables for Prisma
ENV PRISMA_ENGINE_TYPE="binary"

# Generate Prisma client for Alpine Linux
RUN PRISMA_CLI_BINARY_TARGETS="linux-musl" npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "run", "start"]