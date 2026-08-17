import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type Message,
  type MessageTransport,
  onMessage,
  sendMessage,
  setTransport,
} from "./messaging.ts";

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
  let mockTransport: MessageTransport;

  beforeEach(() => {
    mockTransport = {
      onMessage: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    setTransport(mockTransport);
  });

  afterEach(() => {
    setTransport(null as never);
    vi.clearAllMocks();
  });

  it("delegates to transport.sendMessage with the message payload", async () => {
    const toast: Message = { message: "Copied!", type: "TOAST" };
    await sendMessage(toast);
    expect(mockTransport.sendMessage).toHaveBeenCalledWith(toast);
  });

  it("delegates INVOKE_PICKER with format through transport", async () => {
    await sendMessage({ format: "markdown", type: "INVOKE_PICKER" });
    expect(mockTransport.sendMessage).toHaveBeenCalledWith({
      format: "markdown",
      type: "INVOKE_PICKER",
    });
  });

  it("delegates COPY_TO_CLIPBOARD with content through transport", async () => {
    await sendMessage({ content: "some text", type: "COPY_TO_CLIPBOARD" });
    expect(mockTransport.sendMessage).toHaveBeenCalledWith({
      content: "some text",
      type: "COPY_TO_CLIPBOARD",
    });
  });

  it("delegates DOWNLOAD_FILE with content and filename through transport", async () => {
    await sendMessage({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
    expect(mockTransport.sendMessage).toHaveBeenCalledWith({
      content: "data",
      filename: "file.md",
      type: "DOWNLOAD_FILE",
    });
  });

  it("delegates CONTENT_READY through transport", async () => {
    await sendMessage({ type: "CONTENT_READY" });
    expect(mockTransport.sendMessage).toHaveBeenCalledWith({
      type: "CONTENT_READY",
    });
  });

  it("rejects with the error message when transport returns an __error payload", async () => {
    vi.mocked(mockTransport.sendMessage).mockResolvedValue({
      __error: "handler failure",
    });
    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).rejects.toThrow("handler failure");
  });

  it("resolves with undefined when transport returns undefined", async () => {
    vi.mocked(mockTransport.sendMessage).mockResolvedValue(undefined);
    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).resolves.toBeUndefined();
  });

  it("resolves with undefined when transport returns a non-error value", async () => {
    vi.mocked(mockTransport.sendMessage).mockResolvedValue("some result");
    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).resolves.toBeUndefined();
  });

  it("throws when transport is not configured", async () => {
    setTransport(null as never);
    await expect(
      sendMessage({ message: "test", type: "TOAST" })
    ).rejects.toThrow(
      "Transport not configured. Call setTransport() before using messaging."
    );
  });
});

describe("onMessage", () => {
  let mockTransport: MessageTransport;
  let capturedHandler:
    | ((message: Message, sender: unknown) => Promise<unknown>)
    | null;

  beforeEach(() => {
    capturedHandler = null;
    mockTransport = {
      onMessage: vi.fn((handler) => {
        capturedHandler = handler;
      }),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };
    setTransport(mockTransport);
  });

  afterEach(() => {
    setTransport(null as never);
    vi.clearAllMocks();
    capturedHandler = null;
  });

  it("delegates to transport.onMessage with the callback", () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    onMessage(callback);
    expect(mockTransport.onMessage).toHaveBeenCalledWith(callback);
  });

  it("throws when transport is not configured", () => {
    setTransport(null as never);
    expect(() => onMessage(vi.fn())).toThrow(
      "Transport not configured. Call setTransport() before using messaging."
    );
  });

  it("passes message and sender through to the callback when handler is invoked", async () => {
    const callback = vi.fn().mockResolvedValue(undefined);
    onMessage(callback);
    expect(capturedHandler).not.toBeNull();
    const sender = { tab: { id: 1 } };
    await capturedHandler?.({ type: "CONTENT_READY" }, sender);
    expect(callback).toHaveBeenCalledWith({ type: "CONTENT_READY" }, sender);
  });

  it("returns the callback's resolved value when handler is invoked", async () => {
    const callback = vi.fn().mockResolvedValue("result");
    onMessage(callback);
    expect(capturedHandler).not.toBeNull();
    const result = await capturedHandler?.(
      { message: "hi", type: "TOAST" },
      {}
    );
    expect(result).toBe("result");
  });
});
