import { existsSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

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
        // Firefox reads `theme_icons` at the manifest top level as light/dark
        // icon pairs per size. WXT's auto-discovery writes them under `action`,
        // which is stripped for MV2, so set top-level theme_icons explicitly.
        // The @wxt-dev/browser types omit this Firefox-only key, so the
        // manifest is widened (no `any`).
        const ffManifest = manifest as typeof manifest & {
          browser_action?: { default_icon?: Record<string, string> };
          theme_icons?: Array<{ dark: string; light: string; sizes: string }>;
        };
        ffManifest.theme_icons = [
          { dark: "icon-dark-16.png", light: "icon-light-16.png", sizes: "16" },
          { dark: "icon-dark-32.png", light: "icon-light-32.png", sizes: "32" },
        ];
        if (ffManifest.browser_action) {
          ffManifest.browser_action.default_icon = {
            "16": "icons/16.png",
            "32": "icons/32.png",
          };
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
    name: "Tamiz",
    permissions: ["activeTab", "contextMenus", "scripting", "downloads"],
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
