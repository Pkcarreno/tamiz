/**
 * Tests for background relay and handler logic.
 *
 * Mocks `defineBackground` (a no-op identity in WXT) so the module loads
 * without requiring the WXT runtime, then exercises each exported handler.
 */
vi.mock("wxt/utils/define-background", () => ({
  defineBackground: (def: unknown) => def,
}));

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { type Browser, browser } from "@wxt-dev/browser";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

import {
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
  copyToClipboard,
  downloadFile,
  getMimeType,
  handleBackgroundMessage,
  registerContextMenu,
  relayInvokePicker,
} from "../src/entrypoints/background.ts";

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("registerContextMenu", () => {
  it("creates a context menu item with correct title and page-only contexts", () => {
    registerContextMenu();

    expect(browser.contextMenus.create).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.create).toHaveBeenCalledWith({
      contexts: ["page"],
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
    });
  });

  it("registers an onClicked listener for context menu clicks", () => {
    registerContextMenu();

    expect(browser.contextMenus.onClicked.addListener).toHaveBeenCalledTimes(1);
    expect(browser.contextMenus.onClicked.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
  });

  it("relays INVOKE_PICKER to the tab when our menu item is clicked", () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);
    registerContextMenu();

    const listener = vi.mocked(browser.contextMenus.onClicked.addListener).mock
      .calls[0][0] as (
      info: { menuItemId: string | number },
      tab?: { id?: number }
    ) => void;

    listener({ menuItemId: CONTEXT_MENU_ID }, { id: 99 });

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(99, {
      type: "INVOKE_PICKER",
    });
  });

  it("ignores clicks on unrelated menu items", () => {
    registerContextMenu();

    const listener = vi.mocked(browser.contextMenus.onClicked.addListener).mock
      .calls[0][0] as (
      info: { menuItemId: string | number },
      tab?: { id?: number }
    ) => void;

    listener({ menuItemId: "something-else" }, { id: 99 });

    expect(browser.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("does not relay when the clicked tab has no id", () => {
    registerContextMenu();

    const listener = vi.mocked(browser.contextMenus.onClicked.addListener).mock
      .calls[0][0] as (
      info: { menuItemId: string | number },
      tab?: { id?: number }
    ) => void;

    listener({ menuItemId: CONTEXT_MENU_ID }, {});

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

    await relayInvokePicker(42, "raw");

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      format: "raw",
      type: "INVOKE_PICKER",
    });
  });

  it("falls back to scripting.executeScript when tabs.sendMessage fails, then retries", async () => {
    vi.mocked(browser.tabs.sendMessage)
      .mockRejectedValueOnce(new Error("Could not establish connection"))
      .mockResolvedValueOnce(undefined);
    (browser.scripting.executeScript as unknown as Mock).mockResolvedValue([]);

    await relayInvokePicker(42);

    expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([expect.any(String)]),
        target: { tabId: 42 },
      })
    );
    expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(2);
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
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("file content", "article-123.md");

    const expectedUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent("file content")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "article-123.md",
      url: expectedUrl,
    });
  });

  it("uses text/html MIME type in the data URL for .html filenames", async () => {
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("<h1>Hello</h1>", "page.html");

    const expectedUrl = `data:text/html;charset=utf-8,${encodeURIComponent("<h1>Hello</h1>")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "page.html",
      url: expectedUrl,
    });
  });

  it("uses text/markdown MIME type in the data URL for .md filenames", async () => {
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("content", "article.md");

    const expectedUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent("content")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "article.md",
      url: expectedUrl,
    });
  });

  it("uses text/plain MIME type in the data URL for .txt filenames", async () => {
    vi.mocked(browser.downloads.download).mockResolvedValue(42);

    await downloadFile("hello world", "notes.txt");

    const expectedUrl = `data:text/plain;charset=utf-8,${encodeURIComponent("hello world")}`;
    expect(browser.downloads.download).toHaveBeenCalledWith({
      filename: "notes.txt",
      url: expectedUrl,
    });
  });

  it("does not use URL.createObjectURL or URL.revokeObjectURL (MV3-safe)", async () => {
    vi.mocked(browser.downloads.download).mockResolvedValue(42);
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL");

    await downloadFile("data", "test.txt");

    expect(createObjectURLSpy).not.toHaveBeenCalled();
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
  });

  it("rethrows download errors without revoking any URL", async () => {
    vi.mocked(browser.downloads.download).mockRejectedValue(
      new Error("download failed")
    );
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    await expect(downloadFile("data", "test.txt")).rejects.toThrow(
      "download failed"
    );

    expect(revokeSpy).not.toHaveBeenCalled();
  });
});

describe("handleBackgroundMessage", () => {
  it("relays INVOKE_PICKER to the sender's tab when tab id is available", async () => {
    vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

    const sender = {
      tab: { id: 42 },
    } as unknown as Browser.runtime.MessageSender;
    await handleBackgroundMessage(
      { format: "raw", type: "INVOKE_PICKER" },
      sender
    );

    expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
      format: "raw",
      type: "INVOKE_PICKER",
    });
  });

  it("queries the active tab and relays when sender.tab is missing", async () => {
    (browser.tabs.query as unknown as Mock).mockResolvedValue([
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
    (browser.tabs.query as unknown as Mock).mockResolvedValue([]);

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

  it("forwards TOAST messages to the popup via runtime.sendMessage", async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue(undefined);

    await handleBackgroundMessage(
      { message: "Copied to clipboard", type: "TOAST" },
      {} as unknown as Browser.runtime.MessageSender
    );

    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      message: "Copied to clipboard",
      type: "TOAST",
    });
  });
});

describe("manifest permissions", () => {
  it("includes 'downloads' permission in chrome-mv3 manifest", () => {
    const extensionDir = process.cwd();
    const wxtBin = path.join(extensionDir, "node_modules", ".bin", "wxt");

    execSync(`${wxtBin} build -b chrome --mv3`, {
      cwd: extensionDir,
      stdio: "pipe",
    });

    const manifestPath = path.join(
      extensionDir,
      ".output",
      "chrome-mv3",
      "manifest.json"
    );
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest.permissions).toContain("downloads");
  }, 120_000);
});
