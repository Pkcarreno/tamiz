import { describe, expect, it, vi } from "vitest";
import { isErrorResponse, RuntimeChannel } from "./runtime.ts";

function createMockBrowser() {
  return {
    runtime: {
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("isErrorResponse", () => {
  it("returns true for valid error response", () => {
    expect(isErrorResponse({ __error: "fail" })).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it("returns false for object without __error", () => {
    expect(isErrorResponse({ foo: 1 })).toBe(false);
  });

  it("returns false when __error is not a string", () => {
    expect(isErrorResponse({ __error: 123 })).toBe(false);
  });
});

describe("RuntimeChannel", () => {
  describe("send", () => {
    it("resolves when response is undefined", async () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      await expect(
        channel.send({ type: "CONTENT_READY" })
      ).resolves.toBeUndefined();
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: "CONTENT_READY",
      });
    });

    it("resolves when response has no __error", async () => {
      const browser = createMockBrowser();
      browser.runtime.sendMessage.mockResolvedValue({ ok: true });
      const channel = new RuntimeChannel({ browser });
      await expect(
        channel.send({ type: "CONTENT_READY" })
      ).resolves.toBeUndefined();
    });

    it("rejects when response contains __error", async () => {
      const browser = createMockBrowser();
      browser.runtime.sendMessage.mockResolvedValue({
        __error: "handler failed",
      });
      const channel = new RuntimeChannel({ browser });
      await expect(channel.send({ type: "CONTENT_READY" })).rejects.toThrow(
        "handler failed"
      );
    });
  });

  describe("onMessage", () => {
    it("registers a listener on browser.runtime.onMessage", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(async () => undefined);
      expect(browser.runtime.onMessage.addListener).toHaveBeenCalledOnce();
    });

    it("listener returns true (Firefox contract)", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(async () => undefined);
      const [listener] = browser.runtime.onMessage.addListener.mock.calls;
      const result = listener[0]({}, {}, vi.fn());
      expect(result).toBe(true);
    });

    it("calls sendResponse with handler result", async () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      const handler = vi.fn().mockResolvedValue("ok");
      channel.onMessage(handler);
      const [listener] = browser.runtime.onMessage.addListener.mock.calls;
      const sendResponse = vi.fn();
      listener[0]({ type: "CONTENT_READY" }, { tab: 1 }, sendResponse);
      await new Promise((r) => setTimeout(r, 0));
      expect(handler).toHaveBeenCalledWith(
        { type: "CONTENT_READY" },
        { tab: 1 }
      );
    });

    it("calls sendResponse with __error on handler rejection", async () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(() => {
        throw new Error("boom");
      });
      const [listener] = browser.runtime.onMessage.addListener.mock.calls;
      const sendResponse = vi.fn();
      listener[0]({ type: "CONTENT_READY" }, {}, sendResponse);
      // Wait for the microtask to settle
      await new Promise((r) => setTimeout(r, 0));
      expect(sendResponse).toHaveBeenCalledWith({ __error: "boom" });
    });

    it("does not register duplicate listeners on re-call", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(async () => undefined);
      channel.onMessage(async () => undefined);
      expect(browser.runtime.onMessage.addListener).toHaveBeenCalledOnce();
    });
  });

  describe("dispose", () => {
    it("removes the runtime listener", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(async () => undefined);
      channel.dispose();
      expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledOnce();
    });

    it("clears the handler reference", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      const handler = vi.fn();
      channel.onMessage(handler);
      channel.dispose();
      // After dispose, the listener is removed and handler is null.
      const [listener] = browser.runtime.onMessage.addListener.mock.calls;
      const sendResponse = vi.fn();
      listener[0]({ type: "CONTENT_READY" }, {}, sendResponse);
      expect(handler).not.toHaveBeenCalled();
    });

    it("is idempotent", () => {
      const browser = createMockBrowser();
      const channel = new RuntimeChannel({ browser });
      channel.onMessage(async () => undefined);
      channel.dispose();
      expect(() => channel.dispose()).not.toThrow();
      expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledOnce();
    });
  });
});
