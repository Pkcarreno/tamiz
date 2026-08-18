import { describe, expect, it } from "vitest";

import { resolveCommand } from "./registry.ts";
import type { Format, ShortcutContext } from "./types.ts";

/** Config describing a keyboard event without instantiating it inline. */
interface KeyConfig {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}

/** Build a real KeyboardEvent for the given key and modifier state. */
function keyEvent(config: KeyConfig): KeyboardEvent {
  return new KeyboardEvent("keydown", config);
}

/** What a resolved shortcut should look like — null means no match. */
type Expected = {
  actionType: string;
  format?: "markdown" | "html";
} | null;

interface TestCase {
  context: ShortcutContext;
  desc: string;
  expected: Expected;
  key: KeyConfig;
}

/** Helper to build a SELECTED context with the given format and focus. */
function selectedCtx(
  opts: { format?: "markdown" | "html"; inputFocused?: boolean } = {}
): ShortcutContext {
  return {
    format: opts.format ?? "markdown",
    inputFocused: opts.inputFocused ?? false,
    state: "SELECTED",
  };
}

const testCases: TestCase[] = [
  // --- Escape → dismiss (any state, before input guard) ---
  {
    context: { format: "markdown", inputFocused: false, state: "IDLE" },
    desc: "Escape → dismiss in IDLE",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: { format: "markdown", inputFocused: false, state: "HIGHLIGHTING" },
    desc: "Escape → dismiss in HIGHLIGHTING",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: { format: "markdown", inputFocused: false, state: "SELECTED" },
    desc: "Escape → dismiss in SELECTED",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: { format: "markdown", inputFocused: true, state: "SELECTED" },
    desc: "Escape → dismiss when inputFocused=true (bypasses input guard)",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },

  // --- Ctrl/Meta + c → copy (SELECTED only) ---
  {
    context: selectedCtx(),
    desc: "ctrl+c → copy in SELECTED",
    expected: { actionType: "COPY" },
    key: { ctrlKey: true, key: "c" },
  },
  {
    context: selectedCtx(),
    desc: "meta+c → copy in SELECTED",
    expected: { actionType: "COPY" },
    key: { key: "c", metaKey: true },
  },
  {
    context: selectedCtx(),
    desc: "c without modifier → null in SELECTED",
    expected: null,
    key: { key: "c" },
  },
  {
    context: selectedCtx(),
    desc: "ctrl+shift+c → null (extra modifier on copy)",
    expected: null,
    key: { ctrlKey: true, key: "c", shiftKey: true },
  },
  {
    context: selectedCtx(),
    desc: "ctrl+alt+c → null (extra modifier on copy)",
    expected: null,
    key: { altKey: true, ctrlKey: true, key: "c" },
  },

  // --- Ctrl/Meta + s → download (SELECTED only) ---
  {
    context: selectedCtx(),
    desc: "ctrl+s → download in SELECTED",
    expected: { actionType: "DOWNLOAD" },
    key: { ctrlKey: true, key: "s" },
  },
  {
    context: selectedCtx(),
    desc: "meta+s → download in SELECTED",
    expected: { actionType: "DOWNLOAD" },
    key: { key: "s", metaKey: true },
  },

  // --- f → format-cycle (SELECTED only) ---
  {
    context: selectedCtx({ format: "markdown" }),
    desc: "ctrl+shift+f → format-cycle (markdown→html)",
    expected: { actionType: "FORMAT_CHANGE", format: "html" },
    key: { ctrlKey: true, key: "f", shiftKey: true },
  },
  {
    context: selectedCtx({ format: "html" }),
    desc: "ctrl+shift+f → format-cycle (html→markdown)",
    expected: { actionType: "FORMAT_CHANGE", format: "markdown" },
    key: { ctrlKey: true, key: "f", shiftKey: true },
  },
  {
    context: selectedCtx({ format: "markdown" }),
    desc: "ctrl+shift+F (uppercase) → format-cycle — case-insensitive key match",
    expected: { actionType: "FORMAT_CHANGE", format: "html" },
    key: { ctrlKey: true, key: "F", shiftKey: true },
  },
  {
    context: selectedCtx({ format: "html" }),
    desc: "f without modifier → format-cycle (html→markdown)",
    expected: { actionType: "FORMAT_CHANGE", format: "markdown" },
    key: { key: "f" },
  },
  {
    context: selectedCtx({ format: "markdown" }),
    desc: "f without modifier → format-cycle (markdown→html)",
    expected: { actionType: "FORMAT_CHANGE", format: "html" },
    key: { key: "f" },
  },

  // --- State guard: non-SELECTED states block copy/download/format-cycle ---
  {
    context: { format: "markdown", inputFocused: false, state: "HIGHLIGHTING" },
    desc: "f in HIGHLIGHTING → null",
    expected: null,
    key: { key: "f" },
  },
  {
    context: { format: "markdown", inputFocused: false, state: "IDLE" },
    desc: "ctrl+c in IDLE → null",
    expected: null,
    key: { ctrlKey: true, key: "c" },
  },
  {
    context: { format: "markdown", inputFocused: false, state: "IDLE" },
    desc: "ctrl+s in IDLE → null",
    expected: null,
    key: { ctrlKey: true, key: "s" },
  },

  // --- Input focus guard: inputFocused blocks everything except Escape ---
  {
    context: selectedCtx({ inputFocused: true }),
    desc: "ctrl+c when inputFocused → null",
    expected: null,
    key: { ctrlKey: true, key: "c" },
  },
  {
    context: selectedCtx({ inputFocused: true }),
    desc: "ctrl+s when inputFocused → null",
    expected: null,
    key: { ctrlKey: true, key: "s" },
  },
  {
    context: selectedCtx({ inputFocused: true }),
    desc: "f when inputFocused → null",
    expected: null,
    key: { key: "f" },
  },

  // --- Unmatched keys → null ---
  {
    context: selectedCtx(),
    desc: "x in SELECTED → null (unmatched key)",
    expected: null,
    key: { key: "x" },
  },
  {
    context: selectedCtx(),
    desc: "Enter in SELECTED → null (unmatched key)",
    expected: null,
    key: { key: "Enter" },
  },
  {
    context: { format: "markdown", inputFocused: false, state: "IDLE" },
    desc: "a in IDLE → null (unmatched key)",
    expected: null,
    key: { key: "a" },
  },
];

describe("resolveCommand", () => {
  it.each(testCases)("$desc", ({ context, key, expected }) => {
    const result = resolveCommand(context, keyEvent(key));

    if (expected === null) {
      expect(result).toBeNull();
      return;
    }

    expect(result).toEqual(
      expect.objectContaining({
        type: expected.actionType,
      })
    );

    if (expected.format === undefined) {
      expect((result as { format?: Format }).format).toBeUndefined();
    } else {
      expect(result).toEqual(
        expect.objectContaining({
          format: expected.format,
          type: expected.actionType,
        })
      );
    }
  });
});
