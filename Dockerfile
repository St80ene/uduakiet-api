# ------------------------------------------------------------------
# Stage 1: Build the app
# ------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install build tools for native modules if anything needs them during build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------------
# Stage 2: Run the production image
# ------------------------------------------------------------------
FROM node:20-bookworm-slim AS production

WORKDIR /app

COPY package*.json ./

# Copy the entire node_modules from builder (avoids running npm install again)
COPY --from=builder /app/node_modules ./node_modules

# Copy the compiled NestJS build artifacts
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "run", "start:prod"]