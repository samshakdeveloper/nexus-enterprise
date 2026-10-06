import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import unicorn from "eslint-plugin-unicorn";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  // ۱. نادیده گرفتن فایل‌های Build و موقت
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/*.config.ts", // نادیده گرفتن تمام فایل‌های کانفیگ مثل tsup.config.ts
      "**/*.config.js",
      "**/test/**",
      "**/*.config.js",
      "**/*.config.mjs",
    ],
  },

  // ۲. کانفیگ پایه JS و TypeScript با قابلیت Type-Checking کامل
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,

  // ۳. کانفیگ پارسر و پروژه تایپ‌اسکریپت برای کل Monorepo
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      boundaries,
      unicorn,
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json", "./apps/*/tsconfig.json", "./packages/*/tsconfig.json"],
        },
      },
      "boundaries/elements": [
        { type: "domain", pattern: "packages/domain" },
        { type: "application", pattern: "packages/application" },
        { type: "infrastructure", pattern: "packages/infrastructure" },
        { type: "shared", pattern: "packages/shared" },
        { type: "app", pattern: "apps/*" },
      ],
    },
    rules: {
      // ----------------------------------------------------
      // قوانین کنترل وابستگی بین لایه‌ها (Clean Architecture Boundary Rules)
      // ----------------------------------------------------
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "domain", allow: ["shared"] },
            { from: "application", allow: ["domain", "shared"] },
            { from: "infrastructure", allow: ["application", "domain", "shared"] },
            { from: "shared", allow: [] },
            { from: "app", allow: ["infrastructure", "application", "domain", "shared"] },
          ],
        },
      ],

      // ----------------------------------------------------
      // قوانین عمومی کدنویسی اینترپرایز
      // ----------------------------------------------------
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],

      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],

      "unicorn/prevent-abbreviations": "off",
      "unicorn/null-check": "off",
    },
  },

  // ۴. Override مخصوص برنامه‌های App (Fastify/Next.js)
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
    },
  },
);
