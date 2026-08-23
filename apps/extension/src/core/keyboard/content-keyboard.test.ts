/**
 * Integration tests for the content-script keydown handler.
 *
 * Verifies {@link handleKeydown} correctly resolves keyboard shortcuts and
 * dispatches the resulting {@link PickerAction} through the centralized
 * {@link ActionDispatcher} — NOT through the state machine directly.
 *
 * The keyboard handler never dispatches DISMISS after COPY/DOWNLOAD; that
 * responsibility lives in the action handler (composer).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createActionDispatcher } from "../actions/dispatcher.ts";
import { PickerStateMachine } from "../machine/picker.ts";
import type { KeydownHandlerDeps } from "./handler.ts";
import { handleKeydown } from "./handler.ts";
import { createShortcutRegistry } from "./registry.ts";

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
 *
 * The `machine` is a real `PickerStateMachine` so state transitions exercise
 * the actual state machine logic. The `dispatcher` is a real
 * `ActionDispatcher` with no handlers registered — the handler dispatches to
 * it and we spy on `dispatch` to verify the action pipeline.
 */
function makeDeps(
  overrides: Partial<KeydownHandlerDeps> = {}
): KeydownHandlerDeps {
  const machine = new PickerStateMachine();
  const shadowHost = document.createElement("div");
  const dispatcher = createActionDispatcher();
  const registry = createShortcutRegistry();

  return {
    dispatcher,
    getActiveElement: () => null,
    getCurrentFormat: () => "markdown",
    isExclusionMode: () => false,
    machine,
    registry,
    shadowHost,
    ...overrides,
  };
}

