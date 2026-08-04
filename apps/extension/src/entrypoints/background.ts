import { type Browser, browser } from "@wxt-dev/browser";
import { defineBackground } from "wxt/utils/define-background";

import { type Message, onMessage } from "../lib/messaging.ts";

/** ID used for the "Capture readable content" context menu item. */
export const CONTEXT_MENU_ID = "tamiz-capture";

/** Title displayed for the context menu item. */
export const CONTEXT_MENU_TITLE = "Capture readable content";

/**
 * Bundle path for the content script, injected as a fall-back when
 * `tabs.sendMessage` fails on pages where the content script was not
 * auto-injected.
 */
const CONTENT_SCRIPT_FILE = "content-scripts/content.js";

/**
 * Register the "Capture readable content" context menu item on startup.
 *
 * Creates a page-only context menu entry and registers a click listener
 * that relays `INVOKE_PICKER` to the active tab's content script.
 *
 * @public
 */
export function registerContextMenu(): void {
  browser.contextMenus.create({
    contexts: ["page"],
    id: CONTEXT_MENU_ID,
    title: CONTEXT_MENU_TITLE,
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID && tab?.id !== undefined) {
      relayInvokePicker(tab.id).catch((err) =>
        console.error("Failed to relay INVOKE_PICKER:", err)
      );
    }
  });
}

/**
 * Relay an `INVOKE_PICKER` message to the content script in `tabId`.
 *
 * If the content script is not injected — `tabs.sendMessage` rejects because
 * there is no listener — the script is injected first via
 * `scripting.executeScript` and the message is retried.
 *
 * @public
 */
export async function relayInvokePicker(
  tabId: number,
  format?: "markdown" | "raw"
): Promise<void> {
  const message: Message = { format, type: "INVOKE_PICKER" };
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    await browser.scripting.executeScript({
      files: [CONTENT_SCRIPT_FILE],
      target: { tabId },
    });
    await browser.tabs.sendMessage(tabId, message);
  }
}

/**
 * Write text to the system clipboard.
 *
 * Errors are caught so the background script does not crash when clipboard
 * access is denied.
 *
 * @public
 */
export async function copyToClipboard(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content);
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
  }
}

/**
 * Determine the MIME type for a filename based on its extension.
 *
 * Returns `text/html` for `.html` files, `text/markdown` for `.md` files,
 * and `text/plain` as a fallback for any other extension.
 *
 * @public
 */
export function getMimeType(filename: string): string {
  if (filename.endsWith(".html")) {
    return "text/html";
  }
  if (filename.endsWith(".md")) {
    return "text/markdown";
  }
  return "text/plain";
}

/**
 * Trigger a file download for the given content and filename.
 *
 * Constructs a `data:` URL from the content and the filename's MIME type,
 * then passes it to `browser.downloads.download`. Using a data URL instead
 * of `URL.createObjectURL` keeps the function compatible with Chrome MV3
 * service workers — where `createObjectURL` is unavailable — and Firefox
 * MV3 event pages.
 *
 * Errors are re-thrown so callers can surface download failures to the
 * user instead of silently succeeding.
 *
 * @public
 */
export async function downloadFile(
  content: string,
  filename: string
): Promise<void> {
  const url = `data:${getMimeType(filename)};charset=utf-8,${encodeURIComponent(content)}`;
  await browser.downloads.download({ filename, url });
}

/**
 * Route a background message to the appropriate handler.
 *
 * @remarks
 * - `INVOKE_PICKER` → relay to the sender's tab (or active tab as fallback)
 * - `COPY_TO_CLIPBOARD` → write to the clipboard
 * - `DOWNLOAD_FILE` → trigger a file download
 * - `TOAST` → forward to the popup if open
 *
 * @public
 */
export async function handleBackgroundMessage(
  message: Message,
  sender: Browser.runtime.MessageSender
): Promise<void> {
  switch (message.type) {
    case "INVOKE_PICKER": {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.id !== undefined) {
          await relayInvokePicker(tab.id, message.format);
        }
      } else {
        await relayInvokePicker(tabId, message.format);
      }
      break;
    }
    case "COPY_TO_CLIPBOARD":
      await copyToClipboard(message.content);
      break;
    case "DOWNLOAD_FILE":
      await downloadFile(message.content, message.filename);
      break;
    case "TOAST":
      await browser.runtime.sendMessage(message).catch(() => {
        /* no popup open — silently drop the toast */
      });
      break;
    default:
      break;
  }
}

/**
 * Background script entry point.
 *
 * Registers the context menu and routes incoming messages — from the
 * popup, context menu, or content script — through {@link handleBackgroundMessage}.
 */
export default defineBackground({
  main() {
    registerContextMenu();
    onMessage(async (message, sender) => {
      await handleBackgroundMessage(message, sender);
    });
  },
});
