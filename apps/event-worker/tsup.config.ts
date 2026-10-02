import { defineConfig } from "tsup";

// event-worker در runtime پکیج‌های workspace (@nexus/*) را import می‌کند و main آن‌ها به src/*.ts اشاره دارد
// (نه dist). پس باید مثل api داخل bundle بیایند؛ وگرنه ایمیج با ERR_MODULE_NOT_FOUND کرش می‌کند.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  clean: true,
  sourcemap: true,
  dts: false,
  skipNodeModulesBundle: true,
  external: ["pg", "pg-native"],
  noExternal: ["@nexus/domain", "@nexus/application", "@nexus/infrastructure", "@nexus/shared"],
});
