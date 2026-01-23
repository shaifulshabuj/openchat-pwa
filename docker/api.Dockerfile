FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/api/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/api ./

# Generate Prisma client
RUN npm run db:generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 8000

# Start the application
CMD ["npm", "run", "start"]