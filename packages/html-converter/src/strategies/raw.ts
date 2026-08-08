import { SEMANTIC_ATTRIBUTES, stripNonSemanticAttributes } from "../cleaner.ts";
import {
  getContentNodes,
  isStructuralElement,
  NODE_TYPE,
  stripInvisibleChars,
} from "../dom.ts";
import type { ConversionStrategy } from "../types.ts";

/**
 * Void HTML elements that never have a closing tag.
 */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Escape attribute values for safe HTML output */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Pretty-print a DOM `Node` tree as indented HTML with a two-space
 * step per nesting level.
 *
 * Only semantic attributes survive — the caller is expected to have
 * already stripped non-semantic attributes via
 * {@link stripNonSemanticAttributes}.
 */
function formatNode(node: Node, depth: number): string {
  const indent = "  ".repeat(depth);

  if (node.nodeType === NODE_TYPE.TEXT) {
    const text = stripInvisibleChars(node.textContent ?? "").trim();
    return text ? `${indent}${text}\n` : "";
  }

  if (node.nodeType !== NODE_TYPE.ELEMENT) {
    return "";
  }

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const isVoid = VOID_ELEMENTS.has(tag);

  // Build opening tag with semantic attributes only
  const attrs: string[] = [];
  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase();
    if (SEMANTIC_ATTRIBUTES.has(name)) {
      attrs.push(`${name}="${escapeAttribute(attr.value)}"`);
    }
  }

  const openTag = `<${tag}${attrs.length > 0 ? ` ${attrs.join(" ")}` : ""}`;

  if (isVoid) {
    return `${indent}${openTag} />\n`;
  }

  // Walk ALL childNodes in document order — text nodes and elements
  // interleaved, skipping structural tags that linkedom injects
  const children = Array.from(node.childNodes).filter(
    (child) => !isStructuralElement(child)
  );

  if (children.length === 0) {
    const text = (element.textContent ?? "").trim();
    return text
      ? `${indent}${openTag}>${text}</${tag}>\n`
      : `${indent}${openTag}></${tag}>\n`;
  }

  const lines: string[] = [`${indent}${openTag}>`];
  for (const child of children) {
    const formatted = formatNode(child, depth + 1).trimEnd();
    if (formatted) {
      lines.push(formatted);
    }
  }
  lines.push(`${indent}</${tag}>`);

  return `${lines.join("\n")}\n`;
}

/**
 * Convert an HTML fragment to a pretty-printed string with
 * only semantic attributes retained.
 */
function toPrettyHtml(content: Element | Document): string {
  const nodes = getContentNodes(content);

  const lines: string[] = [];
  for (const node of nodes) {
    const formatted = formatNode(node, 0).trimEnd();
    if (formatted) {
      lines.push(formatted);
    }
  }

  return lines.join("\n");
}

/**
 * Raw HTML output strategy.
 *
 * Returns the cleaned DOM tree serialised to HTML with only semantic
 * attributes (href, src, alt, title, colspan, rowspan) retained.
 * Output is pretty-printed with a two-space indent.
 *
 * @public
 */
export const rawStrategy: ConversionStrategy = {
  convert(content: Element | Document): string {
    // Always strip non-semantic attributes, even when the cleaner
    // was not run (clean: false)
    stripNonSemanticAttributes(content);

    return toPrettyHtml(content);
  },
};
