import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { type Accessor, createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FloatingActionBar } from "./floating-bar.tsx";

/** Create a detached element whose getBoundingClientRect returns a known rect. */
function makeElement(rect: {
  top: number;
  left: number;
  width: number;
  height: number;
}): Element {
  const el = document.createElement("div");
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(rect.left, rect.top, rect.width, rect.height),
  });
  return el;
}

/** Shared props with sensible defaults for every test. */
function makeProps(overrides: Record<string, unknown> = {}) {
  const el = makeElement({ height: 50, left: 100, top: 200, width: 200 });
  const [format] = createSignal<"markdown" | "html">("markdown");
  return {
    element: (() => el) as Accessor<Element | null>,
    format,
    onAction: vi.fn(),
    ...overrides,
  };
}

describe("FloatingActionBar", () => {
  afterEach(() => cleanup());

  describe("renders correctly", () => {
    it("renders format selector and action buttons", () => {
      render(() => <FloatingActionBar {...makeProps()} />);

      // Format selector
      expect(screen.getByText("Markdown")).toBeTruthy();
      expect(screen.getByText("HTML")).toBeTruthy();

      // Action buttons (icon-only with aria-labels)
      expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    });

    it("reflects the active format via select value", () => {
      const [format] = createSignal<"markdown" | "html">("html");
      const { container } = render(() => (
        <FloatingActionBar {...makeProps({ format })} />
      ));

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      expect(select.value).toBe("html");
    });

    it("root element has data-tamiz-bar attribute for extraction stripping", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]");
      expect(bar).not.toBeNull();
    });
  });

  describe("restart button", () => {
    it("renders RotateCcw restart button between Download and Cancel", () => {
      render(() => <FloatingActionBar {...makeProps()} />);

      const restartBtn = screen.getByRole("button", {
        name: "Restart selection",
      });
      expect(restartBtn).toBeTruthy();

      // Verify button order: Copy, Download, Restart, Cancel
      const buttons = screen.getAllByRole("button");
      const ariaLabels = buttons.map((b) => b.getAttribute("aria-label"));
      const downloadIdx = ariaLabels.indexOf("Download");
      const restartIdx = ariaLabels.indexOf("Restart selection");
      const cancelIdx = ariaLabels.indexOf("Cancel");
      expect(downloadIdx).toBeLessThan(restartIdx);
      expect(restartIdx).toBeLessThan(cancelIdx);
    });

    it("dispatches RESTART when Restart is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(
        screen.getByRole("button", { name: "Restart selection" })
      );
      expect(props.onAction).toHaveBeenCalledWith({ type: "RESTART" });
    });
  });

  describe("dispatches actions", () => {
    it("dispatches COPY when Copy is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      expect(props.onAction).toHaveBeenCalledWith({ type: "COPY" });
    });

    it("dispatches DOWNLOAD when Download is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Download" }));
      expect(props.onAction).toHaveBeenCalledWith({ type: "DOWNLOAD" });
    });

    it("dispatches DISMISS when Cancel is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(props.onAction).toHaveBeenCalledWith({ type: "DISMISS" });
    });

    it("dispatches FORMAT_CHANGE with 'html' when HTML is selected", () => {
      const props = makeProps();
      const { container } = render(() => <FloatingActionBar {...props} />);

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "html" } });
      expect(props.onAction).toHaveBeenCalledWith({
        format: "html",
        type: "FORMAT_CHANGE",
      });
    });

    it("dispatches FORMAT_CHANGE with 'markdown' when Markdown is selected (from html)", () => {
      const [format] = createSignal<"markdown" | "html">("html");
      const props = makeProps({ format });
      const { container } = render(() => <FloatingActionBar {...props} />);

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "markdown" } });
      expect(props.onAction).toHaveBeenCalledWith({
        format: "markdown",
        type: "FORMAT_CHANGE",
      });
    });
  });

  describe("positioning via computeBarPosition", () => {
    it("positions the bar relative to the element's bounding rect", () => {
      const element = makeElement({
        height: 50,
        left: 100,
        top: 200,
        width: 200,
      });
      const [elementAccessor] = createSignal<Element | null>(element);
      const [format] = createSignal<"markdown" | "html">("markdown");

      render(() => (
        <FloatingActionBar
          element={elementAccessor}
          format={format}
          onAction={vi.fn()}
        />
      ));

      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(100,200,200,50), 200, 64, 1024, 768)
      // top = 200 - 64 - 8 = 128, left = 300 + 8 = 308
      expect(bar.style.top).toBe(`${128}px`);
      expect(bar.style.left).toBe(`${308}px`);
    });

    it("repositions when element prop changes", () => {
      const elementA = makeElement({
        height: 50,
        left: 100,
        top: 200,
        width: 200,
      });
      const [element, setElement] = createSignal<Element | null>(elementA);
      const [format] = createSignal<"markdown" | "html">("markdown");

      const { unmount } = render(() => (
        <FloatingActionBar
          element={element}
          format={format}
          onAction={vi.fn()}
        />
      ));

      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;
      expect(bar.style.top).toBe(`${128}px`);

      unmount();

      const elementB = makeElement({
        height: 50,
        left: 600,
        top: 500,
        width: 200,
      });
      setElement(elementB);
      render(() => (
        <FloatingActionBar
          element={element}
          format={format}
          onAction={vi.fn()}
        />
      ));

      const barB = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(600,500,200,50), 200, 64, 1024, 768)
      // top = 500 - 64 - 8 = 428, left = 800 + 8 = 808
      // left 808 + 200 = 1008 < 1016 → no clamp
      expect(barB.style.top).toBe(`${428}px`);
      expect(barB.style.left).toBe(`${808}px`);
    });
  });

  describe("layout", () => {
    it("renders format selector and actions", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      // Single row — no nested row divs
      expect(bar.children.length).toBeGreaterThanOrEqual(1);
      // Format selector present
      expect(bar.textContent).toContain("Markdown");
      // Actions present via aria-labels
      expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    });
  });
});
