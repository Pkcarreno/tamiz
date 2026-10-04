import type { PickerSession } from "../session/session.ts";
import type { ShortcutContext } from "./types.ts";
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
  getActiveElement?: () => Element | null;
  /** The picker session instance managing state transitions and shortcuts. */
  session: PickerSession;
  /** The shadow host element for re-dispatching unmatched key events. */
  shadowHost: Element | null;
}

/**
 * Intercept a `keydown` event and resolve it against the session's shortcut registry.
 *
 * Resolution follows the registry's priority table:
 *
 * 1. Escape → DISMISS (fires even during input focus).
 * 2. While an input, textarea, select, or contentEditable element is focused,
 *    all non-Escape keys are suppressed.
 * 3. In the SELECTED state only: c → COPY, s → DOWNLOAD,
 *    f → FORMAT_CHANGE (cycles markdown↔html).
 *
 * When a shortcut matches, the event is consumed (`preventDefault`,
 * `stopPropagation`) and the resolved action is dispatched to the session.
 *
 * When no shortcut matches, the event is re-dispatched on the shadow host with
 * `bubbles: true` and `composed: true` so it can reach page-level listeners
 * that the content script's `isolateEvents: ["keydown"]` would otherwise hide.
 *
 * @param event - The raw `keydown` event from the content script listener.
 * @param deps  - Runtime dependencies (session, shadow host, optional active element getter).
 *
 * @public
 */
export function handleKeydown(
  event: KeyboardEvent,
  deps: KeydownHandlerDeps
): void {
  const snapshot = deps.session.getSnapshot();
  const getActiveEl = deps.getActiveElement ?? (() => document.activeElement);

  const context: ShortcutContext = {
    format: snapshot.format,
    inputFocused: isInputElement(getActiveEl()),
    isExclusionMode: snapshot.isExclusionMode,
    state: snapshot.state,
  };

  // Escape in exclusion mode exits the sub-mode instead of dismissing.
  if (event.key === "Escape" && context.isExclusionMode) {
    event.preventDefault();
    event.stopPropagation();
    deps.session.dispatch({ type: "EXCLUDE_TOGGLE" });
    return;
  }

  const command = deps.session.registry.matchShortcut(event, context);

  if (command) {
    event.preventDefault();
    event.stopPropagation();
    deps.session.dispatch(command);
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
