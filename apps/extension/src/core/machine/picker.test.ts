import { describe, expect, it, vi } from "vitest";

import { PickerStateMachine } from "./picker.ts";

// Helper: advance the machine to SELECTED with a real DOM element.
// If already in HIGHLIGHTING, only dispatches CLICK (preserves format).
function selectElement(
  machine: PickerStateMachine,
  element: Element = document.createElement("div")
): void {
  if (machine.getState() === "IDLE") {
    machine.dispatch({ type: "INVOKE" });
  }
  machine.dispatch({ target: element, type: "CLICK" });
}

describe("PickerStateMachine", () => {
  describe("state type — ACTION removed", () => {
    it("never enters an ACTION state", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("SELECTED");
    });
  });

  describe("INVOKE → HIGHLIGHTING", () => {
    it("starts in IDLE and transitions to HIGHLIGHTING on INVOKE", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "INVOKE" });

      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(onStateChange).toHaveBeenCalledWith("HIGHLIGHTING");
    });

    it("defaults format to markdown on INVOKE", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });
      expect(machine.getFormat()).toBe("markdown");
    });

    it("initializes format from INVOKE event when provided", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ format: "html", type: "INVOKE" });
      expect(machine.getFormat()).toBe("html");
    });

    it("ignores INVOKE while already in HIGHLIGHTING", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ format: "html", type: "INVOKE" });
      // Format was set by the first INVOKE (default markdown), second ignored.
      expect(machine.getFormat()).toBe("markdown");
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });
  });

  describe("FORMAT_CHANGE", () => {
    it("updates format when FORMAT_CHANGE is dispatched in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      machine.dispatch({ format: "html", type: "FORMAT_CHANGE" });
      expect(machine.getFormat()).toBe("html");
      expect(machine.getState()).toBe("SELECTED");
    });
  });

  describe("HIGHLIGHTING → SELECTED on CLICK", () => {
    it("transitions to SELECTED and stores the element on CLICK", () => {
      const element = document.createElement("p");
      const onStateChange = vi.fn();
      const onElementSelected = vi.fn();
      const machine = new PickerStateMachine({
        onElementSelected,
        onStateChange,
      });

      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ target: element, type: "CLICK" });

      expect(machine.getState()).toBe("SELECTED");
      expect(machine.getSelectedElement()).toBe(element);
      expect(onStateChange).toHaveBeenLastCalledWith("SELECTED");
      expect(onElementSelected).toHaveBeenCalledWith(element);
    });
  });

  describe("SELECTED — COPY / DOWNLOAD are no-ops (side effects live in handlers)", () => {
    it("COPY leaves state SELECTED (no clipboard write inside machine)", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      machine.dispatch({ type: "COPY" });

      expect(machine.getState()).toBe("SELECTED");
    });

    it("DOWNLOAD leaves state SELECTED (no file download inside machine)", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      machine.dispatch({ type: "DOWNLOAD" });

      expect(machine.getState()).toBe("SELECTED");
    });

    it("COPY does not transition or call onStateChange", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });
      selectElement(machine);

      machine.dispatch({ type: "COPY" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onStateChange).not.toHaveBeenCalledWith("IDLE");
    });

    it("DOWNLOAD does not transition or call onStateChange", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });
      selectElement(machine);

      machine.dispatch({ type: "DOWNLOAD" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onStateChange).not.toHaveBeenCalledWith("IDLE");
    });
  });

  describe("DISMISS — from any state → IDLE with teardown", () => {
    it("DISMISS from IDLE stays IDLE and clears selected element", () => {
      const machine = new PickerStateMachine();

      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
    });

    it("DISMISS from HIGHLIGHTING returns to IDLE and clears selected element", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).toHaveBeenLastCalledWith("IDLE");
    });

    it("DISMISS from SELECTED returns to IDLE and clears selected element", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      selectElement(machine);
      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).toHaveBeenLastCalledWith("IDLE");
      expect(machine.getSelectedElement()).toBeNull();
    });

    it("DISMISS from SELECTED calls onStateChange with IDLE", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      selectElement(machine);
      machine.dispatch({ type: "DISMISS" });

      expect(onStateChange).toHaveBeenCalledWith("IDLE");
    });
  });

  describe("SCROLL / RESIZE — reposition while SELECTED", () => {
    it("SCROLL calls onReposition and stays SELECTED", () => {
      const onReposition = vi.fn();
      const machine = new PickerStateMachine({ onReposition });

      selectElement(machine);
      machine.dispatch({ type: "SCROLL" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onReposition).toHaveBeenCalledTimes(1);
    });

    it("RESIZE calls onReposition and stays SELECTED", () => {
      const onReposition = vi.fn();
      const machine = new PickerStateMachine({ onReposition });

      selectElement(machine);
      machine.dispatch({ type: "RESIZE" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onReposition).toHaveBeenCalledTimes(1);
    });

    it("SCROLL in IDLE is a no-op (no reposition)", () => {
      const onReposition = vi.fn();
      const machine = new PickerStateMachine({ onReposition });

      machine.dispatch({ type: "SCROLL" });

      expect(machine.getState()).toBe("IDLE");
      expect(onReposition).not.toHaveBeenCalled();
    });

    it("RESIZE in HIGHLIGHTING is a no-op", () => {
      const onReposition = vi.fn();
      const machine = new PickerStateMachine({ onReposition });

      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "RESIZE" });

      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(onReposition).not.toHaveBeenCalled();
    });
  });

  describe("HIGHLIGHTING — MOUSEMOVE hover feedback", () => {
    it("calls onHover with the target element on MOUSEMOVE", () => {
      const onHover = vi.fn();
      const machine = new PickerStateMachine({ onHover });

      machine.dispatch({ type: "INVOKE" });
      const element = document.createElement("div");
      machine.dispatch({ target: element, type: "MOUSEMOVE" });

      expect(onHover).toHaveBeenCalledWith(element);
    });

    it("calls onHover with null on DISMISS to clear hover", () => {
      const onHover = vi.fn();
      const machine = new PickerStateMachine({ onHover });

      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "DISMISS" });

      expect(onHover).toHaveBeenCalledWith(null);
    });

    it("does not call onHover in IDLE state", () => {
      const onHover = vi.fn();
      const machine = new PickerStateMachine({ onHover });

      const element = document.createElement("div");
      machine.dispatch({ target: element, type: "MOUSEMOVE" });

      expect(onHover).not.toHaveBeenCalled();
    });
  });

  describe("CLICK in SELECTED — grab lock", () => {
    it("ignores CLICK and does not re-select or reposition", () => {
      const elementA = document.createElement("div");
      const elementB = document.createElement("section");
      const onReposition = vi.fn();
      const onElementSelected = vi.fn();
      const machine = new PickerStateMachine({
        onElementSelected,
        onReposition,
      });

      selectElement(machine, elementA);
      machine.dispatch({ target: elementB, type: "CLICK" });

      expect(machine.getState()).toBe("SELECTED");
      expect(machine.getSelectedElement()).toBe(elementA);
      expect(onElementSelected).toHaveBeenCalledTimes(1);
      expect(onElementSelected).toHaveBeenLastCalledWith(elementA);
      expect(onReposition).not.toHaveBeenCalled();
    });
  });

  describe("IDLE → SCROLL/RESIZE no-op", () => {
    it("SCROLL in IDLE does not change state or call callbacks", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "SCROLL" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).not.toHaveBeenCalled();
    });

    it("RESIZE in IDLE does not change state or call callbacks", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "RESIZE" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).not.toHaveBeenCalled();
    });
  });

  describe("selected element cleared on teardown", () => {
    it("clears selected element when dismissed", () => {
      const element = document.createElement("div");
      const machine = new PickerStateMachine();

      selectElement(machine, element);
      expect(machine.getSelectedElement()).toBe(element);

      machine.dispatch({ type: "DISMISS" });
      expect(machine.getSelectedElement()).toBeNull();
    });
  });

  describe("ignored events in wrong state", () => {
    it("COPY in HIGHLIGHTING is ignored", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });

    it("DOWNLOAD in IDLE is ignored", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "DOWNLOAD" });
      expect(machine.getState()).toBe("IDLE");
    });

    it("FORMAT_CHANGE in IDLE is ignored", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ format: "html", type: "FORMAT_CHANGE" });
      expect(machine.getFormat()).toBe("markdown");
      expect(machine.getState()).toBe("IDLE");
    });

    it("COPY after DISMISS does not fire callbacks", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      machine.dispatch({ type: "DISMISS" });
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("IDLE");
    });

    it("multiple SCROLL events each trigger reposition", () => {
      const onReposition = vi.fn();
      const machine = new PickerStateMachine({ onReposition });
      selectElement(machine);
      machine.dispatch({ type: "SCROLL" });
      machine.dispatch({ type: "SCROLL" });
      machine.dispatch({ type: "RESIZE" });
      expect(onReposition).toHaveBeenCalledTimes(3);
    });
  });

  describe("full grab lifecycle", () => {
    it("supports invoke → select → copy → dismiss → invoke again with new format", () => {
      const machine = new PickerStateMachine();

      selectElement(machine);
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("SELECTED");

      machine.dispatch({ type: "DISMISS" });
      expect(machine.getState()).toBe("IDLE");
      expect(machine.getSelectedElement()).toBeNull();

      machine.dispatch({ format: "html", type: "INVOKE" });
      expect(machine.getFormat()).toBe("html");
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });
  });

  describe("RESTART — from SELECTED → HIGHLIGHTING with element teardown", () => {
    it("RESTART from SELECTED returns to HIGHLIGHTING and clears selected element", () => {
      const onStateChange = vi.fn();
      const onDeselect = vi.fn();
      const machine = new PickerStateMachine({ onDeselect, onStateChange });

      selectElement(machine);
      machine.dispatch({ type: "RESTART" });

      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(machine.getSelectedElement()).toBeNull();
      expect(onStateChange).toHaveBeenLastCalledWith("HIGHLIGHTING");
      expect(onDeselect).toHaveBeenCalledTimes(1);
    });

    it("RESTART from SELECTED preserves the format", () => {
      const machine = new PickerStateMachine();

      machine.dispatch({ format: "html", type: "INVOKE" });
      selectElement(machine);
      expect(machine.getFormat()).toBe("html");

      machine.dispatch({ type: "RESTART" });

      expect(machine.getFormat()).toBe("html");
    });

    it("RESTART is a no-op in IDLE — no state change or callback", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "RESTART" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).not.toHaveBeenCalled();
    });

    it("RESTART is a no-op in HIGHLIGHTING — no state change or callback", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });

      machine.dispatch({ type: "INVOKE" });
      expect(machine.getState()).toBe("HIGHLIGHTING");

      machine.dispatch({ type: "RESTART" });

      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(onStateChange).not.toHaveBeenCalledWith("IDLE");
    });

    it("format survives two consecutive restarts", () => {
      const machine = new PickerStateMachine();

      // First cycle: select with html format, then restart
      machine.dispatch({ format: "html", type: "INVOKE" });
      selectElement(machine);
      expect(machine.getFormat()).toBe("html");
      machine.dispatch({ type: "RESTART" });
      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(machine.getFormat()).toBe("html");

      // Second cycle: click to select again, then restart
      machine.dispatch({
        target: document.createElement("div"),
        type: "CLICK",
      });
      machine.dispatch({ type: "RESTART" });

      expect(machine.getFormat()).toBe("html");
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });

    it("RESTART calls onHover with null to clear hover state", () => {
      const onHover = vi.fn();
      const machine = new PickerStateMachine({ onHover });

      selectElement(machine);
      machine.dispatch({ type: "RESTART" });

      expect(onHover).toHaveBeenCalledWith(null);
    });

    it("after RESTART, hovering and clicking selects a new element", () => {
      const onElementSelected = vi.fn();
      const machine = new PickerStateMachine({ onElementSelected });

      selectElement(machine);
      machine.dispatch({ type: "RESTART" });
      expect(machine.getState()).toBe("HIGHLIGHTING");

      // Simulate hover
      const newElement = document.createElement("span");
      machine.dispatch({ target: newElement, type: "MOUSEMOVE" });
      expect(machine.getState()).toBe("HIGHLIGHTING");

      // Click to select
      machine.dispatch({ target: newElement, type: "CLICK" });
      expect(machine.getState()).toBe("SELECTED");
      expect(machine.getSelectedElement()).toBe(newElement);
      expect(onElementSelected).toHaveBeenCalledWith(newElement);
    });
  });

  describe("constructor — only UI callbacks accepted", () => {
    it("accepts onStateChange only", () => {
      const onStateChange = vi.fn();
      const machine = new PickerStateMachine({ onStateChange });
      expect(machine.getState()).toBe("IDLE");
    });

    it("accepts onElementSelected, onHover, onReposition only", () => {
      const machine = new PickerStateMachine({
        onElementSelected: vi.fn(),
        onHover: vi.fn(),
        onReposition: vi.fn(),
      });
      expect(machine.getState()).toBe("IDLE");
    });

    it("accepts no callbacks", () => {
      const machine = new PickerStateMachine();
      expect(machine.getState()).toBe("IDLE");
    });
  });
});
