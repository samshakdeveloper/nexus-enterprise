import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { Redis } from "ioredis";

export interface IdempotencyPluginOptions {
  redis?: Redis; // حالا بدون مشکل به عنوان تایپ شناخته میشه
  ttlInSeconds?: number;
  headerName?: string;
  enforcedMethods?: string[];
}

interface CachedResponse {
  status: "processing" | "completed";
  statusCode?: number;
  body?: unknown;
}

export const idempotencyPlugin = fp<IdempotencyPluginOptions>((app: FastifyInstance, opts) => {
  const HEADER = opts.headerName?.toLowerCase() ?? "idempotency-key";
  const TTL = opts.ttlInSeconds ?? 86400; // پیش‌فرض ۲۴ ساعت
  const METHODS = opts.enforcedMethods ?? ["POST", "PUT", "PATCH", "DELETE"];

  // استفاده از Redis در صورت وجود، وگرنه کش در حافظه با ساختار TTL بیسیک
  const redis = opts.redis;
  const inMemoryCache = new Map<string, { data: CachedResponse; expiresAt: number }>();

  // ساخت کلید یکتا برای هر کاربر/مسیر جهت جلوگیری از تداخل امنیت
  const buildScopedKey = (req: FastifyRequest, rawKey: string): string => {
    const userId = req.user?.id ?? req.ip;
    const route = req.routeOptions.url || req.url;
    return `idempotency:${userId}:${route}:${rawKey}`;
  };

  // Helperهای دسترسی به کش (Redis / Memory)
  const getCache = async (key: string): Promise<CachedResponse | null> => {
    if (redis) {
      const val = await redis.get(key);
      // 🟢 اضافه کردن as CachedResponse جهت جلوگیری از no-unsafe-return
      return val ? (JSON.parse(val) as CachedResponse) : null;
    }
    const item = inMemoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      inMemoryCache.delete(key);
      return null;
    }
    return item.data;
  };

  const setCache = async (key: string, value: CachedResponse, ttl: number): Promise<void> => {
    if (redis) {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } else {
      inMemoryCache.set(key, { data: value, expiresAt: Date.now() + ttl * 1000 });
    }
  };

  const deleteCache = async (key: string): Promise<void> => {
    if (redis) {
      await redis.del(key);
    } else {
      inMemoryCache.delete(key);
    }
  };

  // ۱. هوک بررسی و قفل‌گذاری همزمانی (onRequest)
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!METHODS.includes(request.method)) return;

    const rawKey = request.headers[HEADER] as string | undefined;
    if (!rawKey) return;

    const cacheKey = buildScopedKey(request, rawKey);
    request.keyData = { cacheKey }; // ذخیره کلید در Context درخواست

    const cached = await getCache(cacheKey);

    if (cached) {
      // الف) اگر درخواست در حال پردازش توسط یک آسنکرون دیگر است (Race Condition Guard)
      if (cached.status === "processing") {
        return reply.status(409).send({
          statusCode: 409,
          error: "Conflict",
          message: "A request with this Idempotency-Key is currently being processed. Please wait.",
        });
      }

      // ب) اگر قبلاً کامل شده، جواب قبلی بازگردانده می‌شود
      if (cached.status === "completed" && cached.statusCode) {
        reply.header("x-idempotent-replay", "true");
        return reply.status(cached.statusCode).send(cached.body);
      }
    }

    // ج) قفل کردن کلید برای ریکوئست‌های همزمان (به مدت ۶۰ ثانیه موقت)
    await setCache(cacheKey, { status: "processing" }, 60);
  });

  // ۲. هوک ذخیره پاسخ نهایی (onSend)
  app.addHook("onSend", async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const cacheKey = request.keyData?.cacheKey;
    if (!cacheKey) return payload;

    // اگر خطای داخلی ۵xx داد، قفل رو پاک می‌کنیم تا کاربر بتونه دوباره تلاش کنه (Retryable)
    if (reply.statusCode >= 500) {
      await deleteCache(cacheKey);
      return payload;
    }

    let parsedBody: unknown = payload;
    if (typeof payload === "string") {
      try {
        parsedBody = JSON.parse(payload);
      } catch {
        /* غیر JSON */
      }
    }

    // ذخیره پاسخ موفق و وضعیت Completed با TTL کامل
    const cacheData: CachedResponse = {
      status: "completed",
      statusCode: reply.statusCode,
      body: parsedBody,
    };

    await setCache(cacheKey, cacheData, TTL);
    return payload;
  });
});

// ۱. تعریف اینترفیس کاربر (مطابق با دیتای Auth برنامه‌ت)
export interface RequestUser {
  id: string;
  [key: string]: unknown;
}

// ۲. توسعه دادن تایپ‌های Fastify
declare module "fastify" {
  interface FastifyRequest {
    user?: RequestUser; // <--- مشکل Property 'user' رو حل می‌کنه
    keyData?: { cacheKey: string };
  }
}
