import { vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

/**
 * Install a fake WebExtension browser API for tests.
 *
 * `@wxt-dev/browser` is replaced with lightweight `vi.fn()` stubs so tests can
 * assert call behaviour through `vi.mocked(...)` without a real browser or a
 * stateful fake-browser dependency. Covers the runtime APIs exercised across the
 * suite (messaging, tabs, context menus); extend as new modules need them.
 */
vi.mock("@wxt-dev/browser", () => ({
  browser: {
    contextMenus: {
      create: vi.fn(),
      onClicked: { addListener: vi.fn() },
    },
    runtime: {
      id: undefined,
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));
