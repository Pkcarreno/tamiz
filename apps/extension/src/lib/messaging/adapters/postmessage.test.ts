import { describe, expect, it, vi } from "vitest";
import {
  TAMIZ_BLOCKING_CLICK,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_READY,
  TAMIZ_BLOCKING_SHUTDOWN,
} from "../constants.ts";
import { PostMessageChannel } from "./postmessage.ts";

describe("PostMessageChannel", () => {
  describe("send", () => {
    it("calls window.postMessage with targetOrigin *", () => {
      const spy = vi.spyOn(window, "postMessage");
      const channel = new PostMessageChannel();
      channel.send({ type: TAMIZ_BLOCKING_ENABLE });
      expect(spy).toHaveBeenCalledWith({ type: TAMIZ_BLOCKING_ENABLE }, "*");
      spy.mockRestore();
    });

    it("sends click message with coordinates", () => {
      const spy = vi.spyOn(window, "postMessage");
      const channel = new PostMessageChannel();
      channel.send({ clientX: 10, clientY: 20, type: TAMIZ_BLOCKING_CLICK });
      expect(spy).toHaveBeenCalledWith(
        { clientX: 10, clientY: 20, type: TAMIZ_BLOCKING_CLICK },
        "*"
      );
      spy.mockRestore();
    });

    it("throws after dispose", () => {
      const channel = new PostMessageChannel();
      channel.dispose();
      expect(() => channel.send({ type: TAMIZ_BLOCKING_ENABLE })).toThrow(
        "PostMessageChannel: send after dispose"
      );
    });
  });

  describe("onMessage", () => {
    it("receives messages with known type", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: TAMIZ_BLOCKING_READY } })
      );
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: TAMIZ_BLOCKING_READY }),
        null
      );
    });

    it("ignores messages with unknown type", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: "unknown:event" } })
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores messages with non-object data", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      window.dispatchEvent(new MessageEvent("message", { data: "string" }));
      window.dispatchEvent(new MessageEvent("message", { data: null }));
      window.dispatchEvent(new MessageEvent("message", { data: 42 }));
      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores messages with null data", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: null } })
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it("receives all five protocol message types", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      const types = [
        TAMIZ_BLOCKING_ENABLE,
        TAMIZ_BLOCKING_DISABLE,
        TAMIZ_BLOCKING_SHUTDOWN,
        TAMIZ_BLOCKING_READY,
        TAMIZ_BLOCKING_CLICK,
      ];
      for (const type of types) {
        window.dispatchEvent(new MessageEvent("message", { data: { type } }));
      }
      expect(handler).toHaveBeenCalledTimes(5);
    });

    it("does not register duplicate listeners on re-call", () => {
      const spy = vi.spyOn(window, "addEventListener");
      const channel = new PostMessageChannel();
      channel.onMessage(async () => undefined);
      channel.onMessage(async () => undefined);
      expect(spy).toHaveBeenCalledWith("message", expect.any(Function));
      expect(spy).toHaveBeenCalledOnce();
      spy.mockRestore();
    });

    it("throws after dispose", () => {
      const channel = new PostMessageChannel();
      channel.dispose();
      expect(() => channel.onMessage(async () => undefined)).toThrow(
        "PostMessageChannel: onMessage after dispose"
      );
    });
  });

  describe("dispose", () => {
    it("removes the window message listener", () => {
      const spy = vi.spyOn(window, "removeEventListener");
      const channel = new PostMessageChannel();
      channel.onMessage(async () => undefined);
      channel.dispose();
      expect(spy).toHaveBeenCalledWith("message", expect.any(Function));
      spy.mockRestore();
    });

    it("is idempotent", () => {
      const channel = new PostMessageChannel();
      channel.onMessage(async () => undefined);
      channel.dispose();
      expect(() => channel.dispose()).not.toThrow();
    });

    it("stops receiving messages after dispose", () => {
      const channel = new PostMessageChannel();
      const handler = vi.fn().mockResolvedValue(undefined);
      channel.onMessage(handler);
      channel.dispose();
      window.dispatchEvent(
        new MessageEvent("message", { data: { type: TAMIZ_BLOCKING_ENABLE } })
      );
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
