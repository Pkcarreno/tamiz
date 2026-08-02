import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ["linkedom"],
  },
  dts: true,
  entry: {
    cleaner: "src/cleaner.ts",
    converter: "src/converter.ts",
    dom: "src/dom.ts",
    "strategies/markdown": "src/strategies/markdown.ts",
    "strategies/raw": "src/strategies/raw.ts",
  },
  format: "esm",
  outDir: "dist",
  // ESM-only output uses .js + .d.mts to signal module format to consumers
  outExtensions: () => ({
    dts: ".d.mts",
    js: ".js",
  }),
  sourcemap: true,
});
