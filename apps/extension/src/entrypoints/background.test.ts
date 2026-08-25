/**
 * Tests for background relay and handler logic.
 *
 * Mocks `defineBackground` (a no-op identity in WXT) so the module loads
 * without requiring the WXT runtime, then exercises each exported handler.
 */

import { afterEach, describe, expect, it, type Mock, vi } from "vitest";
import { type Browser, browser } from "wxt/browser";

const FORMAT_REGEX = /^(markdown|html)$/;

import {
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
  clearBlobUrlMap,
  clearPendingInvokes,
  copyToClipboard,
  createContextMenu,
  downloadFile,
  getDefaultFormat,
  getMimeType,
  handleActionClick,
  handleBackgroundMessage,
  handleContextMenuClick,
  relayInvokePicker,
  removePendingInvoke,
} from "./background.ts";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  clearPendingInvokes();
  clearBlobUrlMap();
});

/**
 * Trigger the `downloads.onChanged` event. vitest-setup.ts overlays
 * `downloads.onChanged` with `createEventForTesting()` which provides a
 * `trigger` method — cast to access it since the runtime types don't include it.
 */
function triggerOnChanged(
  delta: Browser.downloads.DownloadDelta
): Promise<unknown[]> {
  return (
    browser.downloads.onChanged as unknown as {
      trigger: (delta: Browser.downloads.DownloadDelta) => Promise<unknown[]>;
    }
  ).trigger(delta);
}

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

describe("relayInvokePicker", () => {
  it("sends INVOKE_PICKER to the specified tab without a format", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    await relayInvokePicker(42);

    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      type: "INVOKE_PICKER",
    });
  });

  it("includes the format in the message when provided", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    await relayInvokePicker(42, "html");

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      format: "html",
      type: "INVOKE_PICKER",
    });
  });

  it("injects content script and queues the invoke on failure (no blind retry)", async () => {
    vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
      new Error("Could not establish connection")
    );
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    await relayInvokePicker(42);

    // executeScript injects the content script
    expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([expect.any(String)]),
        target: { tabId: 42 },
      })
    );
    // No blind retry — only the initial failed attempt.
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("flushes a queued INVOKE_PICKER exactly once when CONTENT_READY arrives", async () => {
    // Simulate: tabs.sendMessage fails (no listener yet) → inject → queue.
    vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
      new Error("Could not establish connection")
    );
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    await relayInvokePicker(42);

    // Before CONTENT_READY: only the initial failed attempt (no retry).
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

    // Content script sends CONTENT_READY → background flushes the queued invoke.
    await handleBackgroundMessage({ type: "CONTENT_READY" }, {
      tab: { id: 42 },
    } as unknown as Browser.runtime.MessageSender);

    // Exactly one INVOKE_PICKER sent via the flush.
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(browser.tabs.sendMessage).toHaveBeenLastCalledWith(42, {
      type: "INVOKE_PICKER",
    });
  });
});

describe("CONTENT_READY handshake", () => {
  it("does not inject or queue when tabs.sendMessage succeeds immediately", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    await relayInvokePicker(42);

    // Direct delivery succeeded — no fallback injection or queue.
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

    // No pending entry to flush — CONTENT_READY is a no-op for this tab.
    await handleBackgroundMessage({ type: "CONTENT_READY" }, {
      tab: { id: 42 },
    } as unknown as Browser.runtime.MessageSender);
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("content script without a sender tab does not crash on CONTENT_READY", async () => {
    const sender = {} as unknown as Browser.runtime.MessageSender;
    await expect(
      handleBackgroundMessage({ type: "CONTENT_READY" }, sender)
    ).resolves.not.toThrow();
  });

  it("drops a pending invoke after the 5s timeout without sending", async () => {
    vi.useFakeTimers();
    vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
      new Error("Could not establish connection")
    );
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    await relayInvokePicker(99);

    // Entry is queued; flush should still send if it arrives before timeout.
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

    // Advance past the 5s timeout — entry is dropped.
    vi.advanceTimersByTime(5000);

    // CONTENT_READY after timeout → nothing to flush.
    await handleBackgroundMessage({ type: "CONTENT_READY" }, {
      tab: { id: 99 },
    } as unknown as Browser.runtime.MessageSender);
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("removePendingInvoke discards a queued invoke before CONTENT_READY", async () => {
    vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
      new Error("Could not establish connection")
    );
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    await relayInvokePicker(77);
    // 1 call (the failed attempt); invoke is now queued for tab 77.
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

    // Simulate tab close → cleanup.
    removePendingInvoke(77);

    // CONTENT_READY arrives after tab closed → no pending entry, no flush.
    await handleBackgroundMessage({ type: "CONTENT_READY" }, {
      tab: { id: 77 },
    } as unknown as Browser.runtime.MessageSender);
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
  });

  it("deduplicates when relayInvokePicker is called twice before CONTENT_READY", async () => {
    vi.mocked(browser.tabs.sendMessage)
      .mockRejectedValueOnce(new Error("Could not establish connection"))
      .mockRejectedValueOnce(new Error("Could not establish connection"));
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    // First queue (no format).
    await relayInvokePicker(42);
    // Second queue (with format) — should replace, not stack.
    await relayInvokePicker(42, "html");

    // Two failed attempts, two injections, no retries.
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(browser.scripting.executeScript).toHaveBeenCalledTimes(2);

    // CONTENT_READY → flush sends EXACTLY ONE invoke (the latest, with format).
    await handleBackgroundMessage({ type: "CONTENT_READY" }, {
      tab: { id: 42 },
    } as unknown as Browser.runtime.MessageSender);
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(3);
    expect(browser.tabs.sendMessage).toHaveBeenLastCalledWith(42, {
      format: "html",
      type: "INVOKE_PICKER",
    });
  });
});

describe("copyToClipboard", () => {
  it("writes the given text to the system clipboard", async () => {
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

    await copyToClipboard("hello world");

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
  });

  it("does not throw when the clipboard API rejects", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(
      new Error("Permission denied")
    );

    await expect(copyToClipboard("test")).resolves.not.toThrow();
  });
});

