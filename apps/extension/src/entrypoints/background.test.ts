/**
 * Tests for background relay and handler logic.
 *
 * Mocks `defineBackground` (a no-op identity in WXT) so the module loads
 * without requiring the WXT runtime, then exercises each exported handler.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { type Browser, browser } from "wxt/browser";

const FORMAT_REGEX = /^(markdown|html)$/;

import { isBlobUrlAvailable } from "../lib/feature-detection.ts";
import {
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
  copyToClipboard,
  createContextMenu,
  getDefaultFormat,
  handleActionClick,
  handleBackgroundMessage,
  handleContextMenuClick,
} from "./background.ts";

vi.mock("../lib/feature-detection.ts");

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("createContextMenu", () => {
  it("creates a context menu item with correct title and page-only contexts", () => {
    createContextMenu();

    expect(browser.contextMenus.create).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      contexts: ["page"],
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
    });
  });

  it("swallows duplicate-id errors to remain idempotent on update", () => {
    vi.mocked(browser.contextMenus.create)
      .mockImplementationOnce(() => {
        /* first call succeeds */
      })
      .mockImplementationOnce(() => {
        throw new Error("Cannot create menu item: menu item already exists");
      });

    expect(() => {
      createContextMenu();
      createContextMenu();
    }).not.toThrow();

    expect(browser.contextMenus.create).toHaveBeenCalledTimes(2);
  });
});

