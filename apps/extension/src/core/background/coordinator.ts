import { type Browser, browser as defaultBrowser } from "wxt/browser";
import { isBlobUrlAvailable as defaultIsBlobUrlAvailable } from "../../lib/feature-detection.ts";
import type { Message } from "../../lib/messaging/types.ts";

/** Default bundle path for fallback content script injection. */
export const DEFAULT_CONTENT_SCRIPT_FILE = "content-scripts/content.js";

/** Default duration (ms) to keep pending invoke messages before discard. */
export const DEFAULT_PENDING_INVOKE_TIMEOUT_MS = 5000;

/** Default duration (ms) to wait before fallback blob URL revocation. */
export const DEFAULT_BLOB_URL_TIMEOUT_MS = 30_000;

/**
 * Queued INVOKE_PICKER message awaiting the content script CONTENT_READY announcement.
 */
interface PendingInvoke {
  message: Message;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Tracked blob URL paired with its fallback revocation timeout handle.
 */
interface BlobUrlEntry {
  blobUrl: string;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Dependencies injected into {@link BackgroundCoordinator}.
 *
 * @public
 */
export interface BackgroundCoordinatorDeps {
  /** Timeout (ms) for fallback blob URL revocation. */
  blobUrlTimeoutMs?: number;
  /** Browser API facade containing tabs, downloads, and scripting capabilities. */
  browser?: {
    downloads?: Pick<typeof defaultBrowser.downloads, "download">;
    scripting?: Pick<typeof defaultBrowser.scripting, "executeScript">;
    tabs?: Pick<typeof defaultBrowser.tabs, "sendMessage">;
  };
  /** Bundle path for fallback content script injection. */
  contentScriptFile?: string;
  /** Predicate returning true when blob URL creation is supported. */
  isBlobUrlAvailable?: () => boolean;
  /** Timeout (ms) for discarding unacknowledged pending tab invocations. */
  pendingInvokeTimeoutMs?: number;
}

/**
 * Determine the MIME type for a filename based on its file extension.
 *
 * @param filename - Target filename.
 * @returns Resolved MIME type string.
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
 * Encapsulates background retry queues, download lifecycles, and blob URL revocation.
 *
 * Provides deterministic lifecycle management and disposable state for the background service worker.
 *
 * @public
 */
export class BackgroundCoordinator {
  private readonly browserDeps: {
    downloads: Pick<typeof defaultBrowser.downloads, "download">;
    scripting: Pick<typeof defaultBrowser.scripting, "executeScript">;
    tabs: Pick<typeof defaultBrowser.tabs, "sendMessage">;
  };

  private readonly isBlobUrlAvailable: () => boolean;
  private readonly contentScriptFile: string;
  private readonly pendingInvokeTimeoutMs: number;
  private readonly blobUrlTimeoutMs: number;

  private readonly pendingInvokes = new Map<number, PendingInvoke>();
  private readonly blobUrlMap = new Map<number, BlobUrlEntry>();

  constructor(deps: BackgroundCoordinatorDeps = {}) {
    this.browserDeps = {
      downloads: deps.browser?.downloads ?? defaultBrowser.downloads,
      scripting: deps.browser?.scripting ?? defaultBrowser.scripting,
      tabs: deps.browser?.tabs ?? defaultBrowser.tabs,
    };
    this.isBlobUrlAvailable =
      deps.isBlobUrlAvailable ?? defaultIsBlobUrlAvailable;
    this.contentScriptFile =
      deps.contentScriptFile ?? DEFAULT_CONTENT_SCRIPT_FILE;
    this.pendingInvokeTimeoutMs =
      deps.pendingInvokeTimeoutMs ?? DEFAULT_PENDING_INVOKE_TIMEOUT_MS;
    this.blobUrlTimeoutMs =
      deps.blobUrlTimeoutMs ?? DEFAULT_BLOB_URL_TIMEOUT_MS;
  }

