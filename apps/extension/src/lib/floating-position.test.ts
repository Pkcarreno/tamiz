import { createRoot, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFloatingPosition } from "./floating-position.ts";

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: vi.fn(),
  computePosition: vi.fn(),
  flip: vi.fn(() => ({ name: "flip" })),
  offset: vi.fn(() => ({ name: "offset" })),
  shift: vi.fn(() => ({ name: "shift" })),
}));

import { autoUpdate, computePosition } from "@floating-ui/dom";

const computePositionMock = vi.mocked(computePosition);
const autoUpdateMock = vi.mocked(autoUpdate);

/** Create a fake element with a stable identity for reference/floating args. */
function makeElement(tag = "div"): Element {
  return document.createElement(tag);
}

describe("useFloatingPosition", () => {
  beforeEach(() => {
    computePositionMock.mockResolvedValue({
      middlewareData: {},
      placement: "right-start",
      strategy: "fixed",
      x: 100,
      y: 200,
    });
    autoUpdateMock.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    computePositionMock.mockReset();
    autoUpdateMock.mockReset();
  });

  it("returns initial position from computePosition", async () => {
    const element = makeElement();
    const floating = document.createElement("div");

    const [reference] = createSignal<Element | null>(element);
    const [floatingRef] = createSignal<Element | null>(floating);

    let result: {
      left: () => number;
      top: () => number;
      update: () => void;
    } | null = null;

    createRoot(() => {
      result = useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
    });

    await vi.waitFor(() => {
      expect(result?.left()).toBe(100);
      expect(result?.top()).toBe(200);
    });
  });

  it("calls computePosition with correct args", async () => {
    const element = makeElement("section");
    const floating = document.createElement("div");

    const [reference] = createSignal<Element | null>(element);
    const [floatingRef] = createSignal<Element | null>(floating);

    createRoot(() => {
      useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
    });

    await vi.waitFor(() => {
      expect(computePositionMock).toHaveBeenCalledWith(
        element,
        floating,
        expect.objectContaining({
          placement: "right-start",
          strategy: "fixed",
        })
      );
    });
  });

  it("calls autoUpdate when element signal changes", async () => {
    const elementA = makeElement();
    const elementB = makeElement();
    const [reference, setReference] = createSignal<Element | null>(elementA);

    const floating = document.createElement("div");
    const [floatingRef] = createSignal<Element | null>(floating);

    createRoot(() => {
      useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
    });

    await vi.waitFor(() => {
      expect(autoUpdateMock).toHaveBeenCalledTimes(1);
    });

    setReference(elementB);

    await vi.waitFor(() => {
      expect(autoUpdateMock).toHaveBeenCalledTimes(2);
    });

    expect(autoUpdateMock).toHaveBeenLastCalledWith(
      elementB,
      floating,
      expect.any(Function),
      { ancestorScroll: true }
    );
  });

  it("calls cleanup on dispose", async () => {
    const element = makeElement();
    const floating = document.createElement("div");
    const cleanupFn = vi.fn();
    autoUpdateMock.mockReturnValue(cleanupFn);

    const [reference] = createSignal<Element | null>(element);
    const [floatingRef] = createSignal<Element | null>(floating);

    let dispose: (() => void) | undefined;

    createRoot((disposer) => {
      dispose = disposer;
      useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
    });

    // Wait for the effect to run and set up autoUpdate
    await vi.waitFor(() => {
      expect(autoUpdateMock).toHaveBeenCalledTimes(1);
    });

    expect(cleanupFn).not.toHaveBeenCalled();

    dispose();
    expect(cleanupFn).toHaveBeenCalledTimes(1);
  });

  it("calls update() on programmatic trigger", async () => {
    const element = makeElement();
    const floating = document.createElement("div");

    const [reference] = createSignal<Element | null>(element);
    const [floatingRef] = createSignal<Element | null>(floating);

    let updateFn: (() => void) | null = null;

    createRoot(() => {
      const result = useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
      updateFn = result.update;
    });

    computePositionMock.mockClear();
    updateFn?.();

    await vi.waitFor(() => {
      expect(computePositionMock).toHaveBeenCalledTimes(1);
    });
  });

  it("does nothing when element or floating element is null", async () => {
    const [reference] = createSignal<Element | null>(null);
    const [floatingRef] = createSignal<Element | null>(null);

    createRoot(() => {
      useFloatingPosition(reference, {
        floatingRef,
        placement: "right-start",
        strategy: "fixed",
      });
    });

    await vi.waitFor(() => {
      expect(computePositionMock).not.toHaveBeenCalled();
      expect(autoUpdateMock).not.toHaveBeenCalled();
    });
  });
});
