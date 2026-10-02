# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# کپی فایل‌های مدیریت پکیج‌های Monorepo
COPY package*.json ./
COPY apps/email-worker/package*.json ./apps/email-worker/
COPY packages/ ./packages/

COPY tsconfig.base.json ./    
# نصب تمام وابستگی‌ها
RUN npm ci

# کپی سورس‌کد ورکر
COPY apps/email-worker/ ./apps/email-worker/

# بیلد پروژه email-worker
RUN npm run build --workspace=apps/email-worker

# حذف devDependencies جهت سبک‌سازی ایمیج
RUN npm prune --production

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# ساخت کاربر غیر root برای امنیت بیشتر
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 workeruser

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/email-worker/dist ./dist
COPY --from=builder /app/apps/email-worker/package.json ./package.json

USER workeruser

CMD ["node", "dist/index.js"]