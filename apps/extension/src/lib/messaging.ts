import { type Browser, browser } from "wxt/browser";

/**
 * Message types for content script ↔ background communication.
 *
 * @public
 */
export type Message =
  | { type: "INVOKE_PICKER"; format?: "markdown" | "raw" }
  | { type: "COPY_TO_CLIPBOARD"; content: string }
  | { type: "DOWNLOAD_FILE"; content: string; filename: string }
  | { type: "TOAST"; message: string };

/**
 * Send a message from content script to background.
 *
 * @public
 */
export async function sendMessage(message: Message): Promise<void> {
  await browser.runtime.sendMessage(message);
}

/**
 * Listen for messages in background script.
 *
 * Returns the Promise from the callback so Firefox's promise-based
 * `browser` API keeps the message channel open.
 *
 * @public
 */
export function onMessage(
  callback: (
    message: Message,
    sender: Browser.runtime.MessageSender
  ) => Promise<void>
): void {
  browser.runtime.onMessage.addListener(
    (
      message: Message,
      sender: Browser.runtime.MessageSender,
      sendResponse: () => void
    ) => {
      callback(message, sender)
        .then(() => sendResponse())
        .catch((err) => {
          console.error("[tamiz] message handler error:", err);
          sendResponse();
        });
      return true;
    }
  );
}
