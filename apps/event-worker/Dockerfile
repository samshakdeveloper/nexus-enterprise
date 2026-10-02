# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# کپی فایل‌های مدیریت پکیج
COPY package*.json ./
COPY tsconfig.base.json ./

# کپی کامل کل پکیج‌های مشترک و ورکر جهت دسترسی به package.jsonهای داخلی
COPY packages/ ./packages/
COPY apps/event-worker/ ./apps/event-worker/

# نصب تمام وابستگی‌ها (شامل dev و prod)
RUN npm ci

# بیلد پروژه event-worker
RUN npm run build --workspace=apps/event-worker

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# ساخت کاربر غیر root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser

# کپی کامل node_modules و فایل‌های ساختار مونورپو جهت حفظ لینک‌ها
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/event-worker/dist ./dist
COPY --from=builder /app/apps/event-worker/package.json ./package.json

USER workeruser

CMD ["node", "dist/index.js"]