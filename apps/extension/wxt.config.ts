import { defineConfig } from "wxt";

export default defineConfig({
  manifest: ({ browser }) => ({
    action: {
      default_title: "Tamiz - Select & Convert",
    },
    permissions: ["activeTab", "scripting"],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "tamiz@pkcarreno.dev",
              strict_min_version: "109.0",
            },
          },
        }
      : {}),
  }),
  modules: ["@wxt-dev/module-solid"],
  srcDir: "src",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
});
