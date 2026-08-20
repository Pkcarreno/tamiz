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
import type { BlockingClickMessage } from "../lib/cross-world-protocol.ts";
import {
  READY_TIMEOUT_MS,
  TAMIZ_BLOCKING_CLICK,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_SHUTDOWN,
} from "../lib/cross-world-protocol.ts";
import { handleRelayedClick, syncBlockingState } from "./content.ts";

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

function createRelayEvent(
  clientX: number,
  clientY: number
): BlockingClickMessage {
  return { clientX, clientY, type: TAMIZ_BLOCKING_CLICK };
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

  it("posts enable message when state transitions to HIGHLIGHTING", () => {
    const postMessageSpy = vi
      .spyOn(window, "postMessage")
      .mockReturnValue(undefined as never);

    syncBlockingState("HIGHLIGHTING");

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: TAMIZ_BLOCKING_ENABLE },
      "*"
    );
  });

  it("posts disable message when state transitions to IDLE", () => {
    const postMessageSpy = vi
      .spyOn(window, "postMessage")
      .mockReturnValue(undefined as never);

    syncBlockingState("IDLE");

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: TAMIZ_BLOCKING_DISABLE },
      "*"
    );
  });

  it("does not post any message when state is SELECTED", () => {
    const postMessageSpy = vi
      .spyOn(window, "postMessage")
      .mockReturnValue(undefined as never);

    syncBlockingState("SELECTED");

    const blockingCalls = postMessageSpy.mock.calls.filter(
      ([data]) =>
        typeof data === "object" &&
        data !== null &&
        "type" in data &&
        ((data as { type: string }).type === TAMIZ_BLOCKING_ENABLE ||
          (data as { type: string }).type === TAMIZ_BLOCKING_DISABLE)
    );
    expect(blockingCalls).toHaveLength(0);
  });

  it("enable message has type field only", () => {
    const postMessageSpy = vi
      .spyOn(window, "postMessage")
      .mockReturnValue(undefined as never);

    syncBlockingState("HIGHLIGHTING");

    const [enableCall] = postMessageSpy.mock.calls;
    expect(enableCall[0]).toEqual({ type: TAMIZ_BLOCKING_ENABLE });
  });

  it("disable message has type field only", () => {
    const postMessageSpy = vi
      .spyOn(window, "postMessage")
      .mockReturnValue(undefined as never);

    syncBlockingState("IDLE");

    const [disableCall] = postMessageSpy.mock.calls;
    expect(disableCall[0]).toEqual({ type: TAMIZ_BLOCKING_DISABLE });
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

// ---------------------------------------------------------------------------
// Shutdown lifecycle
// ---------------------------------------------------------------------------

describe("shutdown lifecycle", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shutdown message constant is defined", () => {
    expect(TAMIZ_BLOCKING_SHUTDOWN).toBe("tamiz:blocking-shutdown");
  });

  it("shutdown message has correct shape", () => {
    const message = { type: TAMIZ_BLOCKING_SHUTDOWN };
    expect(message).toEqual({ type: "tamiz:blocking-shutdown" });
  });
});
