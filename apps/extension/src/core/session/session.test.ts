import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Message } from "../../lib/messaging/types.ts";
import type { HighlightController } from "../highlight.ts";
import type { ScrimController } from "../scrim.ts";
import { createPickerSession } from "./session.ts";
import type { HtmlConverterAdapter, PickerSessionDeps } from "./types.ts";

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element #${id} not found`);
  }
  return el;
}

describe("PickerSession", () => {
  let mockHighlight: HighlightController;
  let mockScrim: ScrimController;
  let mockConverter: HtmlConverterAdapter;
  let mockSendMessage: (msg: Message) => Promise<void>;
  let mockShowToast: (msg: string) => void;
  let mockWriteClipboard: (text: string) => Promise<void>;
  let deps: PickerSessionDeps;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root">
        <article id="article">
          <h1 id="title">Article Title</h1>
          <p id="paragraph">Some text <span id="ad" class="advertisement">Buy now</span></p>
        </article>
      </div>
    `;

    mockHighlight = {
      clearAll: vi.fn(),
      highlightElement: vi.fn(),
      selectElement: vi.fn(),
      setHoverTarget: vi.fn(),
    };

    mockScrim = {
      dispose: vi.fn(),
      hide: vi.fn(),
      show: vi.fn(),
    };

    mockConverter = {
      convert: vi.fn().mockResolvedValue("# Article\n\nSome text"),
      extractContent: vi.fn((el: Element) => el.cloneNode(true) as Element),
    };

    mockSendMessage = vi.fn().mockResolvedValue(undefined);
    mockShowToast = vi.fn();
    mockWriteClipboard = vi.fn().mockResolvedValue(undefined);

    deps = {
      clipboardAvailable: () => true,
      documentRef: document,
      highlight: mockHighlight,
      htmlConverter: mockConverter,
      scrim: mockScrim,
      sendMessage: mockSendMessage,
      showToast: mockShowToast,
      writeClipboard: mockWriteClipboard,
    };
  });

  it("initializes with default IDLE snapshot", () => {
    const session = createPickerSession(deps);
    const snapshot = session.getSnapshot();

    expect(snapshot.state).toBe("IDLE");
    expect(snapshot.selectedElement).toBeNull();
    expect(snapshot.format).toBe("markdown");
    expect(snapshot.isExclusionMode).toBe(false);
    expect(snapshot.excludedElements.size).toBe(0);
  });

  describe("Lifecycle and transitions", () => {
    it("transitions from IDLE to HIGHLIGHTING on INVOKE", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ format: "html", type: "INVOKE" });

      const snapshot = session.getSnapshot();
      expect(snapshot.state).toBe("HIGHLIGHTING");
      expect(snapshot.format).toBe("html");
      expect(mockHighlight.clearAll).toHaveBeenCalled();
      expect(mockScrim.show).toHaveBeenCalled();
    });

    it("updates hover target during HIGHLIGHTING", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "HOVER" });

      expect(mockHighlight.setHoverTarget).toHaveBeenCalledWith(target);
    });

    it("ignores HOVER when not in HIGHLIGHTING state", async () => {
      const session = createPickerSession(deps);
      const target = requireElement("article");
      await session.dispatch({ target, type: "HOVER" });

      expect(mockHighlight.setHoverTarget).not.toHaveBeenCalled();
    });

    it("transitions to SELECTED on SELECT during HIGHLIGHTING", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "SELECT" });

      const snapshot = session.getSnapshot();
      expect(snapshot.state).toBe("SELECTED");
      expect(snapshot.selectedElement).toBe(target);
      expect(mockHighlight.selectElement).toHaveBeenCalledWith(target);
    });

    it("transitions to IDLE on DISMISS and cleans up visual effects", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "SELECT" });
      await session.dispatch({ type: "DISMISS" });

      const snapshot = session.getSnapshot();
      expect(snapshot.state).toBe("IDLE");
      expect(snapshot.selectedElement).toBeNull();
      expect(mockHighlight.clearAll).toHaveBeenCalled();
      expect(mockScrim.hide).toHaveBeenCalled();
    });

    it("resets to HIGHLIGHTING on RESTART", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "SELECT" });
      await session.dispatch({ type: "RESTART" });

      const snapshot = session.getSnapshot();
      expect(snapshot.state).toBe("HIGHLIGHTING");
      expect(snapshot.selectedElement).toBeNull();
      expect(mockHighlight.clearAll).toHaveBeenCalled();
      expect(mockScrim.show).toHaveBeenCalled();
    });

    it("ignores RESTART while in exclusion mode", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "SELECT" });
      await session.dispatch({ type: "EXCLUDE_TOGGLE" });

      await session.dispatch({ type: "RESTART" });
      expect(session.getSnapshot().state).toBe("SELECTED");
    });
  });

  describe("Exclusion mode and element toggling", () => {
    it("toggles exclusion mode on EXCLUDE_TOGGLE when SELECTED", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const target = requireElement("article");
      await session.dispatch({ target, type: "SELECT" });

      await session.dispatch({ type: "EXCLUDE_TOGGLE" });
      expect(session.getSnapshot().isExclusionMode).toBe(true);

      await session.dispatch({ type: "EXCLUDE_TOGGLE" });
      expect(session.getSnapshot().isExclusionMode).toBe(false);
    });

    it("excludes a child element and exits exclusion mode", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      const ad = requireElement("ad");

      await session.dispatch({ target: article, type: "SELECT" });
      await session.dispatch({ type: "EXCLUDE_TOGGLE" });

      await session.dispatch({ target: ad, type: "TOGGLE_EXCLUSION_ELEMENT" });

      const snapshot = session.getSnapshot();
      expect(snapshot.isExclusionMode).toBe(false);
      expect(snapshot.excludedElements.has(ad)).toBe(true);
      expect(ad.classList.contains("tamiz-excluded")).toBe(true);
    });

    it("un-excludes an already excluded element when toggled again", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      const ad = requireElement("ad");

      await session.dispatch({ target: article, type: "SELECT" });
      await session.dispatch({ type: "EXCLUDE_TOGGLE" });
      await session.dispatch({ target: ad, type: "TOGGLE_EXCLUSION_ELEMENT" });

      // Toggle again
      await session.dispatch({ type: "EXCLUDE_TOGGLE" });
      await session.dispatch({ target: ad, type: "TOGGLE_EXCLUSION_ELEMENT" });

      const snapshot = session.getSnapshot();
      expect(snapshot.excludedElements.has(ad)).toBe(false);
      expect(ad.classList.contains("tamiz-excluded")).toBe(false);
    });

    it("does not exclude the selected element itself", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      await session.dispatch({ target: article, type: "SELECT" });
      await session.dispatch({ type: "EXCLUDE_TOGGLE" });

      await session.dispatch({
        target: article,
        type: "TOGGLE_EXCLUSION_ELEMENT",
      });

      expect(session.getSnapshot().excludedElements.size).toBe(0);
      expect(session.getSnapshot().isExclusionMode).toBe(true);
    });
  });

  describe("Format change", () => {
    it("updates format on FORMAT_CHANGE", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ format: "html", type: "FORMAT_CHANGE" });

      expect(session.getSnapshot().format).toBe("html");
    });
  });

  describe("Action execution: COPY and DOWNLOAD", () => {
    it("copies converted content to clipboard and dismisses", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      await session.dispatch({ target: article, type: "SELECT" });

      await session.dispatch({ type: "COPY" });

      expect(mockConverter.extractContent).toHaveBeenCalledWith(
        article,
        expect.any(Set)
      );
      expect(mockConverter.convert).toHaveBeenCalledWith(expect.anything(), {
        format: "markdown",
      });
      expect(mockWriteClipboard).toHaveBeenCalledWith("# Article\n\nSome text");
      expect(mockShowToast).toHaveBeenCalledWith("Copied to clipboard");
      expect(session.getSnapshot().state).toBe("IDLE");
    });

    it("falls back to sendMessage when clipboard write is unavailable", async () => {
      deps.clipboardAvailable = () => false;
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      await session.dispatch({ target: article, type: "SELECT" });

      await session.dispatch({ type: "COPY" });

      expect(mockSendMessage).toHaveBeenCalledWith({
        content: "# Article\n\nSome text",
        type: "COPY_TO_CLIPBOARD",
      });
      expect(mockShowToast).toHaveBeenCalledWith("Copied to clipboard");
      expect(session.getSnapshot().state).toBe("IDLE");
    });

    it("shows error toast when COPY fails", async () => {
      mockConverter.convert = vi
        .fn()
        .mockRejectedValue(new Error("Conversion boom"));
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      await session.dispatch({ target: article, type: "SELECT" });

      await session.dispatch({ type: "COPY" });

      expect(mockShowToast).toHaveBeenCalledWith("Copy failed");
      expect(session.getSnapshot().state).toBe("SELECTED");
    });

    it("downloads converted file and dismisses", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      const article = requireElement("article");
      await session.dispatch({ target: article, type: "SELECT" });

      await session.dispatch({ type: "DOWNLOAD" });

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "# Article\n\nSome text",
          type: "DOWNLOAD_FILE",
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith("Element downloaded");
      expect(session.getSnapshot().state).toBe("IDLE");
    });

    it("opens options and dismisses", async () => {
      const session = createPickerSession(deps);
      await session.dispatch({ type: "INVOKE" });

      await session.dispatch({ type: "OPEN_OPTIONS" });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "OPEN_OPTIONS",
      });
      expect(session.getSnapshot().state).toBe("IDLE");
    });
  });

  describe("Subscriptions", () => {
    it("notifies subscribers on snapshot changes", async () => {
      const session = createPickerSession(deps);
      const listener = vi.fn();
      const unsubscribe = session.subscribe(listener);

      await session.dispatch({ type: "INVOKE" });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ state: "HIGHLIGHTING" })
      );

      unsubscribe();
      await session.dispatch({ type: "DISMISS" });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
