FROM oven/bun:1.4.4-slim AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile --filter api

FROM oven/bun:1.4.4-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/ ./
COPY apps/api/src ./apps/api/src
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
WORKDIR /app/apps/api
USER bun
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
