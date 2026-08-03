import { convert } from "@tamiz/html-converter";
import { markdownStrategy } from "@tamiz/html-converter/strategies/markdown";
import { rawStrategy } from "@tamiz/html-converter/strategies/raw";

import { extractContent } from "./extract-content.ts";

/** CSS class applied to highlighted elements in the page. */
export const HIGHLIGHT_CLASS = "tamiz-highlight";

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

/** Strategy objects keyed by format name. */
const STRATEGIES = {
  markdown: markdownStrategy,
  raw: rawStrategy,
} as const;

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
  const strategy = STRATEGIES[format];
  const content = await convert(html, { strategy });

  const tag = element.tagName.toLowerCase();
  const timestamp = Date.now();
  const extension = FORMAT_EXTENSION[format];
  const filename = `${tag}-${timestamp}.${extension}`;

  return { content, filename };
}
