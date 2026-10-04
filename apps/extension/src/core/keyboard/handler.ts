import type { PickerSession } from "../session/session.ts";
import type { ShortcutContext } from "./types.ts";
import { isInputElement } from "./types.ts";

/**
 * Runtime dependencies for {@link handleKeydown}.
 *
 * Injected to test the handler without the full content-script runtime.
 *
 * @public
 */
export interface KeydownHandlerDeps {
  /** Read the currently focused element (production: `() => document.activeElement`). */
  getActiveElement?: () => Element | null;
  /** The picker session instance managing state transitions and shortcuts. */
  session: PickerSession;
}

/**
 * Intercept a `keydown` event and resolve it against the session shortcut registry.
 *
 * When the picker is in the IDLE state, the handler returns immediately so
 * native host-page keyboard events remain untouched.
 *
 * Resolution follows the registry priority table:
 *
 * 1. Escape -> DISMISS (fires even during input focus).
 * 2. While an input, textarea, select, or contentEditable element has focus,
 *    all non-Escape keys are suppressed from matching extension shortcuts.
 * 3. In the SELECTED state only: c -> COPY, s -> DOWNLOAD,
 *    f -> FORMAT_CHANGE (cycles markdown <-> html).
 *
 * When a shortcut matches, the handler consumes the event (`preventDefault`,
 * `stopPropagation`) and dispatches the resolved action to the session.
 *
 * When no shortcut matches, the handler ignores the event. Unhandled events
 * continue their natural propagation path to the host page and target elements.
 *
 * @param event - The raw `keydown` event from the content script listener.
 * @param deps - Runtime dependencies (session, optional active element getter).
 *
 * @public
 */
export function handleKeydown(
  event: KeyboardEvent,
  deps: KeydownHandlerDeps
): void {
  const snapshot = deps.session.getSnapshot();
  if (snapshot.state === "IDLE") {
    return;
  }

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
  }
}
