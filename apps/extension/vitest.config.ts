import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the Tamiz browser extension.
 *
 * jsdom supplies DOM globals (DOMRect, document) used by content-logic tests,
 * and the setup file installs fake browser APIs plus fake indexedDB before
 * every test suite runs.
 */
export default defineConfig({
  plugins: [solid()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
