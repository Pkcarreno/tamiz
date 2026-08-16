import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(process.cwd(), "public");

describe("icon assets", () => {
  it("does not ship hand-crafted light/dark PNG variants in public/", () => {
    const removedPngs = [
      "icon-dark-16.png",
      "icon-dark-32.png",
      "icon-light-16.png",
      "icon-light-32.png",
    ];

    for (const png of removedPngs) {
      expect(
        existsSync(resolve(publicDir, png)),
        `${png} should not exist in public/`
      ).toBe(false);
    }
  });

  it("retains the single SVG source at src/assets/icon.svg", () => {
    expect(existsSync(resolve(process.cwd(), "src/assets/icon.svg"))).toBe(
      true
    );
  });
});
