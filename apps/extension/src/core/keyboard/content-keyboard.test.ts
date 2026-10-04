/**
 * Integration tests for the content-script keydown handler.
 *
 * Verifies {@link handleKeydown} correctly resolves keyboard shortcuts and
 * dispatches the resulting {@link PickerAction} through the session controller.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createPickerSession, type PickerSession } from "../session/session.ts";
import type { KeydownHandlerDeps } from "./handler.ts";
import { handleKeydown } from "./handler.ts";

/** Build a real KeyboardEvent for the given key and modifier state. */
function keyEvent(config: {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}): KeyboardEvent {
  return new KeyboardEvent("keydown", { ...config, cancelable: true });
}

/**
 * Build a fully wired deps object for {@link handleKeydown}.
 */
function makeDeps(
  overrides: Partial<KeydownHandlerDeps> = {}
): KeydownHandlerDeps {
  const session = createPickerSession({
    htmlConverter: {
      convert: vi.fn(),
      extractContent: vi.fn((el) => el),
    },
    sendMessage: vi.fn(),
  });

  return {
    getActiveElement: () => null,
    session,
    ...overrides,
  };
}

/** Transition a real session to SELECTED state so copy/download/format shortcuts are active. */
async function selectElement(session: PickerSession): Promise<void> {
  await session.dispatch({ type: "INVOKE" });
  await session.dispatch({
    target: document.createElement("div"),
    type: "SELECT",
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleKeydown — Escape", () => {
  it("dispatches DISMISS through the session in HIGHLIGHTING state", async () => {
    const deps = makeDeps();
    await deps.session.dispatch({ type: "INVOKE" });
    expect(deps.session.getSnapshot().state).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");

    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("dispatches DISMISS through the session in SELECTED state", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);
    expect(deps.session.getSnapshot().state).toBe("SELECTED");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "Escape" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DISMISS through the session in IDLE state", () => {
    const deps = makeDeps();
    expect(deps.session.getSnapshot().state).toBe("IDLE");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("dispatches DISMISS through the session even when an input is focused", async () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    await deps.session.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("dispatches EXCLUDE_TOGGLE when Escape pressed in exclusion mode", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);
    await deps.session.dispatch({ type: "EXCLUDE_TOGGLE" });
    expect(deps.session.getSnapshot().isExclusionMode).toBe(true);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "Escape" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "EXCLUDE_TOGGLE" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("handleKeydown — c → COPY in SELECTED", () => {
  it("dispatches COPY through the session on plain c in SELECTED", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches COPY on uppercase C — case-insensitive match", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "C" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
  });

  it("dispatches COPY regardless of current format", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);
    await deps.session.dispatch({ format: "html", type: "FORMAT_CHANGE" });

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
  });

  it("does NOT dispatch DISMISS after COPY (DISMISS lives in the action handler)", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch COPY when ctrl modifier is present", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "c" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — s → DOWNLOAD in SELECTED", () => {
  it("dispatches DOWNLOAD through the session on plain s in SELECTED", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "s" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DOWNLOAD on uppercase S — case-insensitive match", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "S" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
  });

  it("does NOT dispatch DISMISS after DOWNLOAD (DISMISS lives in the action handler)", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "s" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch DOWNLOAD when ctrl modifier is present", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "s" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — f → FORMAT_CHANGE in SELECTED", () => {
  it("cycles markdown→html on plain f and dispatches through the session", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);
    expect(deps.session.getSnapshot().format).toBe("markdown");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
  });

  it("cycles html→markdown on plain f", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);
    await deps.session.dispatch({ format: "html", type: "FORMAT_CHANGE" });

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "markdown",
      type: "FORMAT_CHANGE",
    });
  });

  it("ctrl+shift+f does not dispatch FORMAT_CHANGE (binding removed)", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "f", shiftKey: true });

    handleKeydown(event, deps);

    // ctrl+shift+f no longer matches — event is ignored.
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not dispatch FORMAT_CHANGE in HIGHLIGHTING state", async () => {
    const deps = makeDeps();
    await deps.session.dispatch({ type: "INVOKE" });
    expect(deps.session.getSnapshot().state).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — input focus guard", () => {
  it("suppresses plain c when an input is focused (does not dispatch COPY)", async () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("suppresses plain s when an input is focused (does not dispatch DOWNLOAD)", async () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "s" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DOWNLOAD" });
  });

  it("suppresses plain f when a textarea is focused", async () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("textarea"),
    });
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");

    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("still dispatches DISMISS for Escape when input is focused", async () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    await deps.session.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch non-shortcut keys in SELECTED", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "x" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — R → RESTART in SELECTED", () => {
  it("dispatches RESTART through the session on plain r in SELECTED", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "r" });
    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "RESTART" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not dispatch RESTART in HIGHLIGHTING state", async () => {
    const deps = makeDeps();
    await deps.session.dispatch({ type: "INVOKE" });
    expect(deps.session.getSnapshot().state).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "r" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("does not dispatch RESTART in IDLE state", () => {
    const deps = makeDeps();
    expect(deps.session.getSnapshot().state).toBe("IDLE");

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    handleKeydown(keyEvent({ key: "r" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("ctrl+r does not dispatch RESTART (browser reload shortcut)", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "r" });
    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "RESTART" });
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("handleKeydown — unmatched keys", () => {
  it("leaves unmatched keys unconsumed so native event propagation continues", async () => {
    const deps = makeDeps();
    await selectElement(deps.session);

    const dispatchSpy = vi.spyOn(deps.session, "dispatch");
    const event = keyEvent({ key: "x" });

    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not cause infinite recursion when typing in an input with mounted shadowHost", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const host = document.createElement("tamiz-picker");
    document.body.appendChild(host);

    const deps = makeDeps({
      getActiveElement: () => input,
    });

    const keydownListener = (event: KeyboardEvent) => {
      handleKeydown(event, deps);
    };
    document.addEventListener("keydown", keydownListener);

    try {
      const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "a",
      });

      // Dispatching a keystroke on the input must not blow call stack
      expect(() => {
        input.dispatchEvent(event);
      }).not.toThrow();
      expect(event.defaultPrevented).toBe(false);
    } finally {
      document.removeEventListener("keydown", keydownListener);
      input.remove();
      host.remove();
    }
  });

  it("handles rapid consecutive typing in an input without lag or recursion", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const host = document.createElement("tamiz-picker");
    document.body.appendChild(host);

    const deps = makeDeps({
      getActiveElement: () => input,
    });

    const keydownListener = (event: KeyboardEvent) => {
      handleKeydown(event, deps);
    };
    document.addEventListener("keydown", keydownListener);

    try {
      const text = "The quick brown fox jumps over the lazy dog";
      for (const char of text) {
        const event = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: char,
        });
        input.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
    } finally {
      document.removeEventListener("keydown", keydownListener);
      input.remove();
      host.remove();
    }
  });
});
