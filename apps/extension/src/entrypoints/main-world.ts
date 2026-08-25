/**
 * Main-world event blocker for the Tamiz element picker.
 *
 * Registers capturing-phase listeners on `document` for click, mousedown,
 * mouseup, and submit events. When `blockingEnabled` is true, intercepted
 * events are stopped via `stopImmediatePropagation()` and `preventDefault()`.
 * Clicks are relayed back to the content script as coordinate payloads.
 */

import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import { PostMessageChannel } from "../lib/messaging/adapters/postmessage.ts";
import {
  TAMIZ_BLOCKING_CLICK,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_READY,
  TAMIZ_BLOCKING_SHUTDOWN,
  TAMIZ_UI_MARKER,
} from "../lib/messaging/constants.ts";

/** Event types that the blocker intercepts. */
const BLOCKED_TYPES = ["click", "mousedown", "mouseup", "submit"] as const;

// ---------------------------------------------------------------------------
// shouldBlock predicate (pure — exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Determine whether an event should be blocked.
 *
 * Events are blocked when `enabled` is true and the event target is NOT
 * a Tamiz UI element (marked with `data-tamiz-ui`).
 *
 * @param enabled - Whether blocking is currently active.
 * @param target  - The event's target element (retargeted for shadow DOM).
 * @param type    - The DOM event type name.
 * @returns `true` if the event should be intercepted.
 *
 * @public
 */
export function shouldBlock(
  enabled: boolean,
  target: EventTarget | null,
  _type: string
): boolean {
  if (!enabled) {
    return false;
  }
  if (!(target instanceof Element)) {
    return true;
  }
  return !target.hasAttribute(TAMIZ_UI_MARKER);
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
    const channel = new PostMessageChannel();

    // --- Protocol listeners (content → main) via postMessage ---
    // CustomEvents cannot cross the isolated-world / main-world boundary,
    // so all cross-world communication uses window.postMessage.

    channel.onMessage((msg) => {
      if (msg.type === TAMIZ_BLOCKING_ENABLE) {
        blockingEnabled = true;
      } else if (msg.type === TAMIZ_BLOCKING_DISABLE) {
        blockingEnabled = false;
      } else if (msg.type === TAMIZ_BLOCKING_SHUTDOWN) {
        // Extension invalidated — clear the install guard so a fresh
        // content-script injection can re-register listeners.
        (window as unknown as Record<string, unknown>)[GLOBAL_KEY] = false;
      }
      return Promise.resolve();
    });

    // --- Capturing listeners (event interception) ---

    for (const eventType of BLOCKED_TYPES) {
      document.addEventListener(
        eventType,
        (e) => {
          if (!blockingEnabled) {
            return;
          }

          if (!shouldBlock(blockingEnabled, e.target, eventType)) {
            return;
          }

          e.preventDefault();
          e.stopImmediatePropagation();

          // Relay click coordinates to the content script via postMessage.
          // CustomEvents cannot cross the isolated/main world boundary.
          if (eventType === "click") {
            const mouse = e as MouseEvent;
            channel.send({
              clientX: mouse.clientX,
              clientY: mouse.clientY,
              type: TAMIZ_BLOCKING_CLICK,
            });
          }
        },
        { capture: true }
      );
    }

    // --- Announce readiness via postMessage ---

    channel.send({ type: TAMIZ_BLOCKING_READY });
  },
});
