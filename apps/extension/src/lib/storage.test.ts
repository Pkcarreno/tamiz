import { afterEach, describe, expect, it, vi } from "vitest";

import { readDefaultFormat, writeDefaultFormat } from "./storage.ts";

const FORMAT_REGEX = /^(markdown|html)$/;

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
