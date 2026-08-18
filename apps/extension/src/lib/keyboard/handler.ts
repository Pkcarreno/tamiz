import type { PickerStateMachine } from "../picker.ts";
import { resolveCommand } from "./registry.ts";
import type { Format, ShortcutContext } from "./types.ts";
import { isInputElement } from "./types.ts";

/**
 * Runtime dependencies for {@link handleKeydown}.
 *
 * These are injected so the handler can be unit-tested without the full
 * content-script runtime (WXT shadow-root UI, SolidJS signals, etc.).
 *
 * @public
 */
export interface KeydownHandlerDeps {
  /** Read the currently focused element (production: `() => document.activeElement`). */
  getActiveElement: () => Element | null;
  /** Read the current bar format (the SolidJS signal getter). */
  getCurrentFormat: () => Format;
  /** The picker state machine to dispatch resolved commands to. */
  machine: PickerStateMachine;
  /** Set the bar format (the SolidJS signal setter) for FORMAT_CHANGE commands. */
  setFormat: (format: Format) => void;
  /** The shadow host element for re-dispatching unmatched key events. */
  shadowHost: Element | null;
}

/**
 * Intercept a `keydown` event and resolve it against the shortcut registry.
 *
 * Resolution follows {@link resolveCommand}'s priority table:
 *
 * 1. Escape → DISMISS (fires even during input focus).
 * 2. While an input, textarea, select, or contentEditable element is focused,
 *    all non-Escape keys are suppressed.
 * 3. In the SELECTED state only: Ctrl/Meta+c → COPY, Ctrl/Meta+s → DOWNLOAD,
 *    f → FORMAT_CHANGE (cycles markdown↔html).
 *
 * When a shortcut matches, the event is consumed (`preventDefault`,
 * `stopPropagation`) and the corresponding {@link PickerEvent} is dispatched on
 * the state machine. For FORMAT_CHANGE commands the format signal is updated
 * alongside the machine event so the bar and machine stay in sync.
 *
 * When no shortcut matches, the event is re-dispatched on the shadow host with
 * `bubbles: true` and `composed: true` so it can reach page-level listeners
 * that the content script's `isolateEvents: ["keydown"]` would otherwise hide.
 *
 * @param event - The raw `keydown` event from the content script listener.
 * @param deps  - Runtime dependencies (machine, format signals, shadow host).
 *
 * @public
 */
export function handleKeydown(
  event: KeyboardEvent,
  deps: KeydownHandlerDeps
): void {
  const context: ShortcutContext = {
    format: deps.getCurrentFormat(),
    inputFocused: isInputElement(deps.getActiveElement()),
    state: deps.machine.getState(),
  };

  const command = resolveCommand(context, event);

  if (command) {
    event.preventDefault();
    event.stopPropagation();
    deps.machine.dispatch(command.event);
    if (command.format !== undefined) {
      deps.setFormat(command.format);
    }
    // Close the picker after terminal actions (copy, download) so the
    // flow ends the same way as clicking the corresponding button.
    if (command.event.type === "COPY" || command.event.type === "DOWNLOAD") {
      deps.machine.dispatch({ type: "DISMISS" });
    }
    return;
  }

  if (deps.shadowHost) {
    deps.shadowHost.dispatchEvent(
      new KeyboardEvent("keydown", {
        altKey: event.altKey,
        bubbles: true,
        code: event.code,
        composed: true,
        ctrlKey: event.ctrlKey,
        key: event.key,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
      })
    );
  }
}
