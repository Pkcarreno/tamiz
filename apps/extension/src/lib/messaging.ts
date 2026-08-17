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

/**
 * Sentinel property used to distinguish an error response from a legitimate
 * `undefined` result. When the background handler throws, `onMessage` sends back
 * an object containing this key so the content-script side can reject instead of
 * silently resolving.
 *
 * @internal
 */
const ERROR_SENTINEL = "__error";

/**
 * Error response shape sent back through the message channel when a background
 * handler fails. Inspected by {@link sendMessage} to reject on the content side.
 *
 * @internal
 */
interface ErrorResponse {
  [ERROR_SENTINEL]: string;
}

/**
 * Determine whether a `sendResponse` value is an error payload that should
 * cause the content-script `sendMessage` to reject rather than resolve.
 *
 * A plain `undefined` (the normal success outcome for void handlers) is NOT an
 * error — this mirrors the spec that "undefined outcome = success".
 *
 * @internal
 */
function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    ERROR_SENTINEL in response &&
    typeof (response as ErrorResponse)[ERROR_SENTINEL] === "string"
  );
}

/**
 * Transport interface for message passing between content script and background.
 * Implementations wrap platform-specific messaging APIs (WXT, vanilla browser,
 * test mocks).
 *
 * @public
 */
export interface MessageTransport {
  /**
   * Register a handler for incoming messages.
   * The handler receives the message and an opaque sender reference.
   * The transport is responsible for error serialization and channel management.
   */
  onMessage: (
    handler: (message: Message, sender: unknown) => Promise<unknown>
  ) => void;
  /**
   * Send a message to the counterpart (content ↔ background).
   * Resolves with the response from the handler, or an error payload.
   */
  sendMessage: (message: Message) => Promise<unknown>;
}

/**
 * Module-level transport instance. Set via {@link setTransport} at entry-point
 * startup before any messaging calls.
 *
 * @internal
 */
let transport: MessageTransport | null = null;

/**
 * Configure the message transport. Must be called before any sendMessage/onMessage
 * use. Typically called once at entry-point startup.
 *
 * @param t - Transport implementation wrapping platform-specific messaging APIs
 * @public
 */
export function setTransport(t: MessageTransport): void {
  transport = t;
}

/**
 * Retrieve the configured transport. Throws if `setTransport` has not been called.
 *
 * @internal
 */
function getTransport(): MessageTransport {
  if (!transport) {
    throw new Error(
      "Transport not configured. Call setTransport() before using messaging."
    );
  }
  return transport;
}

/**
 * Send a message from content script to background.
 *
 * Resolves when the background handler succeeds. Rejects with the error message
 * when the background handler throws — Firefox's promise-based `sendMessage`
 * resolves with whatever `sendResponse` received, so we inspect it for an error
 * payload and translate it into a rejection.
 *
 * @public
 */
export async function sendMessage(message: Message): Promise<void> {
  const t = getTransport();
  const response = await t.sendMessage(message);
  if (isErrorResponse(response)) {
    throw new Error(response[ERROR_SENTINEL]);
  }
}

/**
 * Listen for messages in background script.
 *
 * Delegates to the configured transport's `onMessage`. The transport is
 * responsible for calling `sendResponse(result)` on success and
 * `sendResponse({ __error: ... })` on failure, as well as returning `true`
 * to keep the message channel open for Firefox's promise-based API.
 *
 * The sender parameter is `unknown` to keep this module WXT-agnostic; entry
 * points that need the concrete type can narrow locally.
 *
 * @public
 */
export function onMessage(
  callback: (message: Message, sender: unknown) => Promise<unknown>
): void {
  const t = getTransport();
  t.onMessage(callback);
}
