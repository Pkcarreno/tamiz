import type { PickerStateMachine } from "../machine/picker.ts";
import type { PickerAction } from "./types.ts";

/**
 * A keyboard combination that can be matched against a `KeyboardEvent`.
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
 * A single shortcut binding: a combo, an optional state guard, and an action
 * factory that produces the {@link PickerAction} to dispatch.
 *
 * `action` is a function rather than a static value so that dynamic actions
 * — such as `FORMAT_CHANGE` which cycles the format — can read from the
 * state machine at match time.  The function receives the machine (or
 * `undefined` when no machine context was provided); this only happens for
 * bindings without a `when` guard, whose factories ignore the parameter.
 *
 * @public
 */
export interface ShortcutBinding {
  /** Produces the action to dispatch. Ignores machine for static actions. */
  action: (machine: PickerStateMachine | undefined) => PickerAction;
  combo: KeyCombo;
  label: string;
  when?: (machine: PickerStateMachine) => boolean;
}

/**
 * Registry of all keyboard shortcuts, exposing a pure `matchShortcut` function.
 *
 * @public
 */
export interface ShortcutRegistry {
  bindings: readonly ShortcutBinding[];
  matchShortcut: (
    combo: KeyCombo,
    machine?: PickerStateMachine
  ) => PickerAction | null;
}

/** True when every modifier flag on the combo matches the binding. */
function combosMatch(combo: KeyCombo, binding: KeyCombo): boolean {
  return (
    combo.key === binding.key &&
    combo.alt === binding.alt &&
    combo.ctrlOrMeta === binding.ctrlOrMeta &&
    combo.shift === binding.shift
  );
}

/** Return the next format by cycling the current machine format. */
function cycleFormat(
  machine: PickerStateMachine | undefined
): "markdown" | "html" {
  if (!machine) {
    return "markdown";
  }
  const current = machine.getFormat();
  return current === "markdown" ? "html" : "markdown";
}

/** True when the machine is in the SELECTED state. */
function inSelected(machine: PickerStateMachine): boolean {
  return machine.getState() === "SELECTED";
}

/** The canonical catalogue of keyboard shortcut bindings. */
const DEFAULT_BINDINGS: ShortcutBinding[] = [
  {
    action: () => ({ type: "DISMISS" }),
    combo: { alt: false, ctrlOrMeta: false, key: "escape", shift: false },
    label: "Dismiss",
  },
  {
    action: () => ({ type: "COPY" }),
    combo: { alt: false, ctrlOrMeta: true, key: "c", shift: false },
    label: "Copy",
    when: inSelected,
  },
  {
    action: () => ({ type: "DOWNLOAD" }),
    combo: { alt: false, ctrlOrMeta: true, key: "s", shift: false },
    label: "Download",
    when: inSelected,
  },
  {
    action: (machine) => ({
      format: cycleFormat(machine),
      type: "FORMAT_CHANGE",
    }),
    combo: { alt: false, ctrlOrMeta: false, key: "f", shift: false },
    label: "Format Cycle",
    when: inSelected,
  },
  {
    action: (machine) => ({
      format: cycleFormat(machine),
      type: "FORMAT_CHANGE",
    }),
    combo: { alt: false, ctrlOrMeta: true, key: "f", shift: true },
    label: "Format Cycle",
    when: inSelected,
  },
];

/**
 * Create a {@link ShortcutRegistry} with the canonical shortcut bindings.
 *
 * `matchShortcut` is pure: it reads only from the combo and the machine's
 * current state, performing no DOM access or side effects.
 *
 * @returns A new `ShortcutRegistry`.
 *
 * @public
 */
export function createShortcutRegistry(): ShortcutRegistry {
  return {
    bindings: DEFAULT_BINDINGS,

    matchShortcut(combo, machine?) {
      for (const binding of DEFAULT_BINDINGS) {
        if (!combosMatch(combo, binding.combo)) {
          continue;
        }
        // Bindings with a `when` guard require a machine instance and an
        // active guard.  Inside the `&&` chain, `machine` is narrowed to
        // PickerStateMachine before `binding.when` is called.
        if (binding.when && !(machine && binding.when(machine))) {
          continue;
        }
        return binding.action(machine);
      }
      return null;
    },
  };
}
