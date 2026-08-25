import { describe, expect, it, vi } from "vitest";

import { createActionDispatcher } from "./dispatcher.ts";

describe("createActionDispatcher", () => {
  describe("dispatch + on lifecycle", () => {
    it("delivers a dispatched COPY action to its registered handler", () => {
      const dispatcher = createActionDispatcher();
      const handler = vi.fn();

      dispatcher.on("COPY", handler);
      dispatcher.dispatch({ type: "COPY" });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ type: "COPY" });
    });

    it("passes the full FORMAT_CHANGE payload to its handler", () => {
      const dispatcher = createActionDispatcher();
      const handler = vi.fn();

      dispatcher.on("FORMAT_CHANGE", handler);
      dispatcher.dispatch({ format: "html", type: "FORMAT_CHANGE" });

      expect(handler).toHaveBeenCalledWith({
        format: "html",
        type: "FORMAT_CHANGE",
      });
    });

    it("passes the full INVOKE payload including optional format", () => {
      const dispatcher = createActionDispatcher();
      const handler = vi.fn();

      dispatcher.on("INVOKE", handler);
      dispatcher.dispatch({ format: "html", type: "INVOKE" });

      expect(handler).toHaveBeenCalledWith({
        format: "html",
        type: "INVOKE",
      });
    });
  });

  describe("type isolation", () => {
    it("does not deliver COPY handler when DOWNLOAD is dispatched", () => {
      const dispatcher = createActionDispatcher();
      const copyHandler = vi.fn();

      dispatcher.on("COPY", copyHandler);
      dispatcher.dispatch({ type: "DOWNLOAD" });

      expect(copyHandler).not.toHaveBeenCalled();
    });

    it("supports multiple handlers for the same action type", () => {
      const dispatcher = createActionDispatcher();
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      dispatcher.on("COPY", handlerA);
      dispatcher.on("COPY", handlerB);
      dispatcher.dispatch({ type: "COPY" });

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
    });
  });

  describe("unsubscribe", () => {
    it("stops delivering after the returned function is called", () => {
      const dispatcher = createActionDispatcher();
      const handler = vi.fn();

      const unsubscribe = dispatcher.on("COPY", handler);
      unsubscribe();
      dispatcher.dispatch({ type: "COPY" });

      expect(handler).not.toHaveBeenCalled();
    });

    it("unsubscribe is idempotent (second call does not throw)", () => {
      const dispatcher = createActionDispatcher();
      const handler = vi.fn();

      const unsubscribe = dispatcher.on("COPY", handler);
      unsubscribe();

      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe("unknown action type", () => {
    it("silently drops COPY when no handler is registered (no throw)", () => {
      const dispatcher = createActionDispatcher();

      expect(() => dispatcher.dispatch({ type: "COPY" })).not.toThrow();
    });

    it("dispatching an unhandled action does not affect registered handlers", () => {
      const dispatcher = createActionDispatcher();
      const dismissHandler = vi.fn();

      dispatcher.on("DISMISS", dismissHandler);
      dispatcher.dispatch({ type: "COPY" });

      expect(dismissHandler).not.toHaveBeenCalled();
    });
  });
});