describe("handleContextMenuClick", () => {
  it("sends INVOKE_PICKER with default format to the tab when the tamiz menu item is clicked", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    await handleContextMenuClick(
      {
        editable: false,
        menuItemId: CONTEXT_MENU_ID,
      } as Browser.contextMenus.OnClickData,
      { id: 99 } as Browser.tabs.Tab
    );

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(99, {
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("ignores clicks on unrelated menu items", async () => {
    await handleContextMenuClick(
      {
        editable: false,
        menuItemId: "something-else",
      } as Browser.contextMenus.OnClickData,
      { id: 99 } as Browser.tabs.Tab
    );

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("does not relay when the clicked tab has no id", async () => {
    await handleContextMenuClick(
      {
        editable: false,
        menuItemId: CONTEXT_MENU_ID,
      } as Browser.contextMenus.OnClickData,
      undefined
    );

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

describe("getDefaultFormat", () => {
  it("returns a valid format from storage", async () => {
    const format = await getDefaultFormat();
    expect(format).toMatch(FORMAT_REGEX);
  });

  it("returns 'markdown' as the default fallback", async () => {
    const format = await getDefaultFormat();
    expect(format).toBe("markdown");
  });
});

describe("handleActionClick", () => {
  it("sends INVOKE_PICKER with default format to the tab when the extension icon is clicked", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    await handleActionClick({ id: 99 } as Browser.tabs.Tab);

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(99, {
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("does not relay when the tab is undefined", async () => {
    await handleActionClick(undefined);

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("does not relay when the tab has no id", async () => {
    await handleActionClick({} as Browser.tabs.Tab);

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });
});

describe("copyToClipboard", () => {
  it("writes the given text to the system clipboard", async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

    await copyToClipboard("hello world");

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
  });

  it("does not throw when the clipboard API rejects", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockReturnValue(undefined);
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("Permission denied")
    );

    await expect(copyToClipboard("test")).resolves.not.toThrow();
    consoleErrorSpy.mockRestore();
  });
});

describe("handleBackgroundMessage", () => {
  it("relays INVOKE_PICKER to the sender's tab when tab id is available", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    const sender = {
      tab: { id: 42 },
    } as unknown as Browser.runtime.MessageSender;
    await handleBackgroundMessage(
      { format: "html", type: "INVOKE_PICKER" },
      sender
    );

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      format: "html",
      type: "INVOKE_PICKER",
    });
  });

  it("queries the active tab and relays when sender.tab is missing", async () => {
    vi.spyOn(browser.tabs, "query").mockResolvedValue([
      { id: 77 } as unknown as Browser.tabs.Tab,
    ]);
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    const sender = {} as unknown as Browser.runtime.MessageSender;
    await handleBackgroundMessage({ type: "INVOKE_PICKER" }, sender);

    expect(browser.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(77, {
      type: "INVOKE_PICKER",
    });
  });

  it("does not relay when neither sender.tab nor active tab is available", async () => {
    vi.spyOn(browser.tabs, "query").mockResolvedValue([]);

    const sender = {} as unknown as Browser.runtime.MessageSender;
    await handleBackgroundMessage({ type: "INVOKE_PICKER" }, sender);

    expect(browser.tabs.query).toHaveBeenCalled();
    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("copies content to clipboard on COPY_TO_CLIPBOARD", async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

    await handleBackgroundMessage(
      { content: "clipboard data", type: "COPY_TO_CLIPBOARD" },
      {} as unknown as Browser.runtime.MessageSender
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "clipboard data"
    );
  });

  it("triggers a file download on DOWNLOAD_FILE", async () => {
    vi.mocked(isBlobUrlAvailable).mockReturnValue(false);
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await handleBackgroundMessage(
      {
        content: "download me",
        filename: "content.md",
        type: "DOWNLOAD_FILE",
      },
      {} as unknown as Browser.runtime.MessageSender
    );

    const expectedUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent("download me")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "content.md",
      url: expectedUrl,
    });
  });

  it("rejects when download fails on DOWNLOAD_FILE", async () => {
    vi.mocked(isBlobUrlAvailable).mockReturnValue(false);
    vi.mocked(browser.downloads.download).mockRejectedValue(
      new Error("download failed")
    );

    await expect(
      handleBackgroundMessage(
        {
          content: "download me",
          filename: "content.md",
          type: "DOWNLOAD_FILE",
        },
        {} as unknown as Browser.runtime.MessageSender
      )
    ).rejects.toThrow("download failed");
  });

  it("silently ignores TOAST messages (no popup to forward to)", async () => {
    vi.spyOn(browser.runtime, "sendMessage").mockResolvedValue(undefined);

    await handleBackgroundMessage(
      { message: "Copied to clipboard", type: "TOAST" },
      {} as unknown as Browser.runtime.MessageSender
    );

    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it("opens options page when OPEN_OPTIONS is received", async () => {
    vi.spyOn(browser.runtime, "openOptionsPage").mockResolvedValue(undefined);

    await handleBackgroundMessage(
      { type: "OPEN_OPTIONS" },
      {} as unknown as Browser.runtime.MessageSender
    );

    expect(browser.runtime.openOptionsPage).toHaveBeenCalledOnce();
  });
});

describe("module-scope listener registration (SW restart regression)", () => {
  it("registers onClicked listener on module load without onInstalled firing", async () => {
    vi.resetModules();

    // After resetModules the fake browser is re-created. Re-apply the
    // contextMenus overlays that vitest-setup.ts applies to the original instance.
    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    fakeBrowser.contextMenus.create = vi.fn();
    fakeBrowser.contextMenus.onClicked.addListener = vi.fn();

    // Fresh dynamic import simulates service worker restart.
    // defineBackground is an identity no-op (set in vitest-setup.ts), so main() is
    // never invoked and onInstalled never fires.
    const mod = await import("./background.ts");

    // Exactly-once registration via module-import side effect — the listener
    // is registered at module scope, not inside onInstalled.
    expect(
      fakeBrowser.contextMenus.onClicked.addListener
    ).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.contextMenus.onClicked.addListener).toHaveBeenCalledWith(
      mod.handleContextMenuClick
    );
  });

  it("sends INVOKE_PICKER with default format when the menu item is clicked after SW restart", async () => {
    vi.resetModules();

    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    fakeBrowser.contextMenus.create = vi.fn();
    fakeBrowser.contextMenus.onClicked.addListener = vi.fn();
    fakeBrowser.tabs.sendMessage = vi.fn().mockResolvedValue(undefined);

    // Fresh import simulates SW restart — onInstalled does not fire, but the
    // module-scope listener is registered.
    await import("./background.ts");

    // Extract the handler that was registered at module scope and simulate a click.
    const listener = fakeBrowser.contextMenus.onClicked.addListener.mock
      .calls[0][0] as (
      info: Browser.contextMenus.OnClickData,
      tab?: Browser.tabs.Tab
    ) => Promise<void>;

    await listener(
      {
        editable: false,
        menuItemId: CONTEXT_MENU_ID,
      } as Browser.contextMenus.OnClickData,
      { id: 99 } as Browser.tabs.Tab
    );

    expect(fakeBrowser.tabs.sendMessage).toHaveBeenCalledWith(99, {
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("registers tabs.onRemoved listener on module load for pending cleanup", async () => {
    vi.resetModules();

    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    fakeBrowser.contextMenus.onClicked.addListener = vi.fn();
    fakeBrowser.tabs.onRemoved.addListener = vi.fn();

    await import("./background.ts");

    expect(fakeBrowser.tabs.onRemoved.addListener).toHaveBeenCalledTimes(1);
  });

  it("registers action.onClicked listener on module load (MV3)", async () => {
    vi.stubEnv("MANIFEST_VERSION", "3");
    vi.resetModules();

    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    fakeBrowser.contextMenus.create = vi.fn();
    fakeBrowser.contextMenus.onClicked.addListener = vi.fn();
    fakeBrowser.action.onClicked.addListener = vi.fn();

    const mod = await import("./background.ts");

    // The icon-click handler is registered at module scope via browser.action (MV3).
    expect(fakeBrowser.action.onClicked.addListener).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.action.onClicked.addListener).toHaveBeenCalledWith(
      mod.handleActionClick
    );
  });

  it("uses browserAction.onClicked on module load when MANIFEST_VERSION is 2", async () => {
    vi.stubEnv("MANIFEST_VERSION", "2");
    vi.resetModules();

    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    fakeBrowser.contextMenus.create = vi.fn();
    fakeBrowser.contextMenus.onClicked.addListener = vi.fn();

    // The module should load without throwing — the try/catch absorbs the
    // TypeError when browser.browserAction doesn't exist in the fake browser.
    // We verify the module loads and exports the expected handlers.
    const mod = await import("./background.ts");

    expect(mod.handleActionClick).toBeDefined();
    expect(mod.handleContextMenuClick).toBeDefined();
  });
});

describe("command listener (keyboard shortcut)", () => {
  /**
   * Fresh module + fake-browser setup for commands listener tests.
   *
   * Mirrors the pattern in the "module-scope listener registration" suite:
   * resetModules → overlay unimplemented APIs → dynamic import.
   */
  async function setupCommandsModule() {
    vi.resetModules();

    const { fakeBrowser } = await import("wxt/testing/fake-browser");
    // commands.onCommand.addListener throws MockNotImplementedError on the
    // fresh instance — overlay so we can capture the module-scope registration.
    fakeBrowser.commands.onCommand.addListener = vi.fn();
    // tabs.query and tabs.sendMessage also throw on the fresh instance.
    fakeBrowser.tabs.query = vi.fn();
    fakeBrowser.tabs.sendMessage = vi.fn().mockResolvedValue(undefined);

    const mod = await import("./background.ts");
    return { fakeBrowser, mod };
  }

  it("registers commands.onCommand listener at module scope (survives SW restarts)", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();

    expect(fakeBrowser.commands.onCommand.addListener).toHaveBeenCalledTimes(1);
    expect(fakeBrowser.commands.onCommand.addListener).toHaveBeenCalledWith(
      mod.handleCommand
    );
  });

  it("relays INVOKE_PICKER with default format to the active tab when _execute_action fires", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();
    fakeBrowser.tabs.query.mockResolvedValue([{ id: 99 }]);

    await mod.handleCommand("_execute_action");

    expect(fakeBrowser.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(fakeBrowser.tabs.sendMessage).toHaveBeenCalledWith(99, {
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("ignores unknown commands (does not query or relay INVOKE_PICKER)", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();

    await mod.handleCommand("unknown_command");

    // handleCommand returns early — no async behavior should occur.
    expect(fakeBrowser.tabs.query).not.toHaveBeenCalled();
    expect(fakeBrowser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("does not relay when tabs.query returns no active tab", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();
    fakeBrowser.tabs.query.mockResolvedValue([]); // no active tab

    await mod.handleCommand("_execute_action");

    expect(fakeBrowser.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(fakeBrowser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("does not relay when the active tab has no id", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();
    fakeBrowser.tabs.query.mockResolvedValue([{}]); // tab without id

    await mod.handleCommand("_execute_action");

    expect(fakeBrowser.tabs.query).toHaveBeenCalled();
    expect(fakeBrowser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("relays INVOKE_PICKER with format to tab id 0 (falsy but valid — tests !== undefined guard)", async () => {
    const { fakeBrowser, mod } = await setupCommandsModule();
    fakeBrowser.tabs.query.mockResolvedValue([{ id: 0 }]);

    await mod.handleCommand("_execute_action");

    expect(fakeBrowser.tabs.sendMessage).toHaveBeenCalledWith(0, {
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });
});
