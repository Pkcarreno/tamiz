import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const configSource = readFileSync(
  resolve(process.cwd(), "wxt.config.ts"),
  "utf-8"
);

describe("wxt.config.ts icon management", () => {
  it("does not reference theme_icons (Firefox theme-icon swapping removed)", () => {
    expect(configSource).not.toContain("theme_icons");
  });

  it("does not rewrite browser_action.default_icon (WXT auto-icons handles it)", () => {
    expect(configSource).not.toContain("browser_action");
  });

  it("retains the browser_specific_settings.gecko.id block for Firefox signing", () => {
    expect(configSource).toContain("browser_specific_settings");
    expect(configSource).toContain("gecko");
    expect(configSource).toContain("tamiz@pkcarreno.dev");
  });

  it("retains the tamiz-assert-icon-source Vite plugin guard", () => {
    expect(configSource).toContain("tamiz-assert-icon-source");
  });
});
