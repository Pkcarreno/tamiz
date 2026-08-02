import {
  getContentNodes,
  getDomParser,
  NODE_TYPE,
  serializeContent,
} from "./dom.ts";
import type { DomParser } from "./types.ts";

/** Tags whose removal eliminates non-content regions entirely */
const UNWANTED_TAGS: ReadonlySet<string> = new Set([
  "aside",
  "audio",
  "embed",
  "figure",
  "figcaption",
  "footer",
  "form",
  "header",
  "iframe",
  "input",
  "link",
  "meta",
  "nav",
  "noscript",
  "object",
  "select",
  "source",
  "style",
  "script",
  "textarea",
  "video",
  "button",
]);

/** CSS class / ID fragments that signal ads, sidebars, or boilerplate */
const AD_SIDEBAR_PATTERNS: readonly RegExp[] = [
  /ad(s|vertisement)?/i,
  /banner/i,
  /comment/i,
  /promo/i,
  /related/i,
  /sidebar/i,
  /social/i,
  /supplemental/i,
];

/** Attributes that carry semantic meaning and survive cleaning */
const SEMANTIC_ATTRIBUTES: ReadonlySet<string> = new Set([
  "alt",
  "colspan",
  "href",
  "rowspan",
  "src",
  "title",
]);

/**
 * Check whether an element's class or ID marks it as an ad / sidebar /
 * other non-content region.
 */
function isAdOrSidebar(element: Element): boolean {
  const className = element.getAttribute("class") ?? "";
  const id = element.getAttribute("id") ?? "";
  const combined = `${className} ${id}`;

  return AD_SIDEBAR_PATTERNS.some((pattern) => pattern.test(combined));
}

/**
 * Remove a node from its parent, if it has one.
 */
function removeNode(node: Node): void {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

/**
 * Recursively remove elements whose tag is in {@link UNWANTED_TAGS} or
 * whose class / ID matches an ad or sidebar pattern.
 *
 * Structural tags (html, head, body) are traversed but not removed —
 * we need to reach content inside `<body>` even when the document
 * root is `<html>`.
 */
function removeUnwantedElements(root: Node): void {
  if (root.nodeType !== NODE_TYPE.ELEMENT) {
    for (const child of Array.from(root.childNodes)) {
      removeUnwantedElements(child);
    }
    return;
  }

  const element = root as Element;
  const tag = element.tagName.toLowerCase();

  if (UNWANTED_TAGS.has(tag)) {
    removeNode(element);
    return;
  }

  if (isAdOrSidebar(element)) {
    removeNode(element);
    return;
  }

  // Recurse into remaining children
  for (const child of Array.from(element.childNodes)) {
    removeUnwantedElements(child);
  }
}

/**
 * Compute a content-quality score for an element.
 *
 * The score rewards text-heavy, link-light content and applies
 * tag-based bonuses / penalties so that article-style containers
 * score higher than navigation menus.
 */
function scoreElement(element: Element): number {
  const text = element.textContent ?? "";
  const textLength = text.trim().length;

  if (textLength === 0) {
    return -1;
  }

  // Commas serve as a proxy for sentence count — readable prose has them
  const commas = (text.match(/,/g) ?? []).length;

  // Link-density penalty: link-heavy regions are typically navigation
  const links = element.querySelectorAll("a");
  let linkChars = 0;
  for (const link of links) {
    linkChars += (link.textContent ?? "").length;
  }
  const linkDensity = textLength > 0 ? linkChars / textLength : 0;

  let score = textLength / 100 + commas;
  score -= linkDensity * 3;

  const tag = element.tagName.toLowerCase();
  const bonuses: Record<string, number> = {
    article: 10,
    main: 10,
    p: 5,
    pre: 5,
    section: 5,
  };
  score += bonuses[tag] ?? 0;

  return score;
}

/**
 * Remove elements whose content-quality score falls below the
 * threshold. Operates in-place on the provided subtree.
 */
function filterByContentScore(root: Node): void {
  if (root.nodeType !== NODE_TYPE.ELEMENT) {
    for (const child of Array.from(root.childNodes)) {
      filterByContentScore(child);
    }
    return;
  }

  const element = root as Element;

  // Score descendant content candidates
  const candidates = Array.from(
    element.querySelectorAll("div, p, article, section, main, td, blockquote")
  );

  for (const candidate of candidates) {
    if (scoreElement(candidate) < 0) {
      removeNode(candidate);
    }
  }
}

/**
 * Recursively strip every attribute that is not in
 * {@link SEMANTIC_ATTRIBUTES} from the element and all its descendants.
 *
 * Special case: `class` attributes starting with `language-` on `<code>`
 * elements are preserved for Markdown code block language detection.
 *
 * Exported so the *raw* strategy can apply the same filtering even when
 * the cleaning pipeline was skipped.
 *
 * @public
 */
export function stripNonSemanticAttributes(root: Node): void {
  if (root.nodeType === NODE_TYPE.ELEMENT) {
    const element = root as Element;
    const attrs = Array.from(element.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();
      const isCodeWithLang =
        element.tagName.toLowerCase() === "code" &&
        name === "class" &&
        attr.value.startsWith("language-");
      if (!(SEMANTIC_ATTRIBUTES.has(name) || isCodeWithLang)) {
        element.removeAttribute(attr.name);
      }
    }
  }

  for (const child of Array.from(root.childNodes)) {
    stripNonSemanticAttributes(child);
  }
}

/**
 * Safely access `doc.body`.
 *
 * linkedom throws when accessing `body` (which delegates through
 * `head` → `documentElement.firstElementChild`) for empty or
 * malformed HTML. This wrapper returns `null` in those cases.
 */
function safeGetBody(doc: Document): Element | null {
  try {
    return doc.body;
  } catch {
    return null;
  }
}

/**
 * Readability-style content extraction.
 *
 * Removes non-content elements (scripts, styles, navs, ads, sidebars),
 * filters by content-density scoring, and strips non-semantic attributes
 * — leaving only elements that carry actual page content with their
 * semantic attributes intact.
 *
 * @public
 */
export function cleanHtml(html: string): string {
  const parser: DomParser = getDomParser();
  const doc = parser.parse(html);

  // Remove unwanted elements everywhere in the document
  removeUnwantedElements(doc);

  // Score remaining candidates and drop low-quality ones
  const body = safeGetBody(doc);
  if (body && body.children.length > 0) {
    filterByContentScore(body);
  }

  // Strip classes, data-*, event handlers, and other non-semantic attrs
  stripNonSemanticAttributes(doc);

  // Serialize — prefer body innerHTML for full documents,
  // fall back to serialising individual content nodes for fragments.
  // serializeContent skips the structural tags linkedom injects.
  if (body && body.children.length > 0) {
    return body.innerHTML;
  }

  const contentNodes = getContentNodes(doc);
  return contentNodes
    .map((node) => serializeContent(node))
    .filter((content) => content.trim())
    .join("");
}

// Re-export so consumers can import SEMANTIC_ATTRIBUTES from the cleaner
export { SEMANTIC_ATTRIBUTES };
