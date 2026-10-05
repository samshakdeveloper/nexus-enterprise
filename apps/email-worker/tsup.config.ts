import { defineConfig } from "tsup";

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
