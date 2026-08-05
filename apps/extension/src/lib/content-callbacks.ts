import { extractContent } from "./extract-content.ts";

/** CSS class applied to highlighted elements in the page. */
export const HIGHLIGHT_CLASS = "tamiz-highlight";

/** CSS class applied to hovered elements during HIGHLIGHTING state. */
export const HOVER_CLASS = "tamiz-hover";

/**
 * Highlight an element by applying the tamiz highlight class.
 *
 * @public
 */
export function highlight(element: Element): void {
  element.classList.add(HIGHLIGHT_CLASS);
}

/**
 * Remove the tamiz highlight class from every element in the document.
 *
 * @public
 */
export function clearHighlights(): void {
  for (const el of document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)) {
    el.classList.remove(HIGHLIGHT_CLASS);
  }
}

/**
 * Apply a hover preview style to an element.
 *
 * @public
 */
export function hoverHighlight(element: Element): void {
  element.classList.add(HOVER_CLASS);
}

/**
 * Remove the hover preview style from an element.
 *
 * @public
 */
export function clearHoverHighlight(element: Element | null): void {
  if (element) {
    element.classList.remove(HOVER_CLASS);
  }
}

/**
 * Inject highlight and hover CSS into the main document.
 *
 * Shadow DOM styles don't reach the host document, so we need to inject
 * the highlight classes directly into the page's `<head>`.
 *
 * @public
 */
export function injectHighlightStyles(): void {
  if (document.getElementById("tamiz-highlight-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "tamiz-highlight-styles";
  // Hex values are hardcoded because these styles are injected into the host
  // page (not Shadow DOM), so CSS variables are unavailable. They are kept in
  // sync with design tokens defined in content.css :root:
  //   #00d4ff            — --tz-focus
  //   rgba(0,212,255,.15) — --tz-focus-dim
  //   #33dfff            — --tz-focus-bright
  style.textContent = `
    .tamiz-highlight {
      outline: 2px solid #00d4ff !important;
      outline-offset: 2px !important;
      background-color: rgba(0, 212, 255, 0.15) !important;
    }
    .tamiz-hover {
      outline: 2px dashed #33dfff !important;
      outline-offset: 1px !important;
      background-color: rgba(51, 223, 255, 0.08) !important;
    }
  `;
  document.head.appendChild(style);
}

/** File extension (including the dot) used for each output format. */
const FORMAT_EXTENSION: Record<"markdown" | "raw", string> = {
  markdown: "md",
  raw: "html",
};

/** Result of {@link convertElement} — the converted content and a filename. */
export interface ConvertedContent {
  /** The converted text (markdown or clean HTML). */
  content: string;
  /** Auto-generated filename including the format-appropriate extension. */
  filename: string;
}

/**
 * Extract, convert, and package a selected element into content ready for
 * clipboard copy or file download.
 *
 * The converter package is loaded dynamically to avoid bundling
 * `import.meta.require("linkedom")` into the content script IIFE bundle.
 *
 * @param element - The selected DOM element.
 * @param format  - Target output format.
 * @returns The converted content and a generated filename.
 *
 * @public
 */
export async function convertElement(
  element: Element,
  format: "markdown" | "raw"
): Promise<ConvertedContent> {
  const html = extractContent(element);

  const [{ convert }, { markdownStrategy }, { rawStrategy }] =
    await Promise.all([
      import("@tamiz/html-converter"),
      import("@tamiz/html-converter/strategies/markdown"),
      import("@tamiz/html-converter/strategies/raw"),
    ]);

  const strategy = format === "markdown" ? markdownStrategy : rawStrategy;
  const content = await convert(html, { strategy });

  const tag = element.tagName.toLowerCase();
  const timestamp = Date.now();
  const extension = FORMAT_EXTENSION[format];
  const filename = `${tag}-${timestamp}.${extension}`;

  return { content, filename };
}
