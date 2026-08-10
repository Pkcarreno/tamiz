import { convert } from "@tamiz/html-converter";
import { htmlStrategy } from "@tamiz/html-converter/strategies/html";
import { markdownStrategy } from "@tamiz/html-converter/strategies/markdown";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearHighlights,
  clearHoverHighlight,
  convertElement,
  highlight,
  hoverHighlight,
  injectHighlightStyles,
} from "./content-callbacks.ts";

vi.mock("@tamiz/html-converter", () => ({
  convert: vi.fn(),
}));

const MARKDOWN_FILENAME_REGEX = /^article-\d+\.md$/;
const HTML_FILENAME_REGEX = /^section-\d+\.html$/;

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("highlight", () => {
  it("adds the tamiz-highlight class to the given element", () => {
    const element = document.createElement("div");
    highlight(element);
    expect(element.classList.contains("tamiz-highlight")).toBe(true);
  });
});

describe("clearHighlights", () => {
  it("removes the tamiz-highlight class from all elements on the page", () => {
    const el1 = document.createElement("div");
    const el2 = document.createElement("p");
    document.body.append(el1, el2);

    highlight(el1);
    highlight(el2);
    expect(el1.classList.contains("tamiz-highlight")).toBe(true);
    expect(el2.classList.contains("tamiz-highlight")).toBe(true);

    clearHighlights();

    expect(el1.classList.contains("tamiz-highlight")).toBe(false);
    expect(el2.classList.contains("tamiz-highlight")).toBe(false);
  });

  it("is a no-op when no elements have the highlight class", () => {
    expect(() => clearHighlights()).not.toThrow();
  });
});

describe("convertElement", () => {
  it("extracts content from the element and converts with markdown strategy", async () => {
    vi.mocked(convert).mockResolvedValue("# Hello world");

    const element = document.createElement("article");
    element.innerHTML = "<p>Hello world</p>";

    const result = await convertElement(element, "markdown");

    expect(convert).toHaveBeenCalledWith(
      expect.stringContaining("Hello world"),
      { strategy: markdownStrategy }
    );
    expect(result.content).toBe("# Hello world");
  });

  it("uses html strategy when format is html", async () => {
    vi.mocked(convert).mockResolvedValue("<article>Hello</article>");

    const element = document.createElement("section");
    const result = await convertElement(element, "html");

    expect(convert).toHaveBeenCalledWith(expect.any(String), {
      strategy: htmlStrategy,
    });
    expect(result.content).toBe("<article>Hello</article>");
  });

  it("generates a filename with tag, timestamp, and .md extension for markdown", async () => {
    vi.mocked(convert).mockResolvedValue("content");

    const element = document.createElement("article");
    const result = await convertElement(element, "markdown");

    expect(result.filename).toMatch(MARKDOWN_FILENAME_REGEX);
  });

  it("generates a filename with .html extension for html format", async () => {
    vi.mocked(convert).mockResolvedValue("content");

    const element = document.createElement("section");
    const result = await convertElement(element, "html");

    expect(result.filename).toMatch(HTML_FILENAME_REGEX);
  });

  it("does not mutate the source element during extraction", async () => {
    vi.mocked(convert).mockResolvedValue("content");

    const element = document.createElement("div");
    element.innerHTML = "<p>test</p>";
    const originalHTML = element.outerHTML;

    await convertElement(element, "markdown");

    expect(element.outerHTML).toBe(originalHTML);
  });

  it("includes the correct strategy object (not just the name)", async () => {
    vi.mocked(convert).mockResolvedValue("converted");

    const element = document.createElement("p");
    await convertElement(element, "markdown");

    const [, options] = vi.mocked(convert).mock.calls[0] as [
      string,
      { strategy: unknown },
    ];
    expect(options.strategy).toBe(markdownStrategy);
  });
});

describe("hoverHighlight", () => {
  it("adds the tamiz-hover class to the given element", () => {
    const element = document.createElement("div");
    hoverHighlight(element);
    expect(element.classList.contains("tamiz-hover")).toBe(true);
  });
});

describe("clearHoverHighlight", () => {
  it("removes the tamiz-hover class from the given element", () => {
    const element = document.createElement("div");
    element.classList.add("tamiz-hover");
    clearHoverHighlight(element);
    expect(element.classList.contains("tamiz-hover")).toBe(false);
  });

  it("handles null element gracefully", () => {
    expect(() => clearHoverHighlight(null)).not.toThrow();
  });
});

describe("injectHighlightStyles", () => {
  it("injects a style element into the document head", () => {
    injectHighlightStyles();
    const style = document.getElementById("tamiz-highlight-styles");
    expect(style).not.toBeNull();
    expect(style?.tagName).toBe("STYLE");
  });

  it("does not duplicate the style element on repeated calls", () => {
    injectHighlightStyles();
    injectHighlightStyles();
    const styles = document.querySelectorAll("#tamiz-highlight-styles");
    expect(styles.length).toBe(1);
  });

  it("uses focus hex #00d4ff synced to --tz-focus design token", () => {
    injectHighlightStyles();
    const css =
      document.getElementById("tamiz-highlight-styles")?.textContent ?? "";
    expect(css).toContain("#00d4ff");
    expect(css).not.toContain("#3b82f6");
  });

  it("uses focus-bright hex #33dfff synced to --tz-focus-bright design token", () => {
    injectHighlightStyles();
    const css =
      document.getElementById("tamiz-highlight-styles")?.textContent ?? "";
    expect(css).toContain("#33dfff");
    expect(css).not.toContain("#93c5fd");
  });
});