  /**
   * Relay an INVOKE_PICKER message to a target tab.
   *
   * Attempts direct message delivery. If delivery fails (e.g. Content Script not yet injected),
   * injects the content script bundle and queues the invoke until CONTENT_READY arrives.
   *
   * @param tabId - Target tab identifier.
   * @param format - Desired export format.
   */
  async invokeTab(tabId: number, format?: "markdown" | "html"): Promise<void> {
    const message: Message = { format, type: "INVOKE_PICKER" };
    try {
      await this.browserDeps.tabs.sendMessage(tabId, message);
    } catch {
      await this.browserDeps.scripting.executeScript({
        files: [this.contentScriptFile],
        target: { tabId },
      });
      this.queuePendingInvoke(tabId, message);
    }
  }

  /**
   * Flush any queued INVOKE_PICKER message for a tab that announced CONTENT_READY.
   *
   * @param tabId - Identifier of the announcing tab.
   */
  handleContentReady(tabId?: number): void {
    if (tabId === undefined) {
      return;
    }
    const pending = this.pendingInvokes.get(tabId);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timeout);
    this.pendingInvokes.delete(tabId);
    this.browserDeps.tabs
      .sendMessage(tabId, pending.message)
      .catch((err: unknown) => {
        console.error("[tamiz] failed to flush pending invoke:", err);
      });
  }

  /**
   * Remove any pending invoke when a tab closes to avoid memory leaks.
   *
   * @param tabId - Identifier of the closed tab.
   */
  handleTabRemoved(tabId: number): void {
    const pending = this.pendingInvokes.get(tabId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingInvokes.delete(tabId);
    }
  }

  /**
   * Trigger a file download for export content.
   *
   * On Firefox, uses blob URLs and tracks them for revocation on completion or timeout.
   * On Chromium MV3, falls back to data URLs.
   *
   * @param content - String content to download.
   * @param filename - Name of destination file.
   */
  async download(content: string, filename: string): Promise<void> {
    const mimeType = getMimeType(filename);

    if (this.isBlobUrlAvailable()) {
      const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
      let downloadId: number;
      try {
        downloadId = await this.browserDeps.downloads.download({
          filename,
          url,
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        throw err;
      }
      this.trackBlobUrl(downloadId, url);
    } else {
      const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
      await this.browserDeps.downloads.download({ filename, url });
    }
  }

  /**
   * Revoke tracked blob URLs when a download completes or fails.
   *
   * @param delta - Download change delta from browser.downloads.onChanged.
   */
  handleDownloadChange(delta: Browser.downloads.DownloadDelta): void {
    const current = delta.state?.current;
    if (current !== "complete" && current !== "interrupted") {
      return;
    }
    const entry = this.blobUrlMap.get(delta.id);
    if (entry) {
      clearTimeout(entry.timeout);
      URL.revokeObjectURL(entry.blobUrl);
      this.blobUrlMap.delete(delta.id);
    }
  }

  /**
   * Clear all pending timeouts and revoke all tracked blob URLs.
   *
   * Ensures deterministic cleanup during shutdown and test isolation.
   */
  dispose(): void {
    for (const { timeout } of this.pendingInvokes.values()) {
      clearTimeout(timeout);
    }
    this.pendingInvokes.clear();

    for (const { blobUrl, timeout } of this.blobUrlMap.values()) {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
    }
    this.blobUrlMap.clear();
  }

  private queuePendingInvoke(tabId: number, message: Message): void {
    const existing = this.pendingInvokes.get(tabId);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    this.pendingInvokes.set(tabId, {
      message,
      timeout: setTimeout(() => {
        this.pendingInvokes.delete(tabId);
      }, this.pendingInvokeTimeoutMs),
    });
  }

  private trackBlobUrl(downloadId: number, blobUrl: string): void {
    this.blobUrlMap.set(downloadId, {
      blobUrl,
      timeout: setTimeout(() => {
        const entry = this.blobUrlMap.get(downloadId);
        if (entry) {
          URL.revokeObjectURL(entry.blobUrl);
          this.blobUrlMap.delete(downloadId);
        }
      }, this.blobUrlTimeoutMs),
    });
  }
}
