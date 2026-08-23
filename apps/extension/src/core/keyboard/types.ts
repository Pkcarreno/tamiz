import type { PickerState } from "../machine/picker.ts";

/**
 * Output format for converted content.
 *
 * @public
 */
export type Format = "markdown" | "html";

/**
 * Canonical modifier key names.
 *
 * @public
 */
export type Modifier = "ctrl" | "alt" | "shift" | "meta";

/**
 * Set of modifier key states extracted from a keyboard event.
 *
 * @public
 */
export interface ModifierSet {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}

/**
 * Current picker state available to the shortcut resolver.
 *
 * @public
 */
export interface ShortcutContext {
  format: Format;
  inputFocused: boolean;
  isExclusionMode: boolean;
  state: PickerState;
}

/**
 * Extract modifier key states from a keyboard event.
 *
 * @param event - The keyboard event to inspect.
 * @returns A modifier set with ctrl, alt, shift, and meta booleans.
 *
 * @public
 */
export function getModifiers(event: KeyboardEvent): ModifierSet {
  return {
    alt: event.altKey,
    ctrl: event.ctrlKey,
    meta: event.metaKey,
    shift: event.shiftKey,
  };
}

/**
 * Compare two modifier sets for deep equality.
 *
 * @param a - First modifier set.
 * @param b - Second modifier set.
 * @returns True when every modifier flag matches.
 *
 * @public
 */
export function modifiersEqual(a: ModifierSet, b: ModifierSet): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    a.meta === b.meta
  );
}

/**
 * Determine whether an element is an input control.
 *
 * Returns true for `INPUT`, `TEXTAREA`, `SELECT`, and any element with
 * `contentEditable` enabled (including nested inputs inside an editable
 * parent).
 *
 * @param element - The element to check, or null.
 * @returns True when the element accepts user text input.
 *
 * @public
 */
export function isInputElement(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  const tag = element.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  // isContentEditable resolves inheritance (parent → child) in real browsers.
  // jsdom does not implement it, so fall back to the contentEditable IDL
  // attribute when the computed value is unavailable.
  if (element instanceof HTMLElement) {
    if (element.isContentEditable === true) {
      return true;
    }
    const editable = element.contentEditable;
    return editable === "true" || editable === "plaintext-only";
  }
  return false;
}
