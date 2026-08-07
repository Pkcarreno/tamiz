import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

/**
 * Vitest configuration for the Tamiz browser extension.
 *
 * jsdom supplies DOM globals (DOMRect, document) used by content-logic tests.
 * `WxtVitest()` is async — it boots WXT's config and returns Vite plugins that
 * alias `wxt/browser` to `@webext-core/fake-browser`, stub the `browser`/`chrome`
 * globals, wire up tsconfig path aliases, and enable auto-imports.
 *
 * The setup file (./tests/setup.ts) imports `fakeBrowser` directly, attaches
 * `vi.fn()` overlays for unimplemented APIs (contextMenus, downloads, scripting,
 * tabs.sendMessage), and registers a global `beforeEach(fakeBrowser.reset)` for
 * state isolation.
 */
export default defineConfig({
  plugins: [solid(), WxtVitest()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
});
