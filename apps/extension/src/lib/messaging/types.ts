/**
 * Message types for content script ↔ background communication.
 *
 * @public
 */
export type Message =
  | { type: "INVOKE_PICKER"; format?: "markdown" | "html" }
  | { type: "COPY_TO_CLIPBOARD"; content: string }
  | { type: "DOWNLOAD_FILE"; content: string; filename: string }
  | { type: "TOAST"; message: string }
  | { type: "CONTENT_READY" };

// ---------------------------------------------------------------------------
// Cross-world message types (content isolated world ↔ main world)
// ---------------------------------------------------------------------------

/** Content → Main: activate event interception. @public */
export interface BlockingEnableMessage {
  readonly type: "tamiz:blocking-enable";
}

/** Content → Main: deactivate event interception. @public */
export interface BlockingDisableMessage {
  readonly type: "tamiz:blocking-disable";
}

/** Content → Main: extension invalidated — clear install guard. @public */
export interface BlockingShutdownMessage {
  readonly type: "tamiz:blocking-shutdown";
}

/** Main → Content: script loaded and listeners registered. @public */
export interface BlockingReadyMessage {
  readonly type: "tamiz:blocking-ready";
}

/** Main → Content: intercepted click with viewport coordinates. @public */
export interface BlockingClickMessage {
  readonly clientX: number;
  readonly clientY: number;
  readonly type: "tamiz:blocking-click";
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
