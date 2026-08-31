import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isBlobUrlAvailable,
  isClipboardAvailable,
} from "./feature-detection.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isClipboardAvailable", () => {
  it("returns true when navigator.clipboard.writeText is a function", () => {
    expect(isClipboardAvailable()).toBe(true);
  });

  it("returns false when navigator.clipboard is undefined", () => {
    const original = navigator.clipboard;
    // @ts-expect-error — testing unavailable API
    vi.stubGlobal("navigator", { clipboard: undefined });

    expect(isClipboardAvailable()).toBe(false);

    vi.stubGlobal("navigator", { clipboard: original });
  });

  it("returns false when navigator.clipboard.writeText is not a function", () => {
    const original = navigator.clipboard;
    vi.stubGlobal("navigator", { clipboard: {} });

    expect(isClipboardAvailable()).toBe(false);

    vi.stubGlobal("navigator", { clipboard: original });
  });
});

describe("isBlobUrlAvailable", () => {
  it("returns true when URL.createObjectURL is a function", () => {
    expect(isBlobUrlAvailable()).toBe(true);
  });

  it("returns false when URL.createObjectURL is removed", () => {
    const original = URL.createObjectURL;
    // @ts-expect-error — testing unavailable API
    vi.stubGlobal("URL", { ...URL, createObjectURL: undefined });

    expect(isBlobUrlAvailable()).toBe(false);

    vi.stubGlobal("URL", { ...URL, createObjectURL: original });
  });
});
