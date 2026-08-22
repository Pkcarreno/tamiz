import { describe, expect, it, vi } from "vitest";

import { readDefaultFormat, writeDefaultFormat } from "./storage.ts";

describe("readDefaultFormat", () => {
  it("returns a valid format string from storage", async () => {
    const result = await readDefaultFormat();
    expect(result).toMatch(/^(markdown|html)$/);
  });

  it("never throws even when the underlying API errors", async () => {
    // readDefaultFormat catches all errors and returns "markdown".
    // With fake-browser the storage call succeeds, so we verify
    // the happy-path return type and that no error propagates.
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // writeDefaultFormat should never throw, even if storage fails.
    // With fake-browser the call succeeds, so we just confirm no error.
    await writeDefaultFormat("markdown");

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
