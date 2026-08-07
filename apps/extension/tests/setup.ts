import { beforeEach, vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

import { fakeBrowser } from "wxt/testing/fake-browser";

/**
 * fake-browser v2 implements runtime, tabs, storage, alarms, notifications,
 * action, webNavigation, and windows in-memory. The following APIs are NOT
 * implemented and throw `MockNotImplementedError`:
 *   - contextMenus (create + onClicked)
 *   - downloads.download
 *   - scripting.executeScript
 *   - tabs.sendMessage
 *
 * We attach `vi.fn()` overlays for the functions and an EventForTesting object
 * for `contextMenus.onClicked` so tests can both assert calls and `.trigger()`
 * the click listener.
 */

/**
 * Minimal EventForTesting — mirrors fake-browser's internal event shape so
 * tests can use `.trigger()` and `.addListener()` on unimplemented events.
 */
function createEventForTesting() {
  const listeners: Array<(...args: unknown[]) => unknown> = [];
  return {
    addListener: vi.fn((cb: (...args: unknown[]) => unknown) => {
      listeners.push(cb);
    }),
    hasListener: vi.fn((cb: (...args: unknown[]) => unknown) =>
      listeners.includes(cb)
    ),
    hasListeners: vi.fn(() => listeners.length > 0),
    removeAllListeners: vi.fn(() => {
      listeners.length = 0;
    }),
    removeListener: vi.fn((cb: (...args: unknown[]) => unknown) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) {
        listeners.splice(idx, 1);
      }
    }),
    trigger: vi.fn(
      (...args: unknown[]): Promise<unknown[]> =>
        Promise.all(listeners.map((l) => l(...args)))
    ),
  };
}

// --- Unimplemented API overlays ---
fakeBrowser.contextMenus.create = vi.fn();
fakeBrowser.contextMenus.onClicked = createEventForTesting();
fakeBrowser.downloads.download = vi.fn();
fakeBrowser.scripting.executeScript = vi.fn();
fakeBrowser.tabs.sendMessage = vi.fn();

/**
 * Reset fake-browser state before each test to prevent cross-test leakage
 * of listeners, tabs, storage, and runtime message handlers.
 *
 * The `vi.fn()` overlays above persist (they are not cleared by `reset()`),
 * but their call history is cleared by `vi.clearAllMocks()` in each test file's
 * `afterEach`.
 */
beforeEach(() => fakeBrowser.reset());

/**
 * Provide a fake navigator.clipboard for tests that exercise clipboard writes
 * in the background script.
 */
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  writable: true,
});

globalThis.defineBackground = (def: unknown) => def;
