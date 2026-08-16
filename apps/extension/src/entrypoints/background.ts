import { type Browser, browser } from "wxt/browser";

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
 * Maximum time (ms) to wait for a content script's `CONTENT_READY` before
 * dropping the pending invoke. Prevents the background from holding invokes
 * indefinitely for tabs where the content script never finishes loading.
 */
const PENDING_INVOKE_TIMEOUT_MS = 5000;

/**
 * A queued `INVOKE_PICKER` awaiting the content script's `CONTENT_READY`
 * announcement.
 */
interface PendingInvoke {
  message: Message;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Pending invokes keyed by tab id, waiting for the content script to announce
 * `CONTENT_READY` after its message listener is registered.
 */
const pendingInvokes = new Map<number, PendingInvoke>();

/**
 * Queue an `INVOKE_PICKER` message for a tab whose content script has not yet
 * announced readiness. Deduplicates: if an entry already exists for the tab,
 * its timeout is cleared and replaced so the most recent invoke wins.
 *
 * @internal
 */
export function queuePendingInvoke(tabId: number, message: Message): void {
  const existing = pendingInvokes.get(tabId);
  if (existing) {
    clearTimeout(existing.timeout);
  }
  pendingInvokes.set(tabId, {
    message,
    timeout: setTimeout(() => {
      pendingInvokes.delete(tabId);
    }, PENDING_INVOKE_TIMEOUT_MS),
  });
}

/**
 * Flush the pending invoke for a tab by sending it immediately. Clears the
 * timeout first so it does not fire after the flush.
 *
 * @internal
 */
export function flushPendingInvokes(tabId: number | undefined): void {
  if (tabId === undefined) {
    return;
  }
  const pending = pendingInvokes.get(tabId);
  if (!pending) {
    return;
  }
  clearTimeout(pending.timeout);
  pendingInvokes.delete(tabId);
  browser.tabs.sendMessage(tabId, pending.message).catch((err) => {
    console.error("[tamiz] failed to flush pending invoke:", err);
  });
}

/**
 * Remove a pending invoke for the given tab without sending it. Called when a
 * tab is closed to prevent leaks.
 *
 * @internal
 */
export function removePendingInvoke(tabId: number): void {
  const pending = pendingInvokes.get(tabId);
  if (pending) {
    clearTimeout(pending.timeout);
    pendingInvokes.delete(tabId);
  }
}

/**
 * Clear all pending invokes and their timeouts. Intended for graceful shutdown
 * and test cleanup.
 *
 * @internal
 */
export function clearPendingInvokes(): void {
  for (const { timeout } of pendingInvokes.values()) {
    clearTimeout(timeout);
  }
  pendingInvokes.clear();
}

/**
 * Maximum time (ms) to wait for a download's `onChanged` event before revoking
 * a tracked blob URL as a fallback. Firefox builds use blob URLs for downloads;
 * if `onChanged` does not fire within this window, the blob URL is revoked to
 * avoid leaking memory.
 */
const BLOB_URL_TIMEOUT_MS = 30_000;

/**
 * A tracked blob URL paired with the 30-second revocation timeout handle.
 *
 * @internal
 */
interface BlobUrlEntry {
  /** The blob URL to revoke. */
  blobUrl: string;
  /** Fallback timeout that revokes the URL if onChanged never fires. */
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Blob URLs keyed by download id, pending revocation once the download reaches
 * a terminal state. Only populated for Firefox downloads.
 *
 * @internal
 */
const blobUrlMap = new Map<number, BlobUrlEntry>();

/**
 * Clear all tracked blob URLs, revoking each and canceling its timeout.
 * Intended for graceful shutdown and test cleanup so blob URLs from one
 * test don't leak into another.
 *
 * @internal
 */
export function clearBlobUrlMap(): void {
  for (const { blobUrl, timeout } of blobUrlMap.values()) {
    clearTimeout(timeout);
    URL.revokeObjectURL(blobUrl);
  }
  blobUrlMap.clear();
}

/**
 * Register a blob URL for revocation when the corresponding download reaches a
 * terminal state via `downloads.onChanged`, or as a 30-second timeout fallback
 * if `onChanged` never fires.
 *
 * @internal
 */
function trackBlobUrl(downloadId: number, blobUrl: string): void {
  blobUrlMap.set(downloadId, {
    blobUrl,
    timeout: setTimeout(() => {
      const entry = blobUrlMap.get(downloadId);
      if (entry) {
        URL.revokeObjectURL(entry.blobUrl);
        blobUrlMap.delete(downloadId);
      }
    }, BLOB_URL_TIMEOUT_MS),
  });
}

/**
 * Revoke tracked blob URLs when a download reaches a terminal state
 * (`complete` or `interrupted`). The 30-second timeout fallback in
 * {@link trackBlobUrl} handles the case where `onChanged` never fires.
 *
 * Registered at module scope so it survives MV3 service worker restarts.
 *
 * @internal
 */
function handleDownloadChange(delta: Browser.downloads.DownloadDelta): void {
  const current = delta.state?.current;
  if (current !== "complete" && current !== "interrupted") {
    return;
  }
  const entry = blobUrlMap.get(delta.id);
  if (entry) {
    clearTimeout(entry.timeout);
    URL.revokeObjectURL(entry.blobUrl);
    blobUrlMap.delete(delta.id);
  }
}

/**
 * Handle a click on the "Capture readable content" context menu item.
 *
 * Relays an `INVOKE_PICKER` message to the content script in the clicked tab.
 * Clicks on other menu items and clicks without a valid tab id are silently
 * ignored.
 *
 * @public
 */
export function handleContextMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab
): void {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.id !== undefined) {
    relayInvokePicker(tab.id).catch((err) =>
      console.error("Failed to relay INVOKE_PICKER:", err)
    );
  }
}

