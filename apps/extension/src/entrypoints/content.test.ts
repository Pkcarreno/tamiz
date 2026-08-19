/**
 * Tests for content script helpers: relayed click handling and blocking
 * state synchronization.
 *
 * The actual content.ts entry point is a WXT defineContentScript with
 * side effects. These tests exercise the extracted pure helpers that
 * will be imported by content.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PickerStateMachine } from "../core/machine/picker.ts";
import {
  handleRelayedClick,
  READY_TIMEOUT_MS,
  syncBlockingState,
} from "./content.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Install a fake `elementFromPoint` on the document (jsdom lacks it). */
function installElementFromPoint() {
  const map = new Map<number, Element | null>();
  const spy = vi.fn((x: number, y: number) => map.get(`${x},${y}`) ?? null);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: spy,
    writable: true,
  });
  return {
    set(x: number, y: number, el: Element | null) {
      map.set(`${x},${y}`, el);
    },
    spy,
  };
}

function createMockMachine(state: string): PickerStateMachine {
  return {
    dispatch: vi.fn(),
    getState: vi.fn().mockReturnValue(state),
  } as unknown as PickerStateMachine;
}

function createRelayEvent(clientX: number, clientY: number): CustomEvent {
  return new CustomEvent("tamiz:blocking-click", {
    detail: { clientX, clientY },
  });
}

// ---------------------------------------------------------------------------
// handleRelayedClick
// ---------------------------------------------------------------------------

describe("handleRelayedClick", () => {
  let efp: ReturnType<typeof installElementFromPoint>;

  beforeEach(() => {
    efp = installElementFromPoint();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches CLICK to machine when state is HIGHLIGHTING", () => {
    const machine = createMockMachine("HIGHLIGHTING");
    const target = document.createElement("div");
    efp.set(100, 200, target);

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, machine);

    expect(efp.spy).toHaveBeenCalledWith(100, 200);
    expect(machine.dispatch).toHaveBeenCalledWith({
      target,
      type: "CLICK",
    });
  });

  it("ignores relayed click when state is not HIGHLIGHTING", () => {
    const machine = createMockMachine("IDLE");

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, machine);

    expect(machine.dispatch).not.toHaveBeenCalled();
  });

  it("ignores relayed click when state is SELECTED", () => {
    const machine = createMockMachine("SELECTED");

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, machine);

    expect(machine.dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when elementFromPoint returns null", () => {
    const machine = createMockMachine("HIGHLIGHTING");
    // Default: elementFromPoint returns null for all coords

    const event = createRelayEvent(999, 999);
    handleRelayedClick(event, machine);

    expect(efp.spy).toHaveBeenCalledWith(999, 999);
    expect(machine.dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when elementFromPoint returns the document element", () => {
    const machine = createMockMachine("HIGHLIGHTING");
    efp.set(50, 50, document.documentElement);

    const event = createRelayEvent(50, 50);
    handleRelayedClick(event, machine);

    expect(machine.dispatch).not.toHaveBeenCalled();
  });

  it("uses correct coordinates from event detail", () => {
    const machine = createMockMachine("HIGHLIGHTING");
    const target = document.createElement("button");
    efp.set(350, 420, target);

    const event = createRelayEvent(350, 420);
    handleRelayedClick(event, machine);

    expect(efp.spy).toHaveBeenCalledWith(350, 420);
    expect(machine.dispatch).toHaveBeenCalledWith({
      target,
      type: "CLICK",
    });
  });
});

// ---------------------------------------------------------------------------
// syncBlockingState
// ---------------------------------------------------------------------------

describe("syncBlockingState", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches enable event when state transitions to HIGHLIGHTING", () => {
    const dispatchEventSpy = vi
      .spyOn(document, "dispatchEvent")
      .mockReturnValue(true);

    syncBlockingState("HIGHLIGHTING");

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tamiz:blocking-enable",
      })
    );
  });

  it("dispatches disable event when state transitions to IDLE", () => {
    const dispatchEventSpy = vi
      .spyOn(document, "dispatchEvent")
      .mockReturnValue(true);

    syncBlockingState("IDLE");

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tamiz:blocking-disable",
      })
    );
  });

  it("does not dispatch any event when state is SELECTED", () => {
    const dispatchEventSpy = vi
      .spyOn(document, "dispatchEvent")
      .mockReturnValue(true);

    syncBlockingState("SELECTED");

    const blockingEvents = dispatchEventSpy.mock.calls.filter(
      ([event]) =>
        event instanceof CustomEvent &&
        (event.type === "tamiz:blocking-enable" ||
          event.type === "tamiz:blocking-disable")
    );
    expect(blockingEvents).toHaveLength(0);
  });

  it("enable event has no detail payload", () => {
    const dispatchEventSpy = vi
      .spyOn(document, "dispatchEvent")
      .mockReturnValue(true);

    syncBlockingState("HIGHLIGHTING");

    const enableEvent = dispatchEventSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(enableEvent.detail).toBeFalsy();
  });

  it("disable event has no detail payload", () => {
    const dispatchEventSpy = vi
      .spyOn(document, "dispatchEvent")
      .mockReturnValue(true);

    syncBlockingState("IDLE");

    const disableEvent = dispatchEventSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(disableEvent.detail).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("content constants", () => {
  it("READY_TIMEOUT_MS is 500", () => {
    expect(READY_TIMEOUT_MS).toBe(500);
  });
});
