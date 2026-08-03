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
