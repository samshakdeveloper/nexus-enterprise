import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  cacheDir: path.resolve(__dirname, "node_modules/.vite"),
  test: {
    hookTimeout: 60_000,
    testTimeout: 30_000,
    // جستجوی تمام فایل‌های تست در کلیه پوشه‌های پروژه
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    // استثنا کردن پوشه‌های خروجی و پکیج‌ها
    exclude: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  },
});
