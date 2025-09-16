# syntax=docker/dockerfile:1

# Build stage: install dependencies and compile the server bundle
FROM node:22-alpine AS build

# Install dependencies in /app/server so relative imports resolve correctly
WORKDIR /app/server

# Install production and development dependencies
COPY server/package*.json ./
RUN npm ci

# Copy the server source code
COPY server/ ./
# Copy shared client code that provides type definitions used by the server build
COPY src/ ../src/

# Build the compiled bundle and trim dev dependencies
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build && \
    npm prune --omit=dev && \
    rm -rf .parcel-cache

# Runtime stage: copy the compiled application into a lean image
FROM node:22-alpine AS runtime
ENV NODE_ENV=production

WORKDIR /app

# Copy only the files required to run the server
COPY --from=build /app/server/package.json ./
COPY --from=build /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist

# The server binds to the port provided via the PORT environment variable.
# Azure App Service sets this automatically when running the container.
EXPOSE 3001

CMD ["node", "dist/main.js"]
