# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# کپی فایل‌های پیکربندی ریشه جهت نصب وابستگی‌های Monorepo
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/ ./packages/

COPY tsconfig.base.json ./    
# نصب تمام وابستگی‌ها
RUN npm ci

# کپی سورس‌کد کامل پروژه
COPY apps/api/ ./apps/api/

# بیلد پروژه Fastify/API
RUN npm run build --workspace=apps/api

# حذف وابستگی‌های توسعه (devDependencies) برای سبک‌سازی
RUN npm prune --production

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# اضافه کردن کاربر غیر root برای امنیت بیشتر
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

# کپی خروجی بیلد و node_modules خردشده از Stage قبلی
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

USER fastify

EXPOSE 3000

CMD ["node", "--import", "./dist/telemetry/tracing.js", "dist/main.js"]