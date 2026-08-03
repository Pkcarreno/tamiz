import { describe, expect, it, vi } from "vitest";

import { PickerStateMachine } from "./picker.ts";

/** Matches filenames like `article-1700000000000`. */
const FILENAME_PATTERN = /^article-\d+$/;

// Helper: advance the machine to SELECTED with a real DOM element.
function selectElement(
  machine: PickerStateMachine,
  element: Element = document.createElement("div")
): void {
  machine.dispatch({ type: "INVOKE" });
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
      machine.dispatch({ format: "raw", type: "INVOKE" });
      expect(machine.getFormat()).toBe("raw");
    });

    it("ignores INVOKE while already in HIGHLIGHTING", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ format: "raw", type: "INVOKE" });
      // Format was set by the first INVOKE (default markdown), second ignored.
      expect(machine.getFormat()).toBe("markdown");
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });
  });

  describe("FORMAT_CHANGE", () => {
    it("updates format when FORMAT_CHANGE is dispatched in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      machine.dispatch({ format: "raw", type: "FORMAT_CHANGE" });
      expect(machine.getFormat()).toBe("raw");
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

  describe("SELECTED — inline COPY / DOWNLOAD (no ACTION transition)", () => {
    it("COPY calls onCopy and stays in SELECTED", () => {
      const element = document.createElement("div");
      element.innerHTML = "<p>Hello</p>";
      const onCopy = vi.fn();
      const machine = new PickerStateMachine({ onCopy });

      selectElement(machine, element);
      machine.dispatch({ type: "COPY" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onCopy).toHaveBeenCalledTimes(1);
      // Content passed to callback is the element's outerHTML.
      expect(onCopy).toHaveBeenCalledWith("<div><p>Hello</p></div>");
    });

    it("DOWNLOAD calls onDownload with content and filename and stays SELECTED", () => {
      const element = document.createElement("article");
      element.innerHTML = "<span>data</span>";
      const onDownload = vi.fn();
      const machine = new PickerStateMachine({ onDownload });

      selectElement(machine, element);
      machine.dispatch({ type: "DOWNLOAD" });

      expect(machine.getState()).toBe("SELECTED");
      expect(onDownload).toHaveBeenCalledTimes(1);
      const [content, filename] = onDownload.mock.calls[0];
      expect(content).toBe("<article><span>data</span></article>");
      expect(filename).toMatch(FILENAME_PATTERN);
    });
  });

  describe("DISMISS — from any state → IDLE with teardown", () => {
    it("DISMISS from IDLE calls teardown and stays IDLE", () => {
      const onTeardown = vi.fn();
      const machine = new PickerStateMachine({ onTeardown });

      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
      expect(onTeardown).toHaveBeenCalledTimes(1);
    });

    it("DISMISS from HIGHLIGHTING calls teardown and returns to IDLE", () => {
      const onStateChange = vi.fn();
      const onTeardown = vi.fn();
      const machine = new PickerStateMachine({ onStateChange, onTeardown });

      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).toHaveBeenLastCalledWith("IDLE");
      expect(onTeardown).toHaveBeenCalledTimes(1);
    });

    it("DISMISS from SELECTED calls teardown and returns to IDLE", () => {
      const onStateChange = vi.fn();
      const onTeardown = vi.fn();
      const machine = new PickerStateMachine({ onStateChange, onTeardown });

      selectElement(machine);
      machine.dispatch({ type: "DISMISS" });

      expect(machine.getState()).toBe("IDLE");
      expect(onStateChange).toHaveBeenLastCalledWith("IDLE");
      expect(onTeardown).toHaveBeenCalledTimes(1);
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

  describe("CLICK in SELECTED — re-select and reposition", () => {
    it("re-selects a new element and triggers reposition", () => {
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
      expect(machine.getSelectedElement()).toBe(elementB);
      expect(onElementSelected).toHaveBeenLastCalledWith(elementB);
      expect(onReposition).toHaveBeenCalledTimes(1);
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
      const onCopy = vi.fn();
      const machine = new PickerStateMachine({ onCopy });
      machine.dispatch({ type: "INVOKE" });
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("HIGHLIGHTING");
      expect(onCopy).not.toHaveBeenCalled();
    });

    it("DOWNLOAD in IDLE is ignored", () => {
      const onDownload = vi.fn();
      const machine = new PickerStateMachine({ onDownload });
      machine.dispatch({ type: "DOWNLOAD" });
      expect(machine.getState()).toBe("IDLE");
      expect(onDownload).not.toHaveBeenCalled();
    });

    it("FORMAT_CHANGE in IDLE is ignored", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ format: "raw", type: "FORMAT_CHANGE" });
      expect(machine.getFormat()).toBe("markdown");
      expect(machine.getState()).toBe("IDLE");
    });

    it("COPY after DISMISS does not fire callback", () => {
      const element = document.createElement("div");
      element.innerHTML = "<p>test</p>";
      const onCopy = vi.fn();
      const machine = new PickerStateMachine({ onCopy });
      selectElement(machine, element);
      machine.dispatch({ type: "DISMISS" });
      machine.dispatch({ type: "COPY" });
      expect(onCopy).not.toHaveBeenCalled();
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

  describe("full capture lifecycle", () => {
    it("supports invoke → select → copy → dismiss → invoke again with new format", () => {
      const onCopy = vi.fn();
      const onTeardown = vi.fn();
      const machine = new PickerStateMachine({ onCopy, onTeardown });

      selectElement(machine);
      machine.dispatch({ type: "COPY" });
      expect(machine.getState()).toBe("SELECTED");
      expect(onCopy).toHaveBeenCalledTimes(1);

      machine.dispatch({ type: "DISMISS" });
      expect(machine.getState()).toBe("IDLE");
      expect(onTeardown).toHaveBeenCalledTimes(1);

      machine.dispatch({ format: "raw", type: "INVOKE" });
      expect(machine.getFormat()).toBe("raw");
      expect(machine.getState()).toBe("HIGHLIGHTING");
    });
  });
});
