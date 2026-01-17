# Use Node.js LTS
FROM node:20-alpine

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl \
    openssl-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include dev dependencies for Prisma)
RUN npm ci

# Copy prisma schema first
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "src/index.js"]
