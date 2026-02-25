# Stage 1: Build Frontend
FROM node:20-slim AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Final Image
FROM node:20-slim
WORKDIR /app

# Install ping utility for the status checks
RUN apt-get update && apt-get install -y iputils-ping && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Create data directory structure
RUN mkdir -p data/backgrounds data/icons

EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

CMD ["node", "server/index.js"]
