/**
 * Tests for background relay and handler logic.
 *
 * Mocks `defineBackground` (a no-op identity in WXT) so the module loads
 * without requiring the WXT runtime, then exercises each exported handler.
 */
vi.mock("wxt/utils/define-background", () => ({
  defineBackground: (def: unknown) => def,
}));

import { type Browser, browser } from "@wxt-dev/browser";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

import {
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
  copyToClipboard,
  downloadFile,
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

describe("downloadFile", () => {
  it("creates an anchor with the correct download filename and blob href", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    const createObjectURLSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:fake-url");

    downloadFile("file content", "article-123.md");

    const anchor = createElementSpy.mock.results
      .map((r) => r.value)
      .find((el: unknown) => (el as HTMLElement)?.tagName === "A");
    expect(anchor).toBeDefined();
    expect((anchor as HTMLAnchorElement).download).toBe("article-123.md");
    expect((anchor as HTMLAnchorElement).href).toContain("blob:");
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it("revokes the blob URL after download", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    downloadFile("data", "test.txt");

    expect(revokeSpy).toHaveBeenCalledTimes(1);
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

  it("triggers a file download on DOWNLOAD_FILE", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake-url");

    handleBackgroundMessage(
      {
        content: "download me",
        filename: "content.md",
        type: "DOWNLOAD_FILE",
      },
      {} as unknown as Browser.runtime.MessageSender
    );

    const anchor = createElementSpy.mock.results
      .map((r) => r.value)
      .find((el: unknown) => (el as HTMLElement)?.tagName === "A");
    expect((anchor as HTMLAnchorElement).download).toBe("content.md");
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