/**
 * Create the "Capture readable content" context menu item.
 *
 * Called on install/update via `onInstalled`. Swallows duplicate-id errors so
 * the call is idempotent when `onInstalled` fires again after an update — the
 * menu item already exists and Chrome throws rather than silently no-ops.
 *
 * The click listener is registered separately at module scope (see
 * {@link handleContextMenuClick}) so it survives MV3 service worker restarts.
 *
 * @public
 */
export function createContextMenu(): void {
  try {
    browser.contextMenus.create({
      contexts: ["page"],
      id: CONTEXT_MENU_ID,
      title: CONTEXT_MENU_TITLE,
    });
  } catch {
    // Duplicate-id error on update: menu item already exists, safely ignore.
  }
}

// Register the click listener at module scope so it survives MV3 service worker
// restarts — `onInstalled` only fires on install/update, not on every restart.
// In the build-time module-evaluation context the fake browser's contextMenus
// API throws, so we guard with try/catch — the listener is always registered at
// runtime in a real browser.
try {
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

// Register tab-removal cleanup at module scope so it survives MV3 service
// worker restarts (onInstalled only fires on install/update, not every
// restart). When a tab is closed, any pending invoke for that tab is discarded
// to avoid sending into a dead page.
try {
  browser.tabs.onRemoved.addListener((tabId: number) => {
    removePendingInvoke(tabId);
  });
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

// Register the blob URL revocation listener at module scope so it survives MV3
// service worker restarts — onInstalled only fires on install/update, not every
// restart. In the build-time module-evaluation context the fake browser's
// downloads API throws, so we guard with try/catch — the listener is always
// registered at runtime in a real browser.
try {
  browser.downloads.onChanged.addListener(handleDownloadChange);
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

/**
 * Relay an `INVOKE_PICKER` message to the content script in `tabId`.
 *
 * If the content script is not injected — `tabs.sendMessage` rejects because
 * there is no listener — the script is injected via `scripting.executeScript`
 * and the invoke is queued. The queued invoke is flushed when the content
 * script sends `CONTENT_READY`, which it dispatches after registering its
 * message listener. This avoids the race where a blind retry fires before the
 * listener exists ("Receiving end does not exist").
 *
 * @public
 */
export async function relayInvokePicker(
  tabId: number,
  format?: "markdown" | "html"
): Promise<void> {
  const message: Message = { format, type: "INVOKE_PICKER" };
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    await browser.scripting.executeScript({
      files: [CONTENT_SCRIPT_FILE],
      target: { tabId },
    });
    queuePendingInvoke(tabId, message);
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
 * On Firefox, constructs a `blob:` URL via `URL.createObjectURL` — the Firefox
 * MV2 background page supports this API, unlike Chrome MV3 service workers which
 * crash on `createObjectURL`. On Chrome (and other browsers), falls back to a
 * `data:` URL for MV3 compatibility.
 *
 * Blob URL lifecycle management (onChanged revocation + 30s timeout fallback)
 * is handled by the module-scope listener below. If `downloads.download` itself
 * rejects, the blob URL is revoked immediately and the error is re-thrown so
 * callers can surface it.
 *
 * @public
 */
export async function downloadFile(
  content: string,
  filename: string
): Promise<void> {
  const mimeType = getMimeType(filename);

  if (import.meta.env.BROWSER === "firefox") {
    const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    let downloadId: number;
    try {
      downloadId = await browser.downloads.download({ filename, url });
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
    trackBlobUrl(downloadId, url);
  } else {
    const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
    await browser.downloads.download({ filename, url });
  }
}

/**
 * Route a background message to the appropriate handler.
 *
 * @remarks
 * - `INVOKE_PICKER` → relay to the sender's tab (or active tab as fallback)
 * - `COPY_TO_CLIPBOARD` → write to the clipboard
 * - `DOWNLOAD_FILE` → trigger a file download
 * - `TOAST` → forward to the popup if open
 * - `CONTENT_READY` → flush any pending `INVOKE_PICKER` for the sender's tab
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
    case "CONTENT_READY": {
      flushPendingInvokes(sender.tab?.id);
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
    browser.runtime.onInstalled.addListener(createContextMenu);
    onMessage(async (message, sender) => {
      await handleBackgroundMessage(message, sender);
    });
  },
});
