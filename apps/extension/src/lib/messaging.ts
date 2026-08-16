import { type Browser, browser } from "wxt/browser";

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
 * Build an error payload from a thrown value, serialising non-Error throws to
 * their string representation.
 *
 * @internal
 */
function toErrorResponse(err: unknown): ErrorResponse {
  const message =
    err instanceof Error ? err.message : String(err ?? "Unknown error");
  return { [ERROR_SENTINEL]: message };
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
  const response = await browser.runtime.sendMessage(message);
  if (isErrorResponse(response)) {
    throw new Error(response[ERROR_SENTINEL]);
  }
}

/**
 * Listen for messages in background script.
 *
 * Returns the Promise from the callback so Firefox's promise-based
 * `browser` API keeps the message channel open. On success, `sendResponse` is
 * called with the handler's resolved value (or `undefined` for void handlers).
 * On failure, `sendResponse` is called with an error payload so the content
 * script's `sendMessage` rejects with the error details instead of silently
 * resolving.
 *
 * @public
 */
export function onMessage(
  callback: (
    message: Message,
    sender: Browser.runtime.MessageSender
  ) => Promise<unknown>
): void {
  browser.runtime.onMessage.addListener(
    (
      message: Message,
      sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      callback(message, sender)
        .then((result) => sendResponse(result))
        .catch((err) => {
          console.error("[tamiz] message handler error:", err);
          sendResponse(toErrorResponse(err));
        });
      return true;
    }
  );
}
