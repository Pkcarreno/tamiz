import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
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
  return {
    element: makeElement({ height: 50, left: 100, top: 200, width: 200 }),
    format: "markdown" as const,
    onCancel: vi.fn(),
    onCopy: vi.fn(),
    onDownload: vi.fn(),
    onFormatChange: vi.fn(),
    onIgnore: vi.fn(),
    ...overrides,
  };
}

describe("FloatingActionBar", () => {
  afterEach(() => cleanup());

  describe("renders correctly", () => {
    it("renders two rows with format selector and action buttons", () => {
      render(() => <FloatingActionBar {...makeProps()} />);

      // Row 1: Select + Preview
      expect(screen.getByText("Markdown")).toBeTruthy();
      expect(screen.getByText("Raw HTML")).toBeTruthy();
      expect(screen.getByText("Preview")).toBeTruthy();

      // Row 2: Ignore + Copy + Download + Cancel
      expect(screen.getByText("Copy")).toBeTruthy();
      expect(screen.getByText("Download")).toBeTruthy();
      expect(screen.getByText("Cancel")).toBeTruthy();
    });

    it("marks the active format option based on the format prop", () => {
      render(() => <FloatingActionBar {...makeProps({ format: "raw" })} />);

      const rawBtn = screen.getByText("Raw HTML") as HTMLButtonElement;
      const mdBtn = screen.getByText("Markdown") as HTMLButtonElement;
      expect(rawBtn.classList.contains("tz-select-option--active")).toBe(true);
      expect(mdBtn.classList.contains("tz-select-option--active")).toBe(false);
    });

    it("Preview button is disabled", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const previewBtn = screen.getByText("Preview") as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
    });

    it("Ignore button is disabled", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const ignoreBtn = screen.getByRole("button", {
        name: "Ignore",
      }) as HTMLButtonElement;
      expect(ignoreBtn.disabled).toBe(true);
    });

    it("root element has data-tamiz-bar attribute for extraction stripping", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const bar = screen.getByText("Copy").closest("[data-tamiz-bar]");
      expect(bar).not.toBeNull();
    });
  });

  describe("calls callbacks", () => {
    it("calls onCopy when Copy is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByText("Copy") as HTMLButtonElement);
      expect(props.onCopy).toHaveBeenCalledTimes(1);
    });

    it("calls onDownload when Download is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByText("Download") as HTMLButtonElement);
      expect(props.onDownload).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when Cancel is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByText("Cancel") as HTMLButtonElement);
      expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onFormatChange with 'raw' when Raw HTML option is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByText("Raw HTML") as HTMLButtonElement);
      expect(props.onFormatChange).toHaveBeenCalledWith("raw");
    });

    it("calls onFormatChange with 'markdown' when Markdown option is clicked (from raw)", () => {
      const props = makeProps({ format: "raw" });
      render(() => <FloatingActionBar {...props} />);
      fireEvent.click(screen.getByText("Markdown") as HTMLButtonElement);
      expect(props.onFormatChange).toHaveBeenCalledWith("markdown");
    });

    it("does not call onIgnore when disabled Ignore button is clicked", () => {
      const props = makeProps();
      render(() => <FloatingActionBar {...props} />);
      const ignoreBtn = screen.getByRole("button", { name: "Ignore" });
      fireEvent.click(ignoreBtn);
      expect(props.onIgnore).not.toHaveBeenCalled();
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

      render(() => (
        <FloatingActionBar
          element={element}
          format="markdown"
          onCancel={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onFormatChange={vi.fn()}
          onIgnore={vi.fn()}
        />
      ));

      const bar = screen
        .getByText("Copy")
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(100,200,200,50), 280, 100, 1024, 768)
      // top = 200 - 100 - 8 = 92, left = 300 + 8 = 308
      expect(bar.style.top).toBe(`${92}px`);
      expect(bar.style.left).toBe(`${308}px`);
    });

    it("repositions when element prop changes", () => {
      const elementA = makeElement({
        height: 50,
        left: 100,
        top: 200,
        width: 200,
      });
      const props = makeProps({ element: elementA });

      const { unmount } = render(() => <FloatingActionBar {...props} />);

      const bar = screen
        .getByText("Copy")
        .closest("[data-tamiz-bar]") as HTMLElement;
      expect(bar.style.top).toBe(`${92}px`);

      unmount();

      const elementB = makeElement({
        height: 50,
        left: 600,
        top: 500,
        width: 200,
      });
      render(() => (
        <FloatingActionBar
          element={elementB}
          format="markdown"
          onCancel={vi.fn()}
          onCopy={vi.fn()}
          onDownload={vi.fn()}
          onFormatChange={vi.fn()}
          onIgnore={vi.fn()}
        />
      ));

      const barB = screen
        .getByText("Copy")
        .closest("[data-tamiz-bar]") as HTMLElement;

      // computeBarPosition(DOMRect(600,500,200,50), 280, 100, 1024, 768)
      // top = 500 - 100 - 8 = 392, left = 800 + 8 = 808
      // left 808 + 280 = 1088 > 1016 → clamp: left = 1024 - 280 - 8 = 736
      expect(barB.style.top).toBe(`${392}px`);
      expect(barB.style.left).toBe(`${736}px`);
    });
  });

  describe("formats layout", () => {
    it("renders row 1 with format selector before preview button", () => {
      render(() => <FloatingActionBar {...makeProps()} />);
      const rows = screen
        .getByText("Copy")
        .closest("[data-tamiz-bar]")
        ?.querySelectorAll(".tz-floating-bar__row");

      expect(rows?.length).toBe(2);
      // Row 1 should contain the Select (format options)
      expect(rows?.[0].textContent).toContain("Markdown");
      expect(rows?.[0].textContent).toContain("Preview");
      // Row 2 should contain Copy/Download/Cancel
      expect(rows?.[1].textContent).toContain("Copy");
      expect(rows?.[1].textContent).toContain("Download");
      expect(rows?.[1].textContent).toContain("Cancel");
    });
  });
});
