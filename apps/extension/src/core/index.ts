import type { HighlightController } from "./highlight.ts";
import { createHighlightController } from "./highlight.ts";
import type { ShortcutRegistry } from "./keyboard/registry.ts";
import { createShortcutRegistry } from "./keyboard/registry.ts";
import type { PickerStateMachine } from "./machine/picker.ts";
import { PickerStateMachine as PickerStateMachineImpl } from "./machine/picker.ts";
import type { ScrimController } from "./scrim.ts";
import { createScrimController } from "./scrim.ts";

/**
 * Callbacks invoked by the picker core when state changes.
 *
 * These bridge the domain layer (state machine) to the UI layer (SolidJS
 * signals) without the core knowing about SolidJS.
 *
 * @public
 */
export interface PickerCoreCallbacks {
  /** Called when an element is selected. */
  onElementSelected: (element: Element) => void;
  /** Called on hover. */
  onHover: (element: Element | null) => void;
  /** Called when the state machine transitions. */
  onStateChange: (state: string) => void;
}

/**
 * Fully wired picker core: state machine, highlight controller, and
 * shortcut registry.
 *
 * Created by {@link createPickerCore}. The content script uses these
 * to wire event listeners, compose actions, and mount the UI.
 *
 * @public
 */
export interface PickerCore {
  highlight: HighlightController;
  machine: PickerStateMachine;
  registry: ShortcutRegistry;
  scrim: ScrimController;
}

/**
 * Create a fully wired picker core.
 *
 * This is the composition root — it instantiates all domain collaborators
 * and wires them together. The content script calls this once and gets
 * a ready-to-use core for UI wiring.
 *
 * @param callbacks - Bridges from domain to UI layer.
 * @returns A wired `PickerCore`.
 *
 * @public
 */
export function createPickerCore(callbacks: PickerCoreCallbacks): PickerCore {
  const highlight = createHighlightController();
  const registry = createShortcutRegistry();
  const scrim = createScrimController();

  const machine = new PickerStateMachineImpl({
    onDeselect: () => {
      // Clear all highlight and hover styles when the selection is discarded
      // (e.g. on RESTART) so stale visual indicators do not linger.
      highlight.clearAll();
    },
    onElementSelected: (element) => {
      highlight.selectElement(element);
      callbacks.onElementSelected(element);
    },
    onHover: (element) => {
      highlight.setHoverTarget(element);
      callbacks.onHover(element);
    },
    onStateChange: (state) => {
      if (state === "IDLE") {
        highlight.clearAll();
      }
      callbacks.onStateChange(state);
    },
  });

  return { highlight, machine, registry, scrim };
}
