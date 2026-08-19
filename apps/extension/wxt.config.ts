import { existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

const RE_TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

export default defineConfig({
  autoIcons: {
    baseIconPath: "assets/icon.svg",
  },
  hooks: {
    "build:manifestGenerated": (wxt, manifest) => {
      if (wxt.config.browser === "firefox") {
        manifest.browser_specific_settings = {
          gecko: {
            id: "tamiz@pkcarreno.dev",
            strict_min_version: "109.0",
          },
        };
      }
    },
    "entrypoints:found": (_wxt, entrypointInfos) => {
      // WXT's glob patterns (*.test.ts) match colocated test files as
      // entrypoints. Filter them out before the duplicate-name check runs.
      for (let i = entrypointInfos.length - 1; i >= 0; i -= 1) {
        if (RE_TEST_FILE.test(entrypointInfos[i].inputPath)) {
          entrypointInfos.splice(i, 1);
        }
      }
    },
  },
  manifest: {
    action: {
      default_icon: {
        "16": "icons/16.png",
        "32": "icons/32.png",
      },
    },
    /** Keyboard shortcut that mirrors a toolbar-icon click via the reserved
     * `_execute_action` command. Alt+Shift+G (Grab) avoids conflicts with
     * common browser shortcuts on all platforms. */
    commands: {
      _execute_action: {
        description: "Toggle element picker",
        suggested_key: { default: "Alt+Shift+G", mac: "Alt+Shift+G" },
      },
    },
    name: "Tamiz",
    permissions: ["activeTab", "contextMenus", "scripting", "downloads"],
    web_accessible_resources: [
      {
        resources: ["main-world.js"],
        matches: ["<all_urls>"],
      },
    ],
  },
  modules: ["@wxt-dev/module-solid", "@wxt-dev/auto-icons"],
  srcDir: "src",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      {
        enforce: "post",
        name: "shadow-dom-root-selector",
        transformCSS(css) {
          return css.replaceAll(":root", ":host");
        },
      },
      {
        buildStart() {
          const iconSource = resolve(process.cwd(), "src/assets/icon.svg");
          if (!existsSync(iconSource)) {
            throw new Error(
              `[tamiz] build failed: icon source not found at ${iconSource}. src/assets/icon.svg is the single source of truth for all extension icons.`
            );
          }
        },
        // auto-icons 1.x only warns (and skips generation) when its base icon
        // is missing; the spec requires a hard build failure so a missing
        // canonical `src/assets/icon.svg` is caught early, not shipped silently.
        enforce: "pre",
        name: "tamiz-assert-icon-source",
      },
    ],
  }),
});
