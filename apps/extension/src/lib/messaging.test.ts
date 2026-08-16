import { afterEach, describe, expect, it, vi } from "vitest";
import { browser } from "wxt/browser";

import { type Message, sendMessage } from "./messaging.ts";

describe("Message types", () => {
  it("TOAST is a valid message variant with a message string", () => {
    const toast: Message = { message: "Copied to clipboard", type: "TOAST" };
    expect(toast.type).toBe("TOAST");
    expect(toast.message).toBe("Copied to clipboard");
  });

  it("INVOKE_PICKER carries an optional format field", () => {
    const invoke: Message = { format: "html", type: "INVOKE_PICKER" };
    expect(invoke.type).toBe("INVOKE_PICKER");
    expect(invoke.format).toBe("html");
  });

  it("DOWNLOAD_FILE carries content and filename", () => {
    const download: Message = {
      content: "hello",
      filename: "test.md",
      type: "DOWNLOAD_FILE",
    };
    expect(download.content).toBe("hello");
    expect(download.filename).toBe("test.md");
  });

  it("CONTENT_READY is a valid message variant with no payload", () => {
    const ready: Message = { type: "CONTENT_READY" };
    expect(ready.type).toBe("CONTENT_READY");
    expect(ready).toEqual({ type: "CONTENT_READY" });
  });
});

describe("sendMessage", () => {
  it("forwards a TOAST message through browser.runtime.sendMessage", async () => {
    const spy = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(undefined);
    const toast: Message = { message: "Copied!", type: "TOAST" };
    await sendMessage(toast);
    expect(spy).toHaveBeenCalledWith(toast);
  });

  it("forwards an INVOKE_PICKER message with format", async () => {
    const spy = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(undefined);
    await sendMessage({ format: "markdown", type: "INVOKE_PICKER" });
    expect(spy).toHaveBeenCalledWith({
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("forwards COPY_TO_CLIPBOARD with content", async () => {
    const spy = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(undefined);
    await sendMessage({
      content: "some text",
      type: "COPY_TO_CLIPBOARD",
    });
    expect(spy).toHaveBeenCalledWith({
      content: "some text",
      type: "COPY_TO_CLIPBOARD",
    });
  });

  it("forwards DOWNLOAD_FILE with content and filename", async () => {
    const spy = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(undefined);
    await sendMessage({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
    expect(spy).toHaveBeenCalledWith({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
  });

  it("forwards CONTENT_READY through browser.runtime.sendMessage", async () => {
    const spy = vi
      .spyOn(browser.runtime, "sendMessage")
      .mockResolvedValue(undefined);
    await sendMessage({ type: "CONTENT_READY" });
    expect(spy).toHaveBeenCalledWith({ type: "CONTENT_READY" });
  });

  it("rejects when the background handler returns an error payload", async () => {
    vi.spyOn(browser.runtime, "sendMessage").mockImplementation(() =>
      Promise.resolve({ __error: "handler failure" })
    );

    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).rejects.toThrow("handler failure");
  });

  it("resolves with undefined when the background returns a non-error response", async () => {
    vi.spyOn(browser.runtime, "sendMessage").mockResolvedValue(undefined);

    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).resolves.toBeUndefined();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});

describe("onMessage", () => {
  it("keeps the message channel open and calls sendResponse", async () => {
    const { onMessage } = await import("./messaging.ts");
    const callback = vi.fn().mockResolvedValue(undefined);
    const sendResponse = vi.fn();

    const addListenerSpy = vi.spyOn(browser.runtime.onMessage, "addListener");

    onMessage(callback);

    expect(addListenerSpy).toHaveBeenCalled();

    const [[handler]] = addListenerSpy.mock.calls as [
      [(...args: unknown[]) => unknown],
    ];

    const result = handler(
      { message: "test", type: "TOAST" },
      {},
      sendResponse
    );
    expect(result).toBe(true);

    // Wait for promise to resolve
    await Promise.resolve();
    await Promise.resolve();

    expect(callback).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalled();
  });

  it("sends an error payload via sendResponse when the callback rejects", async () => {
    const { onMessage } = await import("./messaging.ts");
    const error = new Error("handler failure");
    const callback = vi.fn().mockRejectedValue(error);
    const sendResponse = vi.fn();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional spy no-op
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const addListenerSpy = vi.spyOn(browser.runtime.onMessage, "addListener");

    onMessage(callback);

    // Use the most recent registration to avoid picking up the previous test's handler
    const [[handler]] = addListenerSpy.mock.calls.slice(-1) as [
      [(...args: unknown[]) => unknown],
    ];

    const result = handler(
      { message: "test", type: "TOAST" },
      {},
      sendResponse
    );
    expect(result).toBe(true);

    // Wait for the rejection to propagate through .catch()
    await Promise.resolve();
    await Promise.resolve();

    // sendResponse must carry an error payload so Firefox's promise-based
    // sendMessage rejects on the content-script side (spec §2.2).
    expect(sendResponse).toHaveBeenCalledWith({ __error: "handler failure" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "[tamiz] message handler error:",
      error
    );

    consoleSpy.mockRestore();
  });

  it("sends an error payload with a stringified message when the callback rejects with a non-Error", async () => {
    const { onMessage } = await import("./messaging.ts");
    const callback = vi.fn().mockRejectedValue("boom");
    const sendResponse = vi.fn();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional spy no-op
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const addListenerSpy = vi.spyOn(browser.runtime.onMessage, "addListener");

    onMessage(callback);

    const [[handler]] = addListenerSpy.mock.calls.slice(-1) as [
      [(...args: unknown[]) => unknown],
    ];

    handler({ message: "test", type: "TOAST" }, {}, sendResponse);

    await Promise.resolve();
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith({ __error: "boom" });
    consoleSpy.mockRestore();
  });
});
