# --- Build + run the Stardle Node/Express app on Cloud Run ---
FROM node:20-slim

WORKDIR /app

# Install deps (need dev deps to build with vite/esbuild)
COPY package*.json ./
RUN npm ci

# Copy source and build the client (vite) + server bundle (esbuild)
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Cloud Run provides PORT (defaults to 8080); server.ts reads it.
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
