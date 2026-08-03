import { type Browser, browser } from "@wxt-dev/browser";

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
 * @public
 */
export function onMessage(
  callback: (message: Message, sender: Browser.runtime.MessageSender) => void
): void {
  browser.runtime.onMessage.addListener(
    (message: Message, sender: Browser.runtime.MessageSender) => {
      callback(message, sender);
    }
  );
}
