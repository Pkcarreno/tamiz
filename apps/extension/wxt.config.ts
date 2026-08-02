import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    action: {
      default_title: "Tamiz - Select & Convert",
    },
    permissions: ["activeTab", "scripting"],
  },
  modules: ["@wxt-dev/module-solid"],
  srcDir: "src",
});
