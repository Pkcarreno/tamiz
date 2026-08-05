import { browser } from "@wxt-dev/browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type Message, sendMessage } from "./messaging.ts";

describe("Message types", () => {
  it("TOAST is a valid message variant with a message string", () => {
    const toast: Message = { message: "Copied to clipboard", type: "TOAST" };
    expect(toast.type).toBe("TOAST");
    expect(toast.message).toBe("Copied to clipboard");
  });

  it("INVOKE_PICKER carries an optional format field", () => {
    const invoke: Message = { format: "raw", type: "INVOKE_PICKER" };
    expect(invoke.type).toBe("INVOKE_PICKER");
    expect(invoke.format).toBe("raw");
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
});

describe("sendMessage", () => {
  it("forwards a TOAST message through browser.runtime.sendMessage", async () => {
    const toast: Message = { message: "Copied!", type: "TOAST" };
    await sendMessage(toast);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(toast);
  });

  it("forwards an INVOKE_PICKER message with format", async () => {
    await sendMessage({ format: "markdown", type: "INVOKE_PICKER" });
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("forwards COPY_TO_CLIPBOARD with content", async () => {
    await sendMessage({
      content: "some text",
      type: "COPY_TO_CLIPBOARD",
    });
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      content: "some text",
      type: "COPY_TO_CLIPBOARD",
    });
  });

  it("forwards DOWNLOAD_FILE with content and filename", async () => {
    await sendMessage({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
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

    onMessage(callback);

    const addListenerMock = browser.runtime.onMessage.addListener as any;
    expect(addListenerMock).toHaveBeenCalled();

    const [[handler]] = addListenerMock.mock.calls;

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

  it("calls sendResponse and logs the error when the callback rejects", async () => {
    const { onMessage } = await import("./messaging.ts");
    const error = new Error("handler failure");
    const callback = vi.fn().mockRejectedValue(error);
    const sendResponse = vi.fn();
    // biome-ignore lint/suspicious/noEmptyBlockStatements: intentional spy no-op
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    onMessage(callback);

    const addListenerMock = browser.runtime.onMessage.addListener as any;
    // Use the most recent registration to avoid picking up the previous test's handler
    const {
      mock: { calls },
    } = addListenerMock;
    const [[handler]] = calls.slice(-1);

    const result = handler(
      { message: "test", type: "TOAST" },
      {},
      sendResponse
    );
    expect(result).toBe(true);

    // Wait for the rejection to propagate through .catch()
    await Promise.resolve();
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[tamiz] message handler error:",
      error
    );

    consoleSpy.mockRestore();
  });
});
