/**
 * Integration tests for the content-script keydown handler.
 *
 * Verifies {@link handleKeydown} correctly wires the keyboard shortcut registry
 * to the picker state machine: Escape dismiss, Ctrl/Meta+c copy, f format-cycle,
 * input-focus suppression, and shadow-host re-dispatch of unmatched keys.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { KeydownHandlerDeps } from "../src/lib/keyboard/handler.ts";
import { handleKeydown } from "../src/lib/keyboard/handler.ts";
import { PickerStateMachine } from "../src/lib/picker.ts";

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
 * Build a fully mocked deps object for {@link handleKeydown}.
 *
 * The returned `machine` is a real `PickerStateMachine` so state transitions
 * exercise the actual state machine logic. Format tracking uses an internal
 * variable so `getCurrentFormat`/`setFormat` behave like a SolidJS signal pair.
 */
function makeDeps(
  overrides: Partial<KeydownHandlerDeps> = {}
): KeydownHandlerDeps {
  let format: "markdown" | "html" = "markdown";
  const machine = new PickerStateMachine();
  const shadowHost = document.createElement("div");

  return {
    getActiveElement: () => null,
    getCurrentFormat: () => format,
    machine,
    setFormat: (f) => {
      format = f;
    },
    shadowHost,
    ...overrides,
  };
}

/** Transition a machine to SELECTED state so copy/download/format shortcuts are active. */
function selectElement(machine: PickerStateMachine): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({ target: document.createElement("div"), type: "CLICK" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleKeydown — Escape", () => {
  it("dispatches DISMISS in HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const event = keyEvent({ key: "Escape" });
    const preventDefault = vi.spyOn(event, "preventDefault");
    const stopPropagation = vi.spyOn(event, "stopPropagation");
    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it("dispatches DISMISS in SELECTED state", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    expect(deps.machine.getState()).toBe("SELECTED");

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ key: "Escape" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DISMISS in IDLE state", () => {
    const deps = makeDeps();
    expect(deps.machine.getState()).toBe("IDLE");

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("dispatches DISMISS even when an input element is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    deps.machine.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("handleKeydown — Ctrl+c / Meta+c → COPY in SELECTED", () => {
  it("dispatches COPY on ctrl+c in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches COPY on meta+c in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ key: "c", metaKey: true });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not dispatch COPY when format is html", () => {
    const deps = makeDeps();
    deps.setFormat("html");
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
  });

  it("dispatches DISMISS after COPY to close the picker", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy.mock.calls[0][0]).toEqual({ type: "COPY" });
    expect(dispatchSpy.mock.calls[1][0]).toEqual({ type: "DISMISS" });
  });
});

describe("handleKeydown — Ctrl+s / Meta+s → DOWNLOAD in SELECTED", () => {
  it("dispatches DOWNLOAD on ctrl+s in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "s" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DOWNLOAD on meta+s in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ key: "s", metaKey: true });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DISMISS after DOWNLOAD to close the picker", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "s" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy.mock.calls[0][0]).toEqual({ type: "DOWNLOAD" });
    expect(dispatchSpy.mock.calls[1][0]).toEqual({ type: "DISMISS" });
  });
});

describe("handleKeydown — f → FORMAT_CHANGE in SELECTED", () => {
  it("cycles markdown→html on plain f", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    expect(deps.getCurrentFormat()).toBe("markdown");

    const setFormatSpy = vi.fn();
    const depsWithSpy = makeDeps({ setFormat: setFormatSpy });
    selectElement(depsWithSpy.machine);

    const dispatchSpy = vi.spyOn(depsWithSpy.machine, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), depsWithSpy);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
    expect(setFormatSpy).toHaveBeenCalledWith("html");
  });

  it("cycles html→markdown on plain f", () => {
    let format: "markdown" | "html" = "html";
    const deps = makeDeps({
      getCurrentFormat: () => format,
      setFormat: (f) => {
        format = f;
      },
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "markdown",
      type: "FORMAT_CHANGE",
    });
    expect(deps.getCurrentFormat()).toBe("markdown");
  });

  it("cycles format on ctrl+shift+f", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "f", shiftKey: true });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not cycle format in HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    // No FORMAT_CHANGE dispatched — falls through to shadowHost re-dispatch.
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — input focus guard", () => {
  it("suppresses ctrl+c when an input is focused (does not dispatch COPY)", () => {
    const deps = makeDeps({
      getActiveElement: () => {
        const input = document.createElement("input");
        return input;
      },
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("suppresses meta+c when an input is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "c", metaKey: true }), deps);

    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "COPY" });
  });

  it("suppresses plain f when a textarea is focused", () => {
    const setFormatSpy = vi.fn();
    const deps = makeDeps({
      getActiveElement: () => document.createElement("textarea"),
      setFormat: setFormatSpy,
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");

    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(setFormatSpy).not.toHaveBeenCalled();
  });

  it("still dispatches DISMISS for Escape when input is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    deps.machine.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not suppress non-input, non-Escape keys in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "x" }), deps);

    // Unmatched key — no command dispatched to machine.
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — unmatched keys re-dispatched via shadowHost", () => {
  it("re-dispatches unmatched key on shadowHost with bubbles and composed", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.shadowHost, "dispatchEvent");
    const event = keyEvent({ key: "x" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const reDispatched = dispatchSpy.mock.calls[0][0] as KeyboardEvent;
    expect(reDispatched).toBeInstanceOf(KeyboardEvent);
    expect(reDispatched.bubbles).toBe(true);
    expect(reDispatched.composed).toBe(true);
    expect(reDispatched.key).toBe("x");
    expect(event.defaultPrevented).toBe(false);
  });

  it("preserves modifier state on the re-dispatched event", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.shadowHost, "dispatchEvent");
    handleKeydown(
      keyEvent({ altKey: true, ctrlKey: true, key: "z", shiftKey: true }),
      deps
    );

    const reDispatched = dispatchSpy.mock.calls[0][0] as KeyboardEvent;
    expect(reDispatched.ctrlKey).toBe(true);
    expect(reDispatched.altKey).toBe(true);
    expect(reDispatched.shiftKey).toBe(true);
    expect(reDispatched.metaKey).toBe(false);
  });

  it("does not re-dispatch when shadowHost is null", () => {
    const deps = makeDeps({ shadowHost: null });
    selectElement(deps.machine);

    // Should not throw.
    expect(() => handleKeydown(keyEvent({ key: "x" }), deps)).not.toThrow();
  });

  it("does not re-dispatch when a shortcut matches", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.shadowHost, "dispatchEvent");
    handleKeydown(keyEvent({ ctrlKey: true, key: "c" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
