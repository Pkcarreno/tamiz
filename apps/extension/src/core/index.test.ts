import { describe, expect, it, vi } from "vitest";
import { createPickerCore } from "./index.ts";

function makeCallbacks() {
  return {
    onElementSelected: vi.fn(),
    onHover: vi.fn(),
    onStateChange: vi.fn(),
  };
}

describe("createPickerCore", () => {
  it("returns an object with highlight, machine, and registry", () => {
    const core = createPickerCore(makeCallbacks());

    expect(core).toHaveProperty("highlight");
    expect(core).toHaveProperty("machine");
    expect(core).toHaveProperty("registry");
  });

  it("machine starts in IDLE state", () => {
    const core = createPickerCore(makeCallbacks());
    expect(core.machine.getState()).toBe("IDLE");
  });

  it("registry exposes bindings", () => {
    const core = createPickerCore(makeCallbacks());
    expect(core.registry.bindings.length).toBeGreaterThanOrEqual(4);
  });

  it("highlight controller can clearAll without error", () => {
    const core = createPickerCore(makeCallbacks());
    expect(() => core.highlight.clearAll()).not.toThrow();
  });

  it("machine state change triggers onStateChange callback", () => {
    const callbacks = makeCallbacks();
    const core = createPickerCore(callbacks);

    core.machine.dispatch({ type: "INVOKE" });

    expect(callbacks.onStateChange).toHaveBeenCalledWith("HIGHLIGHTING");
  });

  it("machine element selection triggers onElementSelected callback", () => {
    const callbacks = makeCallbacks();
    const core = createPickerCore(callbacks);

    core.machine.dispatch({ type: "INVOKE" });
    const el = document.createElement("div");
    core.machine.dispatch({ target: el, type: "CLICK" });

    expect(callbacks.onElementSelected).toHaveBeenCalledWith(el);
  });
});
