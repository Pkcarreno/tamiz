import type { PickerAction } from "../actions/types.ts";
import type { ShortcutContext } from "./types.ts";

/**
 * Platform-agnostic keyboard combination.
 *
 * `ctrlOrMeta` collapses Ctrl and Meta into a single flag because the
 * extension treats them identically (Cmd on macOS, Ctrl on Windows/Linux).
 *
 * @public
 */
export interface KeyCombo {
  alt: boolean;
  ctrlOrMeta: boolean;
  key: string;
  shift: boolean;
}

/**
 * Declarative binding between a key combination and an action.
 *
 * `action` is a static value rather than a factory because all Tamiz
 * shortcuts produce fixed actions (FORMAT_CHANGE cycles are resolved
 * by the registry at match time, not by the binding).
 *
 * @public
 */
export interface ShortcutBinding {
  action: PickerAction;
  combo: KeyCombo;
  label: string;
  when?: (context: ShortcutContext) => boolean;
}

/**
 * Lookup table resolving key combos to picker actions.
 *
 * Follows the Glyphide composition pattern: a stateless registry created
 * once and injected where shortcut resolution is needed.
 *
 * @public
 */
export interface ShortcutRegistry {
  bindings: readonly ShortcutBinding[];
  matchShortcut: (
    event: KeyboardEvent,
    context: ShortcutContext
  ) => PickerAction | null;
}

/** True when every modifier flag on the combo matches the binding. */
function combosMatch(event: KeyboardEvent, combo: KeyCombo): boolean {
  const key = event.key.toLowerCase();
  return (
    key === combo.key &&
    event.altKey === combo.alt &&
    (event.ctrlKey || event.metaKey) === combo.ctrlOrMeta &&
    event.shiftKey === combo.shift
  );
}

/** The canonical catalogue of keyboard shortcut bindings. */
const DEFAULT_BINDINGS: ShortcutBinding[] = [
  {
    action: { type: "DISMISS" },
    combo: { alt: false, ctrlOrMeta: false, key: "escape", shift: false },
    label: "Esc",
  },
  {
    action: { type: "COPY" },
    combo: { alt: false, ctrlOrMeta: false, key: "c", shift: false },
    label: "C",
    when: (ctx) => ctx.state === "SELECTED",
  },
  {
    action: { type: "DOWNLOAD" },
    combo: { alt: false, ctrlOrMeta: false, key: "s", shift: false },
    label: "S",
    when: (ctx) => ctx.state === "SELECTED",
  },
  {
    action: { format: "html", type: "FORMAT_CHANGE" },
    combo: { alt: false, ctrlOrMeta: false, key: "f", shift: false },
    label: "F",
    when: (ctx) => ctx.state === "SELECTED",
  },
  {
    action: { type: "RESTART" },
    combo: { alt: false, ctrlOrMeta: false, key: "r", shift: false },
    label: "R",
    when: (ctx) => ctx.state === "SELECTED",
  },
];

/**
 * Create a {@link ShortcutRegistry} with the canonical shortcut bindings.
 *
 * `matchShortcut` is pure: it reads only from the event and the context,
 * performing no DOM access or side effects.
 *
 * Input focus suppression is handled internally: when `context.inputFocused`
 * is true, all bindings except Escape are skipped.
 *
 * FORMAT_CHANGE actions are resolved dynamically: the registry computes the
 * next format (markdown↔html cycle) from `context.format` at match time.
 *
 * @returns A new `ShortcutRegistry`.
 *
 * @public
 */
export function createShortcutRegistry(): ShortcutRegistry {
  return {
    bindings: DEFAULT_BINDINGS,

    matchShortcut(event, context) {
      for (const binding of DEFAULT_BINDINGS) {
        if (!combosMatch(event, binding.combo)) {
          continue;
        }
        // Escape always fires, even during input focus.
        if (binding.combo.key !== "escape" && context.inputFocused) {
          continue;
        }
        if (binding.when && !binding.when(context)) {
          continue;
        }
        // FORMAT_CHANGE cycles format dynamically.
        if (binding.action.type === "FORMAT_CHANGE") {
          const nextFormat =
            context.format === "markdown" ? "html" : "markdown";
          return { format: nextFormat, type: "FORMAT_CHANGE" };
        }
        return binding.action;
      }
      return null;
    },
  };
}
