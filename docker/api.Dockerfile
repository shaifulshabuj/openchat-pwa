FROM node:20-alpine

# Install OpenSSL and curl for Prisma and health checks
RUN apk add --no-cache openssl openssl-dev curl

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Set Prisma to use correct OpenSSL for Alpine
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/@prisma/engines/libquery_engine-linux-musl-openssl-3.0.x.so.node
ENV PRISMA_QUERY_ENGINE_BINARY=/app/node_modules/@prisma/engines/query-engine-linux-musl-openssl-3.0.x
ENV OPENSSL_CONF=""

# Generate Prisma client with correct version
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