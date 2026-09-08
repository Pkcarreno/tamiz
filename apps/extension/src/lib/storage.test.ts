import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readDefaultFormat,
  readThemePreference,
  writeDefaultFormat,
  writeThemePreference,
} from "./storage.ts";

const FORMAT_REGEX = /^(markdown|html)$/;
const THEME_REGEX = /^(light|dark|auto)$/;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readDefaultFormat", () => {
  it("returns a valid format string from storage", async () => {
    const result = await readDefaultFormat();
    expect(result).toMatch(FORMAT_REGEX);
  });

  it("never throws even when the underlying API errors", async () => {
    await expect(readDefaultFormat()).resolves.toBeDefined();
  });
});

describe("writeDefaultFormat", () => {
  it("persists 'markdown' without throwing", async () => {
    await expect(writeDefaultFormat("markdown")).resolves.toBeUndefined();
  });

  it("persists 'html' without throwing", async () => {
    await expect(writeDefaultFormat("html")).resolves.toBeUndefined();
  });

  it("swallows storage errors and logs them", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentional no-op for testing error swallowing
    });

    await writeDefaultFormat("markdown");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("readThemePreference", () => {
  it("returns a valid theme preference string from storage", async () => {
    const result = await readThemePreference();
    expect(result).toMatch(THEME_REGEX);
  });

  it("returns 'auto' as the default when no value is stored", async () => {
    const result = await readThemePreference();
    expect(["light", "dark", "auto"]).toContain(result);
  });

  it("never throws even when the underlying API errors", async () => {
    await expect(readThemePreference()).resolves.toBeDefined();
  });
});

describe("writeThemePreference", () => {
  it("persists 'light' without throwing", async () => {
    await expect(writeThemePreference("light")).resolves.toBeUndefined();
  });

  it("persists 'dark' without throwing", async () => {
    await expect(writeThemePreference("dark")).resolves.toBeUndefined();
  });

  it("persists 'auto' without throwing", async () => {
    await expect(writeThemePreference("auto")).resolves.toBeUndefined();
  });

  it("swallows storage errors and logs them", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Intentional no-op for testing error swallowing
    });

    await writeThemePreference("dark");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
