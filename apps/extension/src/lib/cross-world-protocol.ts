/**
 * Cross-world protocol constants and types for the Tamiz element picker.
 *
 * Shared between the content script (isolated world) and the main-world
 * blocker script. All cross-world communication uses `window.postMessage`,
 * so this module defines the message shapes and event-name constants that
 * both worlds reference.
 */

// ---------------------------------------------------------------------------
// Protocol event-name constants
// ---------------------------------------------------------------------------

/** Content → Main: activate event interception. @public */
export const TAMIZ_BLOCKING_ENABLE = "tamiz:blocking-enable" as const;

/** Content → Main: deactivate event interception. @public */
export const TAMIZ_BLOCKING_DISABLE = "tamiz:blocking-disable" as const;

/** Content → Main: extension invalidated — clear install guard. @public */
export const TAMIZ_BLOCKING_SHUTDOWN = "tamiz:blocking-shutdown" as const;

/** Main → Content: script loaded and listeners registered. @public */
export const TAMIZ_BLOCKING_READY = "tamiz:blocking-ready" as const;

/** Main → Content: intercepted click relayed with coordinates. @public */
export const TAMIZ_BLOCKING_CLICK = "tamiz:blocking-click" as const;

/** Attribute marker for Tamiz UI elements (excluded from blocking). @public */
export const TAMIZ_UI_MARKER = "data-tamiz-ui" as const;

/** Time to wait for the main-world ready signal before marking unavailable. @public */
export const READY_TIMEOUT_MS = 500;

// ---------------------------------------------------------------------------
// Message interfaces (discriminated union by `type`)
// ---------------------------------------------------------------------------

/** Content → Main: activate event interception. @public */
export interface BlockingEnableMessage {
  readonly type: typeof TAMIZ_BLOCKING_ENABLE;
}

/** Content → Main: deactivate event interception. @public */
export interface BlockingDisableMessage {
  readonly type: typeof TAMIZ_BLOCKING_DISABLE;
}

/** Content → Main: extension invalidated — clear install guard. @public */
export interface BlockingShutdownMessage {
  readonly type: typeof TAMIZ_BLOCKING_SHUTDOWN;
}

/** Main → Content: script loaded and listeners registered. @public */
export interface BlockingReadyMessage {
  readonly type: typeof TAMIZ_BLOCKING_READY;
}

/** Main → Content: intercepted click with viewport coordinates. @public */
export interface BlockingClickMessage {
  readonly clientX: number;
  readonly clientY: number;
  readonly type: typeof TAMIZ_BLOCKING_CLICK;
}

/**
 * Discriminated union of all cross-world messages.
 *
 * Use the `type` field to narrow to the specific message interface.
 *
 * @public
 */
export type CrossWorldMessage =
  | BlockingEnableMessage
  | BlockingDisableMessage
  | BlockingShutdownMessage
  | BlockingReadyMessage
  | BlockingClickMessage;
