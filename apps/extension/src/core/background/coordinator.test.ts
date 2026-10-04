/**
 * Tests for BackgroundCoordinator lifecycle, retry queues, and download tracking.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { type Browser, browser } from "wxt/browser";
import { BackgroundCoordinator, getMimeType } from "./coordinator.ts";

describe("BackgroundCoordinator", () => {
  let coordinator: BackgroundCoordinator;

  beforeEach(() => {
    vi.clearAllMocks();
    coordinator = new BackgroundCoordinator();
  });

  afterEach(() => {
    coordinator.dispose();
    vi.useRealTimers();
  });

  describe("invokeTab", () => {
    it("delivers INVOKE_PICKER directly when tabs.sendMessage succeeds", async () => {
      vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);

      await coordinator.invokeTab(42, "markdown");

      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(42, {
        format: "markdown",
        type: "INVOKE_PICKER",
      });
      expect(browser.scripting.executeScript).not.toHaveBeenCalled();
    });

    it("injects content script and queues pending invoke when direct message fails", async () => {
      vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
        new Error("Receiving end does not exist")
      );
      (browser.scripting.executeScript as unknown as Mock).mockResolvedValue(
        []
      );

      await coordinator.invokeTab(101, "html");

      expect(browser.scripting.executeScript).toHaveBeenCalledTimes(1);
      expect(browser.scripting.executeScript).toHaveBeenCalledWith({
        files: ["content-scripts/content.js"],
        target: { tabId: 101 },
      });

      // Handshake: content ready flushes queued message
      vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);
      coordinator.handleContentReady(101);

      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(2);
      expect(browser.tabs.sendMessage).toHaveBeenLastCalledWith(101, {
        format: "html",
        type: "INVOKE_PICKER",
      });
    });

    it("deduplicates queued invokes by updating message and resetting timeout", async () => {
      vi.useFakeTimers();
      vi.mocked(browser.tabs.sendMessage).mockRejectedValue(
        new Error("Receiving end does not exist")
      );
      (browser.scripting.executeScript as unknown as Mock).mockResolvedValue(
        []
      );

      await coordinator.invokeTab(5, "markdown");
      vi.advanceTimersByTime(3000);

      // Second invoke before timeout replaces pending message
      await coordinator.invokeTab(5, "html");

      // Advance 3000ms more (total 6000ms from start, but 3000ms from second invoke)
      vi.advanceTimersByTime(3000);

      // Now content ready arrives and flushes the second message
      vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined);
      coordinator.handleContentReady(5);

      expect(browser.tabs.sendMessage).toHaveBeenLastCalledWith(5, {
        format: "html",
        type: "INVOKE_PICKER",
      });
    });

    it("drops pending invoke after timeout expires", async () => {
      vi.useFakeTimers();
      vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
        new Error("Receiving end does not exist")
      );
      (browser.scripting.executeScript as unknown as Mock).mockResolvedValue(
        []
      );

      await coordinator.invokeTab(88, "markdown");
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

      // Advance past 5s timeout
      vi.advanceTimersByTime(5000);

      // Content ready after timeout does not send anything
      coordinator.handleContentReady(88);
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("discards pending invoke when tab is closed", async () => {
      vi.mocked(browser.tabs.sendMessage).mockRejectedValueOnce(
        new Error("Receiving end does not exist")
      );
      (browser.scripting.executeScript as unknown as Mock).mockResolvedValue(
        []
      );

      await coordinator.invokeTab(77, "markdown");
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);

      coordinator.handleTabRemoved(77);

      coordinator.handleContentReady(77);
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1);
    });

    it("handles undefined tabId in handleContentReady gracefully", () => {
      expect(() => {
        coordinator.handleContentReady(undefined);
      }).not.toThrow();
    });
  });

  describe("download (Chromium data URL fallback)", () => {
    it("uses data URL when blob URL is unavailable", async () => {
      const customCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => false,
      });

      await customCoordinator.download("# Title\n\nContent", "export.md");

      expect(browser.downloads.download).toHaveBeenCalledTimes(1);
      expect(browser.downloads.download).toHaveBeenCalledWith({
        filename: "export.md",
        url: "data:text/markdown;charset=utf-8,%23%20Title%0A%0AContent",
      });

      customCoordinator.dispose();
    });

    it("encodes HTML mime type correctly for data URL", async () => {
      const customCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => false,
      });

      await customCoordinator.download("<h1>Hello</h1>", "export.html");

      expect(browser.downloads.download).toHaveBeenCalledWith({
        filename: "export.html",
        url: "data:text/html;charset=utf-8,%3Ch1%3EHello%3C%2Fh1%3E",
      });

      customCoordinator.dispose();
    });
  });

  describe("download (Firefox blob URL tracking)", () => {
    beforeEach(() => {
      vi.spyOn(URL, "createObjectURL").mockReturnValue(
        "blob:tamiz/mock-blob-uuid"
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {
        /* no-op for tests */
      });
    });

    it("creates blob URL and revokes on download complete", async () => {
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockResolvedValue(1234);

      await firefoxCoordinator.download("hello world", "test.txt");

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(browser.downloads.download).toHaveBeenCalledWith({
        filename: "test.txt",
        url: "blob:tamiz/mock-blob-uuid",
      });

      // State change to complete revokes blob URL
      firefoxCoordinator.handleDownloadChange({
        id: 1234,
        state: { current: "complete", previous: "in_progress" },
      } as Browser.downloads.DownloadDelta);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:tamiz/mock-blob-uuid"
      );

      firefoxCoordinator.dispose();
    });

    it("creates a blob URL with correct Blob type and size for Firefox downloads", async () => {
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockResolvedValue(42);

      const createSpy = vi.spyOn(URL, "createObjectURL");

      await firefoxCoordinator.download("file content", "article.md");

      expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
      const blob = createSpy.mock.calls[0][0] as Blob;
      expect(blob.type).toBe("text/markdown");
      expect(blob.size).toBe(12);

      firefoxCoordinator.dispose();
    });

    it("revokes blob URL on download interrupted", async () => {
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockResolvedValue(5678);

      await firefoxCoordinator.download("hello", "file.md");

      firefoxCoordinator.handleDownloadChange({
        id: 5678,
        state: { current: "interrupted", previous: "in_progress" },
      } as Browser.downloads.DownloadDelta);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:tamiz/mock-blob-uuid"
      );

      firefoxCoordinator.dispose();
    });

    it("does not revoke blob URL on non-terminal state change", async () => {
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockResolvedValue(9999);

      await firefoxCoordinator.download("hello", "file.md");

      firefoxCoordinator.handleDownloadChange({
        id: 9999,
        state: { current: "in_progress", previous: "in_progress" },
      } as Browser.downloads.DownloadDelta);

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      firefoxCoordinator.dispose();
    });

    it("revokes blob URL and rethrows if browser.downloads.download rejects", async () => {
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockRejectedValueOnce(
        new Error("Download rejected")
      );

      await expect(
        firefoxCoordinator.download("content", "error.md")
      ).rejects.toThrow("Download rejected");

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:tamiz/mock-blob-uuid"
      );

      firefoxCoordinator.dispose();
    });

    it("revokes blob URL via 30s fallback timeout if onChanged never fires", async () => {
      vi.useFakeTimers();
      const firefoxCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });
      vi.mocked(browser.downloads.download).mockResolvedValue(4321);

      await firefoxCoordinator.download("timed content", "timeout.md");

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      // Advance 30 seconds
      vi.advanceTimersByTime(30_000);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:tamiz/mock-blob-uuid"
      );

      firefoxCoordinator.dispose();
    });
  });

  describe("dispose", () => {
    it("clears all pending invoke timers and revokes all active blob URLs", async () => {
      vi.useFakeTimers();
      vi.spyOn(URL, "createObjectURL").mockReturnValue(
        "blob:tamiz/disposable-uuid"
      );
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {
        /* no-op for tests */
      });

      vi.mocked(browser.tabs.sendMessage).mockRejectedValue(
        new Error("Connection failed")
      );
      (browser.scripting.executeScript as unknown as Mock).mockResolvedValue(
        []
      );
      vi.mocked(browser.downloads.download).mockResolvedValue(777);

      const disposableCoordinator = new BackgroundCoordinator({
        isBlobUrlAvailable: () => true,
      });

      await disposableCoordinator.invokeTab(10);
      await disposableCoordinator.download("sample", "test.md");

      // Dispose should clean up everything
      disposableCoordinator.dispose();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(
        "blob:tamiz/disposable-uuid"
      );

      // Advancing timers should not cause any further effects or errors
      vi.advanceTimersByTime(60_000);

      // Content ready after dispose does not send
      disposableCoordinator.handleContentReady(10);
      expect(browser.tabs.sendMessage).toHaveBeenCalledTimes(1); // Only the initial failed attempt
    });
  });

  describe("getMimeType", () => {
    it("returns text/html for .html files", () => {
      expect(getMimeType("page.html")).toBe("text/html");
    });

    it("returns text/markdown for .md files", () => {
      expect(getMimeType("notes.md")).toBe("text/markdown");
    });

    it("returns text/plain for any other extension", () => {
      expect(getMimeType("data.csv")).toBe("text/plain");
    });
  });
});
