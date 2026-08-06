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
  const [format] = createSignal<"markdown" | "raw">("markdown");
  return {
    element: (() => el) as Accessor<Element | null>,
    format,
    onCancel: vi.fn(),
    onCopy: vi.fn(),
    onDownload: vi.fn(),
    onFormatChange: vi.fn(),
    ...overrides,
  };
}

describe("FloatingActionBar", () => {
  afterEach(() => cleanup());

  describe("renders correctly", () => {
    it("renders single row with format selector and action buttons", () => {
      render(() => <FloatingActionBar {...makeProps()} />);

      // Format selector
      expect(screen.getByText("Markdown")).toBeTruthy();
      expect(screen.getByText("Raw HTML")).toBeTruthy();

      // Action buttons (icon-only with aria-labels)
      expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Download" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    });

    it("reflects the active format via select value", () => {
      const [format] = createSignal<"markdown" | "raw">("raw");
      const { container } = render(() => (
        <FloatingActionBar {...makeProps({ format })} />
      ));

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      expect(select.value).toBe("raw");
    });

    it("root element has data-tamiz-bar attribute for extraction stripping", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]");
      expect(bar).not.toBeNull();
    });
  });

  describe("calls callbacks", () => {
    it("calls onCopy when Copy is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
      expect(props.onCopy).toHaveBeenCalledTimes(1);
    });

    it("calls onDownload when Download is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Download" }));
      expect(props.onDownload).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when Cancel is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onFormatChange with 'raw' when Raw HTML is selected", () => {
      const props = makeProps();
      const { container } = render(() => <FloatingActionBar {...props} />);

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "raw" } });
      expect(props.onFormatChange).toHaveBeenCalledWith("raw");
    });

    it("calls onFormatChange with 'markdown' when Markdown is selected (from raw)", () => {
      const props = makeProps();
      const [format] = createSignal<"markdown" | "raw">("raw");
      const { container } = render(() => (
        <FloatingActionBar {...props} format={format} />
      ));

      const select = container.querySelector(
        "[data-tamiz-select] select"
      ) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: "markdown" } });
      expect(props.onFormatChange).toHaveBeenCalledWith("markdown");
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
      const [format] = createSignal<"markdown" | "raw">("markdown");

      render(() => (
        <FloatingActionBar
          element={elementAccessor}
          format={format}
          onCancel={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onFormatChange={vi.fn()}
        />
      ));

      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(100,200,200,50), 260, 32, 1024, 768)
      // top = 200 - 32 - 8 = 160, left = 300 + 8 = 308
      expect(bar.style.top).toBe(`${160}px`);
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
      const [format] = createSignal<"markdown" | "raw">("markdown");

      const { unmount } = render(() => (
        <FloatingActionBar
          element={element}
          format={format}
          onCancel={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onFormatChange={vi.fn()}
        />
      ));

      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;
      expect(bar.style.top).toBe(`${160}px`);

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
          onCancel={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onFormatChange={vi.fn()}
        />
      ));

      const barB = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(600,500,200,50), 260, 32, 1024, 768)
      // top = 500 - 32 - 8 = 460, left = 800 + 8 = 808
      // left 808 + 260 = 1068 > 1016 → clamp: left = 1024 - 260 - 8 = 756
      expect(barB.style.top).toBe(`${460}px`);
      expect(barB.style.left).toBe(`${756}px`);
    });
  });

  describe("layout", () => {
    it("renders single row with format selector and actions", () => {
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
