import { storage } from "wxt/utils/storage";

import type { Format } from "../core/keyboard/types.ts";

/**
 * WXT storage item for the default export format preference.
 *
 * Stored in `browser.storage.sync` so the setting syncs across devices.
 * Falls back to `"markdown"` when the value is unset or unreadable.
 */
const defaultFormatItem = storage.defineItem<Format>("sync:defaultFormat", {
  fallback: "markdown",
});

/**
 * Read the user's default export format preference.
 *
 * Never throws — returns `"markdown"` as the fallback when the stored value
 * is missing, corrupt, or when the storage API is unavailable.
 *
 * @returns The stored format or the `"markdown"` fallback.
 *
 * @public
 */
export async function readDefaultFormat(): Promise<Format> {
  try {
    return await defaultFormatItem.getValue();
  } catch {
    console.warn(
      "[tamiz] failed to read default format, falling back to markdown"
    );
    return "markdown";
  }
}

/**
 * Persist the user's default export format preference.
 *
 * Swallows errors silently and logs them so a storage failure never
 * crashes the options page or the background script.
 *
 * @param format - The format to persist (`"markdown"` or `"html"`).
 *
 * @public
 */
export async function writeDefaultFormat(format: Format): Promise<void> {
  try {
    await defaultFormatItem.setValue(format);
  } catch (err) {
    console.error("[tamiz] failed to write default format:", err);
  }
}
