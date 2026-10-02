import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/main.ts", "src/telemetry/tracing.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  dts: false,
  // این دو خط مشکل را حل می‌کنند:
  skipNodeModulesBundle: true, // عدم باندل کردن node_modules درون main.js
  external: ["pg", "pg-native"], // استثنا کردن مستقیم پکیج pg
  // 👈 این خط تمام وابستگی‌های داخلی مونورپو را داخل بیلد api می‌آورد
  noExternal: ["@nexus/domain", "@nexus/application", "@nexus/infrastructure", "@nexus/shared"],
});
