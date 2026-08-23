import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { type Accessor, createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@floating-ui/dom", () => ({
  autoUpdate: vi.fn(),
  computePosition: vi.fn(),
  flip: vi.fn(() => ({ name: "flip" })),
  offset: vi.fn(() => ({ name: "offset" })),
  shift: vi.fn(() => ({ name: "shift" })),
}));

import { autoUpdate, computePosition } from "@floating-ui/dom";

import { FloatingActionBar } from "./floating-bar.tsx";

const computePositionMock = vi.mocked(computePosition);
const autoUpdateMock = vi.mocked(autoUpdate);

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
  const [isExclusionMode] = createSignal(false);
  return {
    element: (() => el) as Accessor<Element | null>,
    format,
    isExclusionMode,
    onAction: vi.fn(),
    ...overrides,
  };
}

/** Stable accessor for isExclusionMode in inline JSX usage. */
const falseAccessor = () => false;

describe("FloatingActionBar", () => {
  beforeEach(() => {
    computePositionMock.mockResolvedValue({
      middlewareData: {},
      placement: "right-start",
      strategy: "fixed",
      x: 0,
      y: 0,
    });
    autoUpdateMock.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    computePositionMock.mockReset();
    autoUpdateMock.mockReset();
    cleanup();
  });

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

  describe("positioning via @floating-ui/dom", () => {
    it("calls computePosition with reference, floating element, and options", async () => {
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
          isExclusionMode={falseAccessor}
          onAction={vi.fn()}
        />
      ));

      const bar = screen
        .getByRole("button", { name: "Copy" })
        .closest("[data-tamiz-bar]") as HTMLElement;

      await vi.waitFor(() => {
        expect(computePositionMock).toHaveBeenCalledWith(
          element,
          bar,
          expect.objectContaining({
            placement: "right-start",
            strategy: "fixed",
          })
        );
      });
    });

    it("invokes autoUpdate with ancestorScroll for Shadow DOM support", async () => {
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
          isExclusionMode={falseAccessor}
          onAction={vi.fn()}
        />
      ));

      await vi.waitFor(() => {
        expect(autoUpdateMock).toHaveBeenCalledWith(
          element,
          expect.any(HTMLElement),
          expect.any(Function),
          { ancestorScroll: true }
        );
      });
    });

    it("repositions when element prop changes", async () => {
      const elementA = makeElement({
        height: 50,
        left: 100,
        top: 200,
        width: 200,
      });
      const elementB = makeElement({
        height: 50,
        left: 600,
        top: 500,
        width: 200,
      });
      const [element, setElement] = createSignal<Element | null>(elementA);
      const [format] = createSignal<"markdown" | "html">("markdown");

      render(() => (
        <FloatingActionBar
          element={element}
          format={format}
          isExclusionMode={falseAccessor}
          onAction={vi.fn()}
        />
      ));

      await vi.waitFor(() => {
        expect(computePositionMock).toHaveBeenCalledWith(
          elementA,
          expect.any(HTMLElement),
          expect.objectContaining({
            placement: "right-start",
            strategy: "fixed",
          })
        );
      });

      setElement(elementB);

      await vi.waitFor(() => {
        expect(computePositionMock).toHaveBeenCalledWith(
          elementB,
          expect.any(HTMLElement),
          expect.objectContaining({
            placement: "right-start",
            strategy: "fixed",
          })
        );
      });
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
