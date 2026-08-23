import { describe, expect, it } from "vitest";

import { createShortcutRegistry } from "./registry.ts";
import type { ShortcutContext } from "./types.ts";

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
  opts: {
    format?: "markdown" | "html";
    inputFocused?: boolean;
    isExclusionMode?: boolean;
  } = {}
): ShortcutContext {
  return {
    format: opts.format ?? "markdown",
    inputFocused: opts.inputFocused ?? false,
    isExclusionMode: opts.isExclusionMode ?? false,
    state: "SELECTED",
  };
}

const testCases: TestCase[] = [
  // --- Escape → dismiss (any state, before input guard) ---
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "Escape → dismiss in IDLE",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "HIGHLIGHTING",
    },
    desc: "Escape → dismiss in HIGHLIGHTING",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "SELECTED",
    },
    desc: "Escape → dismiss in SELECTED",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: true,
      isExclusionMode: false,
      state: "SELECTED",
    },
    desc: "Escape → dismiss when inputFocused=true (bypasses input guard)",
    expected: { actionType: "DISMISS" },
    key: { key: "Escape" },
  },

  // --- c → copy (SELECTED only, single key) ---
  {
    context: selectedCtx(),
    desc: "c → copy in SELECTED",
    expected: { actionType: "COPY" },
    key: { key: "c" },
  },
  {
    context: selectedCtx(),
    desc: "C (uppercase) → copy — case-insensitive key match",
    expected: { actionType: "COPY" },
    key: { key: "C" },
  },
  {
    context: selectedCtx(),
    desc: "ctrl+c → null (modifier on single-key copy)",
    expected: null,
    key: { ctrlKey: true, key: "c" },
  },
  {
    context: selectedCtx(),
    desc: "meta+c → null (modifier on single-key copy)",
    expected: null,
    key: { key: "c", metaKey: true },
  },
  {
    context: selectedCtx(),
    desc: "ctrl+shift+c → null (extra modifier on copy)",
    expected: null,
    key: { ctrlKey: true, key: "c", shiftKey: true },
  },
  {
    context: selectedCtx(),
    desc: "alt+c → null (alt is not part of copy)",
    expected: null,
    key: { altKey: true, key: "c" },
  },

  // --- s → download (SELECTED only, single key) ---
  {
    context: selectedCtx(),
    desc: "s → download in SELECTED",
    expected: { actionType: "DOWNLOAD" },
    key: { key: "s" },
  },
  {
    context: selectedCtx(),
    desc: "S (uppercase) → download — case-insensitive key match",
    expected: { actionType: "DOWNLOAD" },
    key: { key: "S" },
  },
  {
    context: selectedCtx(),
    desc: "ctrl+s → null (modifier on single-key download)",
    expected: null,
    key: { ctrlKey: true, key: "s" },
  },
  {
    context: selectedCtx(),
    desc: "meta+s → null (modifier on single-key download)",
    expected: null,
    key: { key: "s", metaKey: true },
  },

  // --- Ctrl+Shift+F → removed (binding deleted) ---
  {
    context: selectedCtx({ format: "markdown" }),
    desc: "ctrl+shift+f → null (binding removed)",
    expected: null,
    key: { ctrlKey: true, key: "f", shiftKey: true },
  },
  {
    context: selectedCtx({ format: "html" }),
    desc: "ctrl+shift+F (uppercase) → null (binding removed)",
    expected: null,
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
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "HIGHLIGHTING",
    },
    desc: "f in HIGHLIGHTING → null",
    expected: null,
    key: { key: "f" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "c in IDLE → null (state guard on single-key copy)",
    expected: null,
    key: { key: "c" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "s in IDLE → null (state guard on single-key download)",
    expected: null,
    key: { key: "s" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "ctrl+c in IDLE → null",
    expected: null,
    key: { ctrlKey: true, key: "c" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "ctrl+s in IDLE → null",
    expected: null,
    key: { ctrlKey: true, key: "s" },
  },

  // --- Input focus guard: inputFocused blocks everything except Escape ---
  {
    context: selectedCtx({ inputFocused: true }),
    desc: "c when inputFocused → null",
    expected: null,
    key: { key: "c" },
  },
  {
    context: selectedCtx({ inputFocused: true }),
    desc: "s when inputFocused → null",
    expected: null,
    key: { key: "s" },
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
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "IDLE",
    },
    desc: "a in IDLE → null (unmatched key)",
    expected: null,
    key: { key: "a" },
  },

  // --- e → exclude-toggle (SELECTED only) ---
  {
    context: selectedCtx(),
    desc: "e → exclude-toggle in SELECTED",
    expected: { actionType: "EXCLUDE_TOGGLE" },
    key: { key: "e" },
  },
  {
    context: selectedCtx({ isExclusionMode: true }),
    desc: "e → exclude-toggle even in exclusion mode",
    expected: { actionType: "EXCLUDE_TOGGLE" },
    key: { key: "e" },
  },
  {
    context: {
      format: "markdown",
      inputFocused: false,
      isExclusionMode: false,
      state: "HIGHLIGHTING",
    },
    desc: "e in HIGHLIGHTING → null",
    expected: null,
    key: { key: "e" },
  },
];

describe("createShortcutRegistry", () => {
  describe("matchShortcut", () => {
    it.each(testCases)("$desc", ({ context, key, expected }) => {
      const { matchShortcut } = createShortcutRegistry();
      const result = matchShortcut(keyEvent(key), context);

      if (expected === null) {
        expect(result).toBeNull();
        return;
      }

      expect(result).toEqual(
        expect.objectContaining({
          type: expected.actionType,
        })
      );

      if (expected.format !== undefined) {
        expect(result).toEqual(
          expect.objectContaining({
            format: expected.format,
            type: expected.actionType,
          })
        );
      }
    });
  });

  describe("bindings are exposed", () => {
    it("exposes at least 4 binding labels", () => {
      const { bindings } = createShortcutRegistry();
      expect(bindings.length).toBeGreaterThanOrEqual(4);
    });
  });
});
