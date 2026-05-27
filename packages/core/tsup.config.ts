import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  splitting: false,
  sourcemap: true,
  treeshake: true,
});
