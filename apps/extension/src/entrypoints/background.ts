import { type Browser, browser } from "wxt/browser";
import { BackgroundCoordinator } from "../core/background/coordinator.ts";
import { RuntimeChannel } from "../lib/messaging/adapters/runtime.ts";
import type { Message } from "../lib/messaging/types.ts";
import { readDefaultFormat } from "../lib/storage.ts";

/**
 * Read the default export format from storage.
 *
 * Wraps {@link readDefaultFormat} so callers in the background script do not
 * need to handle the async storage API directly.
 *
 * @returns The stored format or `"markdown"` fallback.
 *
 * @public
 */
export function getDefaultFormat(): Promise<"markdown" | "html"> {
  return readDefaultFormat();
}

/** ID used for the "Grab element..." context menu item. */
export const CONTEXT_MENU_ID = "tamiz-grab";

/** Title displayed for the context menu item. */
export const CONTEXT_MENU_TITLE = "Grab element...";

const coordinator = new BackgroundCoordinator();

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
 * Handle a click on the "Grab element..." context menu item.
 *
 * Relays an `INVOKE_PICKER` message to the content script in the clicked tab.
 * Clicks on other menu items and clicks without a valid tab id are silently
 * ignored.
 *
 * @public
 */
export async function handleContextMenuClick(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab
): Promise<void> {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.id !== undefined) {
    const format = await getDefaultFormat();
    coordinator
      .invokeTab(tab.id, format)
      .catch((err: unknown) =>
        console.error("Failed to relay INVOKE_PICKER:", err)
      );
  }
}

/**
 * Handle a click on the extension toolbar icon.
 *
 * Relays an `INVOKE_PICKER` message to the content script in the clicked tab,
 * defaulting to the content script's initial `barFormat` (markdown). Clicks on
 * pages where this is not possible are silently ignored.
 *
 * @public
 */
export async function handleActionClick(tab?: Browser.tabs.Tab): Promise<void> {
  if (tab?.id !== undefined) {
    const format = await getDefaultFormat();
    coordinator
      .invokeTab(tab.id, format)
      .catch((err: unknown) =>
        console.error("Failed to relay INVOKE_PICKER from action click:", err)
      );
  }
}

/**
 * Handle a keyboard shortcut command from `browser.commands.onCommand`.
 *
 * The reserved `_execute_action` command fires when the user presses the
 * toolbar-icon shortcut (Alt+Shift+G). It relays the same `INVOKE_PICKER`
 * flow as clicking the extension icon, defaulting to the content script's
 * initial format. All other commands are silently ignored.
 *
 * @param command - The command name from `browser.commands.onCommand`.
 *
 * @public
 */
export async function handleCommand(command: string): Promise<void> {
  if (command !== "_execute_action") {
    return;
  }
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id !== undefined) {
      const format = await getDefaultFormat();
      await coordinator.invokeTab(tab.id, format);
    }
  } catch (err: unknown) {
    console.error("Failed to relay INVOKE_PICKER from command:", err);
  }
}

/**
 * Create the "Grab element..." context menu item.
 *
 * Called on install/update via `onInstalled`. Swallows duplicate-id errors so
 * the call is idempotent when `onInstalled` fires again after an update.
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
try {
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

const actionApi =
  import.meta.env.MANIFEST_VERSION === 2
    ? browser.browserAction
    : browser.action;

try {
  actionApi.onClicked.addListener(handleActionClick);
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

try {
  browser.commands.onCommand.addListener(handleCommand);
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

try {
  browser.tabs.onRemoved.addListener((tabId: number) => {
    coordinator.handleTabRemoved(tabId);
  });
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

try {
  browser.downloads.onChanged.addListener(
    (delta: Browser.downloads.DownloadDelta) => {
      coordinator.handleDownloadChange(delta);
    }
  );
} catch {
  /* Build-time module evaluation: browser APIs are mocked and unsupported. */
}

/**
 * Route a background message to the appropriate handler.
 *
 * @remarks
 * - `INVOKE_PICKER` → relay to the sender's tab (or active tab as fallback)
 * - `CONTENT_READY` → flush any pending `INVOKE_PICKER` for the sender's tab
 * - `COPY_TO_CLIPBOARD` → write to the clipboard
 * - `DOWNLOAD_FILE` → trigger a file download
 * - `OPEN_OPTIONS` → open the extension options page
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
          await coordinator.invokeTab(tab.id, message.format);
        }
      } else {
        await coordinator.invokeTab(tabId, message.format);
      }
      break;
    }
    case "CONTENT_READY": {
      coordinator.handleContentReady(sender.tab?.id);
      break;
    }
    case "COPY_TO_CLIPBOARD":
      await copyToClipboard(message.content);
      break;
    case "DOWNLOAD_FILE":
      await coordinator.download(message.content, message.filename);
      break;
    case "OPEN_OPTIONS":
      browser.runtime.openOptionsPage();
      break;
    default:
      break;
  }
}

/**
 * Background script entry point.
 *
 * Registers the context menu and routes incoming messages through {@link handleBackgroundMessage}.
 */
export default defineBackground({
  main() {
    const runtimeChannel = new RuntimeChannel({ browser });
    browser.runtime.onInstalled.addListener(createContextMenu);
    runtimeChannel.onMessage(async (message, sender) => {
      await handleBackgroundMessage(
        message,
        sender as Browser.runtime.MessageSender
      );
    });
  },
});