/** Transition a real machine to SELECTED state so copy/download/format shortcuts are active. */
function selectElement(machine: PickerStateMachine): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({ target: document.createElement("div"), type: "CLICK" });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleKeydown — Escape", () => {
  it("dispatches DISMISS through the dispatcher in HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const machineSpy = vi.spyOn(deps.machine, "dispatch");

    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(machineSpy).not.toHaveBeenCalled();
    expect(dispatchSpy.mock.calls[0]?.[0]).toEqual({ type: "DISMISS" });
  });

  it("dispatches DISMISS through the dispatcher in SELECTED state", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    expect(deps.machine.getState()).toBe("SELECTED");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const machineSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ key: "Escape" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(machineSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DISMISS through the dispatcher in IDLE state", () => {
    const deps = makeDeps();
    expect(deps.machine.getState()).toBe("IDLE");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const machineSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(machineSpy).not.toHaveBeenCalled();
  });

  it("dispatches DISMISS through the dispatcher even when an input is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    deps.machine.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });

  it("dispatches EXCLUDE_TOGGLE when Escape pressed in exclusion mode", () => {
    const deps = makeDeps({ isExclusionMode: () => true });
    selectElement(deps.machine);
    expect(deps.machine.getState()).toBe("SELECTED");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ key: "Escape" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "EXCLUDE_TOGGLE" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("handleKeydown — c → COPY in SELECTED", () => {
  it("dispatches COPY through the dispatcher on plain c in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const machineSpy = vi.spyOn(deps.machine, "dispatch");
    const event = keyEvent({ key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(machineSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches COPY on uppercase C — case-insensitive match", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "C" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
  });

  it("dispatches COPY regardless of current format", () => {
    const deps = makeDeps({ getCurrentFormat: () => "html" });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
  });

  it("does NOT dispatch DISMISS after COPY (DISMISS lives in the action handler)", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "c" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "COPY" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch COPY when ctrl modifier is present", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "c" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — s → DOWNLOAD in SELECTED", () => {
  it("dispatches DOWNLOAD through the dispatcher on plain s in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ key: "s" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispatches DOWNLOAD on uppercase S — case-insensitive match", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "S" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
  });

  it("does NOT dispatch DISMISS after DOWNLOAD (DISMISS lives in the action handler)", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "s" }), deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch DOWNLOAD when ctrl modifier is present", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ ctrlKey: true, key: "s" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — f → FORMAT_CHANGE in SELECTED", () => {
  it("cycles markdown→html on plain f and dispatches through the dispatcher", () => {
    const deps = makeDeps();
    selectElement(deps.machine);
    expect(deps.getCurrentFormat()).toBe("markdown");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const machineSpy = vi.spyOn(deps.machine, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "html",
      type: "FORMAT_CHANGE",
    });
    expect(machineSpy).not.toHaveBeenCalled();
  });

  it("cycles html→markdown on plain f", () => {
    const deps = makeDeps({ getCurrentFormat: () => "html" });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({
      format: "markdown",
      type: "FORMAT_CHANGE",
    });
  });

  it("ctrl+shift+f does not dispatch FORMAT_CHANGE (binding removed)", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "f", shiftKey: true });

    handleKeydown(event, deps);

    // ctrl+shift+f no longer matches — falls through to shadowHost re-dispatch.
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not dispatch FORMAT_CHANGE in HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "f" }), deps);

    // No FORMAT_CHANGE dispatched — falls through to shadowHost re-dispatch.
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — input focus guard", () => {
  it("suppresses plain c when an input is focused (does not dispatch COPY)", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ key: "c" });

    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("suppresses plain s when an input is focused (does not dispatch DOWNLOAD)", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "s" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "DOWNLOAD" });
  });

  it("suppresses plain f when a textarea is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("textarea"),
    });
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");

    handleKeydown(keyEvent({ key: "f" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("still dispatches DISMISS for Escape when input is focused", () => {
    const deps = makeDeps({
      getActiveElement: () => document.createElement("input"),
    });
    deps.machine.dispatch({ type: "INVOKE" });

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "Escape" }), deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "DISMISS" });
  });

  it("does not dispatch non-shortcut keys in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "x" }), deps);

    // Unmatched key — no command dispatched to dispatcher.
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe("handleKeydown — R → RESTART in SELECTED", () => {
  it("dispatches RESTART through the dispatcher on plain r in SELECTED", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ key: "r" });
    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledWith({ type: "RESTART" });
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not dispatch RESTART in HIGHLIGHTING state", () => {
    const deps = makeDeps();
    deps.machine.dispatch({ type: "INVOKE" });
    expect(deps.machine.getState()).toBe("HIGHLIGHTING");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "r" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("does not dispatch RESTART in IDLE state", () => {
    const deps = makeDeps();
    expect(deps.machine.getState()).toBe("IDLE");

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    handleKeydown(keyEvent({ key: "r" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it("ctrl+r does not dispatch RESTART (browser reload shortcut)", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.dispatcher, "dispatch");
    const event = keyEvent({ ctrlKey: true, key: "r" });
    handleKeydown(event, deps);

    expect(dispatchSpy).not.toHaveBeenCalledWith({ type: "RESTART" });
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("handleKeydown — unmatched keys re-dispatched via shadowHost", () => {
  it("re-dispatches unmatched key on shadowHost with bubbles and composed", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.shadowHost as Element, "dispatchEvent");
    const event = keyEvent({ key: "x" });

    handleKeydown(event, deps);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const reDispatched = dispatchSpy.mock
      .calls[0]?.[0] as unknown as KeyboardEvent;
    expect(reDispatched).toBeInstanceOf(KeyboardEvent);
    expect(reDispatched.bubbles).toBe(true);
    expect(reDispatched.composed).toBe(true);
    expect(reDispatched.key).toBe("x");
    expect(event.defaultPrevented).toBe(false);
  });

  it("preserves modifier state on the re-dispatched event", () => {
    const deps = makeDeps();
    selectElement(deps.machine);

    const dispatchSpy = vi.spyOn(deps.shadowHost as Element, "dispatchEvent");
    handleKeydown(
      keyEvent({ altKey: true, ctrlKey: true, key: "z", shiftKey: true }),
      deps
    );

    const reDispatched = dispatchSpy.mock
      .calls[0]?.[0] as unknown as KeyboardEvent;
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

    const dispatchSpy = vi.spyOn(deps.shadowHost as Element, "dispatchEvent");
    handleKeydown(keyEvent({ key: "c" }), deps);

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