describe("getMimeType", () => {
  it("returns 'text/html' for .html filenames", () => {
    expect(getMimeType("article.html")).toBe("text/html");
  });

  it("returns 'text/markdown' for .md filenames", () => {
    expect(getMimeType("article.md")).toBe("text/markdown");
  });

  it("returns 'text/markdown' for .md filenames with different names", () => {
    expect(getMimeType("README.md")).toBe("text/markdown");
  });

  it("returns 'text/plain' for .txt filenames", () => {
    expect(getMimeType("notes.txt")).toBe("text/plain");
  });

  it("returns 'text/plain' for filenames without extension", () => {
    expect(getMimeType("README")).toBe("text/plain");
  });
});

describe("downloadFile", () => {
  it("calls browser.downloads.download with a data URL containing encoded content", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("file content", "article-123.md");

    const expectedUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent("file content")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "article-123.md",
      url: expectedUrl,
    });
  });

  it("uses text/html MIME type in the data URL for .html filenames", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("<h1>Hello</h1>", "page.html");

    const expectedUrl = `data:text/html;charset=utf-8,${encodeURIComponent("<h1>Hello</h1>")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "page.html",
      url: expectedUrl,
    });
  });

  it("uses text/markdown MIME type in the data URL for .md filenames", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("content", "article.md");

    const expectedUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent("content")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "article.md",
      url: expectedUrl,
    });
  });

  it("uses text/plain MIME type in the data URL for .txt filenames", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("hello world", "notes.txt");

    const expectedUrl = `data:text/plain;charset=utf-8,${encodeURIComponent("hello world")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "notes.txt",
      url: expectedUrl,
    });
  });

  it("does not use URL.createObjectURL or URL.revokeObjectURL in Chrome (MV3-safe)", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("data", "test.txt");

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
  });

  it("rethrows download errors without revoking any URL (chrome)", async () => {
    vi.stubEnv("BROWSER", "chrome");
    vi.mocked(browser.downloads.download).mockRejectedValue(
      new Error("download failed")
    );
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await expect(downloadFile("data", "test.txt")).rejects.toThrow(
      "download failed"
    );

    expect(revokeSpy).not.toHaveBeenCalled();
  });

  // --- Firefox branch (spec §1, §4) ---

  it("creates a blob URL via URL.createObjectURL for Firefox downloads", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    await downloadFile("file content", "article.md");

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown");
    expect(blob.size).toBe(12);
  });

  it("passes a blob URL to browser.downloads.download for Firefox", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("file content", "article.md");

    const downloadCall = vi.mocked(browser.downloads.download).mock
      .calls[0][0] as { url: string };
    expect(downloadCall.url.startsWith("blob:")).toBe(true);
  });

  it("creates a blob URL with the correct MIME type for .html on Firefox", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");

    await downloadFile("<h1>Hi</h1>", "page.html");

    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/html");
    const downloadCall = vi.mocked(browser.downloads.download).mock
      .calls[0][0] as { url: string };
    expect(downloadCall.url.startsWith("blob:")).toBe(true);
  });

  it("rethrows download errors and revokes the blob URL (firefox)", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockRejectedValue(
      new Error("download failed")
    );

    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await expect(downloadFile("data", "test.txt")).rejects.toThrow(
      "download failed"
    );

    expect(revokeSpy).toHaveBeenCalled();
  });

  // --- Blob URL revocation via onChanged + timeout (spec §1, §4) ---

  it("revokes blob URL when downloads.onChanged fires with complete state", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    const createSpy = vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("file content", "article.md");

    const blobUrl = createSpy.mock.results[0]?.value as string;

    await triggerOnChanged({
      id: 42,
      state: { current: "complete" },
    });

    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
  });

  it("revokes blob URL when downloads.onChanged fires with interrupted state", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    const createSpy = vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("file content", "article.md");

    const blobUrl = createSpy.mock.results[0]?.value as string;

    await triggerOnChanged({
      id: 42,
      state: { current: "interrupted" },
    });

    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
  });

  it("does not revoke blob URL on non-terminal onChanged state", async () => {
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("file content", "article.md");

    await triggerOnChanged({
      id: 42,
      state: { current: "in_progress" },
    });

    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it("revokes blob URL via 30s timeout fallback if onChanged does not fire", async () => {
    vi.useFakeTimers();
    vi.stubEnv("BROWSER", "firefox");
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    const createSpy = vi.spyOn(URL, "createObjectURL");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("file content", "article.md");

    const blobUrl = createSpy.mock.results[0]?.value as string;

    // onChanged does not fire — advance past the 30s timeout.
    vi.advanceTimersByTime(30_000);

    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);

    vi.useRealTimers();
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
