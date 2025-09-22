# Use official Node.js runtime as the base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY next.config.js ./

# Install TypeScript and build dependencies temporarily
RUN npm install --only=dev typescript @types/node

# Build the application
RUN npm run build

# Remove development dependencies to reduce image size
RUN npm prune --production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Define the command to run the application
CMD ["npm", "start"]

# Metadata
LABEL maintainer="Ojitha Rajapaksha <ojitha@echanneling.com>"
LABEL version="1.0.0"
LABEL description="eChanneling Corporate Agent Module Backend Service"