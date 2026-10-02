# Stage 1: Base image
FROM node:22-alpine AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# Stage 3: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=apps/web

# Stage 4: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی کردن استندالون و استاتیک
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# شرطی کردن کپی پوشه public (اگر وجود داشته باشد کپی می‌کند، اگر نباشد ارور نمی‌دهد)
COPY --from=builder /app/apps/web/publi[c] ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "node apps/web/server.js -p ${PORT:-3000}"]