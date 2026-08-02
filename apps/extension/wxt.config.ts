import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

export default defineConfig({
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
  },
  manifest: {
    permissions: ["activeTab", "scripting"],
  },
  modules: ["@wxt-dev/module-solid"],
  srcDir: "src",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
