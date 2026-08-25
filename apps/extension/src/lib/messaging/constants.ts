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

/**
 * All valid cross-world message type strings.
 *
 * Used by {@link PostMessageChannel} to filter inbound `window.postMessage`
 * events and ignore unrelated traffic.
 *
 * @internal
 */
export const CROSS_WORLD_MESSAGE_TYPES = [
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_SHUTDOWN,
  TAMIZ_BLOCKING_READY,
  TAMIZ_BLOCKING_CLICK,
] as const;
