import type {
  Format,
  ModifierSet,
  ShortcutCommand,
  ShortcutContext,
} from "./types.ts";
import { getModifiers, modifiersEqual } from "./types.ts";

/** Expected modifier sets for exact matching. */
const NONE: ModifierSet = {
  alt: false,
  ctrl: false,
  meta: false,
  shift: false,
};
const CTRL: ModifierSet = { alt: false, ctrl: true, meta: false, shift: false };
const META: ModifierSet = { alt: false, ctrl: false, meta: true, shift: false };
const CTRL_SHIFT: ModifierSet = {
  alt: false,
  ctrl: true,
  meta: false,
  shift: true,
};

/**
 * Static catalogue of every keyboard shortcut the extension recognises.
 *
 * Each entry pairs a human-readable id with the {@link PickerEvent} it
 * dispatches.  The optional `format` field on {@link ShortcutCommand} is
 * populated by {@link resolveCommand} for format-cycling commands.
 *
 * @public
 */
export const DEFAULT_SHORTCUTS: readonly ShortcutCommand[] = [
  { event: { type: "DISMISS" }, id: "dismiss" },
  { event: { type: "COPY" }, id: "copy" },
  { event: { type: "DOWNLOAD" }, id: "download" },
  {
    event: { format: "markdown", type: "FORMAT_CHANGE" },
    format: "markdown",
    id: "format-cycle",
  },
];

/**
 * Resolve a keyboard event against the shortcut priority table.
 *
 * Algorithm (matching the priority table):
 *
 * 1. Escape → `dismiss` — returned before the input-focus guard so it always
 *    fires regardless of whether a form field has focus.
 * 2. `inputFocused` → `null` — suppress all other shortcuts while the user is
 *    typing in an input, textarea, select, or contentEditable element.
 * 3. Only the `SELECTED` picker state can trigger copy/download/format-cycle.
 * 4. `c` with **exactly** ctrl or meta (no extra modifiers) → `copy`.
 * 5. `s` with **exactly** ctrl or meta → `download`.
 * 6. `f` with **exactly** ctrl+shift → `format-cycle` (cycles context.format).
 * 7. `f` with **no** modifiers → `format-cycle` (cycles context.format).
 * 8. Anything else → `null`.
 *
 * The function is pure: it reads from the event and context but performs no
 * DOM mutations or side effects.
 *
 * @param context - The current picker context (state, format, focus).
 * @param event   - The raw keyboard event to evaluate.
 * @returns The matched command, or `null` when no shortcut applies.
 *
 * @public
 */
export function resolveCommand(
  context: ShortcutContext,
  event: KeyboardEvent
): ShortcutCommand | null {
  // Priority 1 — Escape always wins, even during input focus.
  // Lowercase the key so Ctrl+Shift+F (where browsers report "F") matches.
  const key = event.key.toLowerCase();
  if (key === "escape") {
    return { event: { type: "DISMISS" }, id: "dismiss" };
  }

  // Guard: do not intercept keystrokes while the user is editing a form field.
  if (context.inputFocused) {
    return null;
  }

  // Only SELECTED state supports copy / download / format-cycle.
  if (context.state !== "SELECTED") {
    return null;
  }

  const modifiers = getModifiers(event);

  // Priority 2 — c with ctrl OR meta (no extra modifiers).
  if (
    key === "c" &&
    (modifiersEqual(modifiers, CTRL) || modifiersEqual(modifiers, META))
  ) {
    return { event: { type: "COPY" }, id: "copy" };
  }

  // Priority 3 — s with ctrl OR meta (no extra modifiers).
  if (
    key === "s" &&
    (modifiersEqual(modifiers, CTRL) || modifiersEqual(modifiers, META))
  ) {
    return { event: { type: "DOWNLOAD" }, id: "download" };
  }

  // Format-cycling uses the next format in the markdown ↔ html cycle.
  const nextFormat: Format =
    context.format === "markdown" ? "html" : "markdown";

  // Priority 4 & 5 — f triggers format-cycle with ctrl+shift (exact) or no
  // modifiers (exact).  The two modifier sets are mutually exclusive, so
  // order does not affect the outcome.
  if (
    key === "f" &&
    (modifiersEqual(modifiers, CTRL_SHIFT) || modifiersEqual(modifiers, NONE))
  ) {
    return {
      event: { format: nextFormat, type: "FORMAT_CHANGE" },
      format: nextFormat,
      id: "format-cycle",
    };
  }

  return null;
}
