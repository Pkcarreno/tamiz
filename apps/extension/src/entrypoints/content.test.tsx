/**
 * Tests for content script helpers: relayed click handling and blocking
 * state synchronization.
 *
 * The actual content.ts entry point is a WXT defineContentScript with
 * side effects. These tests exercise the extracted pure helpers that
 * will be imported by content.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PickerSession } from "../core/session/session.ts";
import type { PickerSessionSnapshot } from "../core/session/types.ts";
import {
  READY_TIMEOUT_MS,
  TAMIZ_BLOCKING_CLICK,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_SHUTDOWN,
} from "../lib/messaging/constants.ts";
import type { BlockingClickMessage } from "../lib/messaging/types.ts";
import {
  applyThemePreference,
  createDocumentListenerController,
  handleRelayedClick,
  syncBlockingState,
} from "./content.tsx";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Install a fake `elementFromPoint` on the document (simulates coordinate hit-testing in test environments). */
function installElementFromPoint() {
  const map = new Map<string, Element | null>();
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

function createMockSession(state: string): PickerSession {
  return {
    dispatch: vi.fn(),
    getSnapshot: vi.fn().mockReturnValue({ state }),
  } as unknown as PickerSession;
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

  it("dispatches SELECT to session when state is HIGHLIGHTING", () => {
    const session = createMockSession("HIGHLIGHTING");
    const target = document.createElement("div");
    efp.set(100, 200, target);

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, session);

    expect(efp.spy).toHaveBeenCalledWith(100, 200);
    expect(session.dispatch).toHaveBeenCalledWith({
      target,
      type: "SELECT",
    });
  });

  it("ignores relayed click when state is not HIGHLIGHTING", () => {
    const session = createMockSession("IDLE");

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, session);

    expect(session.dispatch).not.toHaveBeenCalled();
  });

  it("ignores relayed click when state is SELECTED", () => {
    const session = createMockSession("SELECTED");

    const event = createRelayEvent(100, 200);
    handleRelayedClick(event, session);

    expect(session.dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when elementFromPoint returns null", () => {
    const session = createMockSession("HIGHLIGHTING");
    // Default: elementFromPoint returns null for all coords

    const event = createRelayEvent(999, 999);
    handleRelayedClick(event, session);

    expect(efp.spy).toHaveBeenCalledWith(999, 999);
    expect(session.dispatch).not.toHaveBeenCalled();
  });

  it("does not dispatch when elementFromPoint returns the document element", () => {
    const session = createMockSession("HIGHLIGHTING");
    efp.set(50, 50, document.documentElement);

    const event = createRelayEvent(50, 50);
    handleRelayedClick(event, session);

    expect(session.dispatch).not.toHaveBeenCalled();
  });

  it("uses correct coordinates from event detail", () => {
    const session = createMockSession("HIGHLIGHTING");
    const target = document.createElement("button");
    efp.set(350, 420, target);

    const event = createRelayEvent(350, 420);
    handleRelayedClick(event, session);

    expect(efp.spy).toHaveBeenCalledWith(350, 420);
    expect(session.dispatch).toHaveBeenCalledWith({
      target,
      type: "SELECT",
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

  function createMockChannel() {
    return { send: vi.fn().mockResolvedValue(undefined) };
  }

  it("posts enable message when state transitions to HIGHLIGHTING", () => {
    const channel = createMockChannel();
    syncBlockingState("HIGHLIGHTING", channel as never);
    expect(channel.send).toHaveBeenCalledWith({ type: TAMIZ_BLOCKING_ENABLE });
  });

  it("posts disable message when state transitions to IDLE", () => {
    const channel = createMockChannel();
    syncBlockingState("IDLE", channel as never);
    expect(channel.send).toHaveBeenCalledWith({ type: TAMIZ_BLOCKING_DISABLE });
  });

  it("does not post any message when state is SELECTED", () => {
    const channel = createMockChannel();
    syncBlockingState("SELECTED", channel as never);
    expect(channel.send).not.toHaveBeenCalled();
  });

  it("enable message has type field only", () => {
    const channel = createMockChannel();
    syncBlockingState("HIGHLIGHTING", channel as never);
    expect(channel.send).toHaveBeenCalledWith({ type: TAMIZ_BLOCKING_ENABLE });
  });

  it("disable message has type field only", () => {
    const channel = createMockChannel();
    syncBlockingState("IDLE", channel as never);
    expect(channel.send).toHaveBeenCalledWith({ type: TAMIZ_BLOCKING_DISABLE });
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

// ---------------------------------------------------------------------------
// applyThemePreference
// ---------------------------------------------------------------------------

describe("applyThemePreference", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });

  it("adds dark class to host when preference is 'dark'", () => {
    const host = document.createElement("div");
    applyThemePreference("dark", host);
    expect(host.classList.contains("dark")).toBe(true);
  });

  it("removes dark class from host when preference is 'light'", () => {
    const host = document.createElement("div");
    host.classList.add("dark");
    applyThemePreference("light", host);
    expect(host.classList.contains("dark")).toBe(false);
  });

  it("does not add dark class when preference is 'light' and host has no class", () => {
    const host = document.createElement("div");
    applyThemePreference("light", host);
    expect(host.classList.contains("dark")).toBe(false);
  });

  it("falls back to system detection when preference is 'auto'", () => {
    const host = document.createElement("div");
    applyThemePreference("auto", host);
    // Without system dark mode configured in the test environment, matchMedia defaults
    // to light theme, so the function should not add the dark class.
    expect(host.classList.contains("dark")).toBe(false);
  });

  it("handles null host gracefully", () => {
    expect(() => applyThemePreference("dark", null)).not.toThrow();
    expect(() => applyThemePreference("light", null)).not.toThrow();
    expect(() => applyThemePreference("auto", null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createDocumentListenerController
// ---------------------------------------------------------------------------

describe("createDocumentListenerController", () => {
  function makeSnapshot(
    overrides: Partial<PickerSessionSnapshot> = {}
  ): PickerSessionSnapshot {
    return {
      excludedElements: new Set(),
      format: "markdown",
      isExclusionMode: false,
      selectedElement: null,
      state: "IDLE",
      ...overrides,
    };
  }

  function setupController() {
    const doc = document.implementation.createHTMLDocument();
    const onClick = vi.fn();
    const onKeydown = vi.fn();
    const onMousemove = vi.fn();

    const controller = createDocumentListenerController({
      doc,
      onClick,
      onKeydown,
      onMousemove,
    });

    return {
      controller,
      doc,
      onClick,
      onKeydown,
      onMousemove,
    };
  }

  it("does not attach any listeners when initial state is IDLE", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    controller.update(makeSnapshot({ state: "IDLE" }));

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).not.toHaveBeenCalled();
    expect(onMousemove).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("attaches keydown, mousemove, and click in HIGHLIGHTING state", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    controller.update(makeSnapshot({ state: "HIGHLIGHTING" }));

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onMousemove).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("attaches only keydown in SELECTED state when not in exclusion mode", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    controller.update(
      makeSnapshot({
        isExclusionMode: false,
        state: "SELECTED",
      })
    );

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onMousemove).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("attaches mousemove and click in exclusion mode during SELECTED", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    // First transition to SELECTED
    controller.update(
      makeSnapshot({ isExclusionMode: false, state: "SELECTED" })
    );

    // Then toggle exclusion mode
    controller.update(
      makeSnapshot({ isExclusionMode: true, state: "SELECTED" })
    );

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).toHaveBeenCalledTimes(1);
    expect(onMousemove).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("detaches all listeners when transitioning back to IDLE", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    controller.update(makeSnapshot({ state: "HIGHLIGHTING" }));
    controller.update(makeSnapshot({ state: "IDLE" }));

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).not.toHaveBeenCalled();
    expect(onMousemove).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("dispose() removes all attached listeners immediately", () => {
    const { controller, doc, onClick, onKeydown, onMousemove } =
      setupController();

    controller.update(makeSnapshot({ state: "HIGHLIGHTING" }));
    controller.dispose();

    doc.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));
    doc.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onKeydown).not.toHaveBeenCalled();
    expect(onMousemove).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
