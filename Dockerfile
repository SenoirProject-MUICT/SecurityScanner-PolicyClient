# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 3000
# -s: SPA mode (fallback to index.html for client-side routes)
CMD ["serve", "-s", "dist", "-l", "3000"]
