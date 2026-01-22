FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY apps/web/package.json ./
COPY package.json ./package.json

# Install dependencies
RUN npm install

# Copy source code
COPY apps/web ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]