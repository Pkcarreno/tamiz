/**
 * Main-world event blocker for the Tamiz element picker.
 *
 * Registers capturing-phase listeners on `document` for click, mousedown,
 * mouseup, and submit events. When `blockingEnabled` is true, intercepted
 * events are stopped via `stopImmediatePropagation()` and `preventDefault()`.
 * Clicks are relayed back to the content script as coordinate payloads.
 */

import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";

// ---------------------------------------------------------------------------
// Protocol event names
// ---------------------------------------------------------------------------

/** Content → Main: activate event interception. */
export const TAMIZ_BLOCKING_ENABLE = "tamiz:blocking-enable" as const;

/** Content → Main: deactivate event interception. */
export const TAMIZ_BLOCKING_DISABLE = "tamiz:blocking-disable" as const;

/** Main → Content: script loaded and listeners registered. */
export const TAMIZ_BLOCKING_READY = "tamiz:blocking-ready" as const;

/** Main → Content: intercepted click relayed with coordinates. */
export const TAMIZ_BLOCKING_CLICK = "tamiz:blocking-click" as const;

/** Attribute marker for Tamiz UI elements (excluded from blocking). */
export const TAMIZ_UI_MARKER = "data-tamiz-ui" as const;

/** Event types that the blocker intercepts. */
const BLOCKED_TYPES = ["click", "mousedown", "mouseup", "submit"] as const;

// ---------------------------------------------------------------------------
// shouldBlock predicate (pure — exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Determine whether an event should be blocked.
 *
 * Events are blocked when `enabled` is true and the composed path does NOT
 * contain a Tamiz UI element (marked with `data-tamiz-ui`).
 *
 * @param enabled - Whether blocking is currently active.
 * @param path    - The event's composed path (elements from target to root).
 * @param type    - The DOM event type name.
 * @returns `true` if the event should be intercepted.
 *
 * @public
 */
export function shouldBlock(
  enabled: boolean,
  path: EventTarget[],
  _type: string
): boolean {
  if (!enabled) {
    return false;
  }
  return !path.some(
    (el) => el instanceof Element && el.hasAttribute(TAMIZ_UI_MARKER)
  );
}

// ---------------------------------------------------------------------------
// Main-world script (runs in MAIN world via injectScript)
// ---------------------------------------------------------------------------

/** Guard against duplicate listener registration on re-injection. */
const GLOBAL_KEY = "__tamizBlockerInstalled" as const;

export default defineUnlistedScript({
  main() {
    // Idempotency: bail if already installed.
    if ((window as unknown as Record<string, unknown>)[GLOBAL_KEY]) {
      return;
    }
    (window as unknown as Record<string, unknown>)[GLOBAL_KEY] = true;

    let blockingEnabled = false;

    // --- Protocol listeners (content → main) ---

    document.addEventListener(TAMIZ_BLOCKING_ENABLE, () => {
      blockingEnabled = true;
    });

    document.addEventListener(TAMIZ_BLOCKING_DISABLE, () => {
      blockingEnabled = false;
    });

    // --- Capturing listeners (event interception) ---

    for (const eventType of BLOCKED_TYPES) {
      document.addEventListener(
        eventType,
        (e) => {
          if (!blockingEnabled) {
            return;
          }

          // Build composed path — includes shadow DOM ancestors.
          const path = e.composedPath();

          if (!shouldBlock(blockingEnabled, path, eventType)) {
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();

          // Relay click coordinates to the content script.
          if (eventType === "click") {
            const mouse = e as MouseEvent;
            document.dispatchEvent(
              new CustomEvent(TAMIZ_BLOCKING_CLICK, {
                detail: { clientX: mouse.clientX, clientY: mouse.clientY },
              })
            );
          }
        },
        { capture: true }
      );
    }

    // --- Announce readiness ---

    document.dispatchEvent(new CustomEvent(TAMIZ_BLOCKING_READY));
  },
});
