import { describe, expect, it } from "vitest";

import { getModifiers, isInputElement, modifiersEqual } from "./types.ts";

/** Build a KeyboardEvent from a partial modifier set. */
function keyEvent(init: {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
}): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("getModifiers", () => {
  it("extracts all modifiers when every modifier key is held", () => {
    const event = keyEvent({
      altKey: true,
      ctrlKey: true,
      key: "c",
      metaKey: true,
      shiftKey: true,
    });
    expect(getModifiers(event)).toEqual({
      alt: true,
      ctrl: true,
      meta: true,
      shift: true,
    });
  });

  it("extracts no modifiers when none are held", () => {
    const event = keyEvent({ key: "c" });
    expect(getModifiers(event)).toEqual({
      alt: false,
      ctrl: false,
      meta: false,
      shift: false,
    });
  });

  it("extracts only ctrl when only ctrl is held", () => {
    const event = keyEvent({ ctrlKey: true, key: "c" });
    expect(getModifiers(event)).toEqual({
      alt: false,
      ctrl: true,
      meta: false,
      shift: false,
    });
  });

  it("extracts only meta when only meta is held", () => {
    const event = keyEvent({ key: "c", metaKey: true });
    expect(getModifiers(event)).toEqual({
      alt: false,
      ctrl: false,
      meta: true,
      shift: false,
    });
  });

  it("extracts ctrl and shift when both are held without alt or meta", () => {
    const event = keyEvent({ ctrlKey: true, key: "f", shiftKey: true });
    expect(getModifiers(event)).toEqual({
      alt: false,
      ctrl: true,
      meta: false,
      shift: true,
    });
  });
});

describe("modifiersEqual", () => {
  it("returns true for identical non-empty modifier sets", () => {
    const a = { alt: false, ctrl: true, meta: false, shift: true };
    const b = { alt: false, ctrl: true, meta: false, shift: true };
    expect(modifiersEqual(a, b)).toBe(true);
  });

  it("returns true for identical all-false modifier sets", () => {
    const a = { alt: false, ctrl: false, meta: false, shift: false };
    const b = { alt: false, ctrl: false, meta: false, shift: false };
    expect(modifiersEqual(a, b)).toBe(true);
  });

  it("returns false when exactly one modifier differs", () => {
    const a = { alt: false, ctrl: true, meta: false, shift: false };
    const b = { alt: false, ctrl: false, meta: false, shift: false };
    expect(modifiersEqual(a, b)).toBe(false);
  });

  it("returns false when multiple modifiers differ", () => {
    const a = { alt: true, ctrl: true, meta: true, shift: true };
    const b = { alt: false, ctrl: false, meta: false, shift: false };
    expect(modifiersEqual(a, b)).toBe(false);
  });

  it("returns false when only the meta bit differs", () => {
    const a = { alt: false, ctrl: true, meta: false, shift: false };
    const b = { alt: false, ctrl: true, meta: true, shift: false };
    expect(modifiersEqual(a, b)).toBe(false);
  });
});

describe("isInputElement", () => {
  it("returns true for an INPUT element", () => {
    expect(isInputElement(document.createElement("input"))).toBe(true);
  });

  it("returns true for a TEXTAREA element", () => {
    expect(isInputElement(document.createElement("textarea"))).toBe(true);
  });

  it("returns true for a SELECT element", () => {
    expect(isInputElement(document.createElement("select"))).toBe(true);
  });

  it("returns true for a contentEditable element", () => {
    const div = document.createElement("div");
    div.contentEditable = "true";
    expect(isInputElement(div)).toBe(true);
  });

  it("returns true for an INPUT nested inside a contentEditable parent", () => {
    const parent = document.createElement("div");
    parent.contentEditable = "true";
    const input = document.createElement("input");
    parent.appendChild(input);
    expect(isInputElement(input)).toBe(true);
  });

  it("returns false for a plain div without contentEditable", () => {
    expect(isInputElement(document.createElement("div"))).toBe(false);
  });

  it("returns false for a span without contentEditable", () => {
    expect(isInputElement(document.createElement("span"))).toBe(false);
  });

  it("returns false for a div with contentEditable set to false", () => {
    const div = document.createElement("div");
    div.contentEditable = "false";
    expect(isInputElement(div)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isInputElement(null)).toBe(false);
  });
});
