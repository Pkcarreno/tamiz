import { describe, expect, it } from "vitest";
import { PickerStateMachine } from "../machine/picker.ts";
import type { KeyCombo } from "./registry.ts";
import { createShortcutRegistry } from "./registry.ts";

/** Build a KeyCombo from a partial spec for test readability. */
function combo(overrides: Partial<KeyCombo>): KeyCombo {
  return {
    alt: false,
    ctrlOrMeta: false,
    key: "",
    shift: false,
    ...overrides,
  };
}

/** Transition a real machine to SELECTED so state-guarded shortcuts are active. */
function selectElement(machine: PickerStateMachine): void {
  machine.dispatch({ type: "INVOKE" });
  machine.dispatch({
    target: document.createElement("div"),
    type: "CLICK",
  });
}

/** Transition a real machine to SELECTED with a specific format. */
function selectElementWithFormat(
  machine: PickerStateMachine,
  format: "markdown" | "html"
): void {
  machine.dispatch({ format, type: "INVOKE" });
  machine.dispatch({
    target: document.createElement("div"),
    type: "CLICK",
  });
}

describe("createShortcutRegistry", () => {
  describe("Escape → DISMISS (any state)", () => {
    it("returns DISMISS for Escape in IDLE", () => {
      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "escape" }));

      expect(action).toEqual({ type: "DISMISS" });
    });

    it("returns DISMISS for Escape in HIGHLIGHTING", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "escape" }), machine);

      expect(action).toEqual({ type: "DISMISS" });
    });

    it("returns DISMISS for Escape in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "escape" }), machine);

      expect(action).toEqual({ type: "DISMISS" });
    });
  });

  describe("Ctrl/Meta + c → COPY (SELECTED only)", () => {
    it("returns COPY for ctrl+c in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "c" }),
        machine
      );

      expect(action).toEqual({ type: "COPY" });
    });

    it("returns COPY for meta+c in SELECTED (ctrlOrMeta covers both)", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "c" }),
        machine
      );

      expect(action).toEqual({ type: "COPY" });
    });

    it("returns null for ctrl+c in IDLE (state guard)", () => {
      const machine = new PickerStateMachine();

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "c" }),
        machine
      );

      expect(action).toBeNull();
    });

    it("returns null for ctrl+c in HIGHLIGHTING (state guard)", () => {
      const machine = new PickerStateMachine();
      machine.dispatch({ type: "INVOKE" });

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "c" }),
        machine
      );

      expect(action).toBeNull();
    });
  });

  describe("Ctrl/Meta + s → DOWNLOAD (SELECTED only)", () => {
    it("returns DOWNLOAD for ctrl+s in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "s" }),
        machine
      );

      expect(action).toEqual({ type: "DOWNLOAD" });
    });

    it("returns null for ctrl+s in IDLE (state guard)", () => {
      const machine = new PickerStateMachine();

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "s" }),
        machine
      );

      expect(action).toBeNull();
    });
  });

  describe("f → FORMAT_CHANGE (SELECTED only, format cycles)", () => {
    it("cycles markdown→html on plain f", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      expect(machine.getFormat()).toBe("markdown");

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "f" }), machine);

      expect(action).toEqual({ format: "html", type: "FORMAT_CHANGE" });
    });

    it("cycles html→markdown on plain f", () => {
      const machine = new PickerStateMachine();
      selectElementWithFormat(machine, "html");
      expect(machine.getFormat()).toBe("html");

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "f" }), machine);

      expect(action).toEqual({ format: "markdown", type: "FORMAT_CHANGE" });
    });

    it("cycles markdown→html on ctrl+shift+f", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);
      expect(machine.getFormat()).toBe("markdown");

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "f", shift: true }),
        machine
      );

      expect(action).toEqual({ format: "html", type: "FORMAT_CHANGE" });
    });

    it("returns null for f in IDLE (state guard)", () => {
      const machine = new PickerStateMachine();

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "f" }), machine);

      expect(action).toBeNull();
    });
  });

  describe("extra modifiers reject", () => {
    it("ctrl+shift+c returns null (extra shift on copy)", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "c", shift: true }),
        machine
      );

      expect(action).toBeNull();
    });

    it("ctrl+alt+f returns null (alt is not part of format-cycle)", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ alt: true, ctrlOrMeta: true, key: "f" }),
        machine
      );

      expect(action).toBeNull();
    });
  });

  describe("unmatched keys", () => {
    it("returns null for an unrecognized key combo", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(
        combo({ ctrlOrMeta: true, key: "x" }),
        machine
      );

      expect(action).toBeNull();
    });

    it("returns null for plain Enter in SELECTED", () => {
      const machine = new PickerStateMachine();
      selectElement(machine);

      const { matchShortcut } = createShortcutRegistry();
      const action = matchShortcut(combo({ key: "enter" }), machine);

      expect(action).toBeNull();
    });
  });

  describe("bindings are exposed", () => {
    it("exposes at least 4 binding labels", () => {
      const { bindings } = createShortcutRegistry();

      expect(bindings.length).toBeGreaterThanOrEqual(4);
    });
  });
});
