/**
 * Discriminated union of all user-facing actions that flow through the
 * centralized `ActionDispatcher`.
 *
 * These actions intentionally exclude internal state-machine events
 * (`MOUSEMOVE`, `CLICK`) that are never dispatched to the pipeline.
 *
 * @public
 */
export type PickerAction =
  | { type: "COPY" }
  | { type: "DOWNLOAD" }
  | { type: "DISMISS" }
  | { type: "RESTART" }
  | { type: "FORMAT_CHANGE"; format: "markdown" | "html" }
  | { type: "INVOKE"; format?: "markdown" | "html" }
  | { type: "SCROLL" }
  | { type: "RESIZE" };

/**
 * Union of the `type` field across every {@link PickerAction} variant.
 *
 * Used as the dispatch key for the pub/sub dispatcher's `on` method.
 *
 * @public
 */
export type PickerActionType = PickerAction["type"];
