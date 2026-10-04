import { cleanDocument } from "./cleaner.ts";
import { getDomParser } from "./dom.ts";
import { htmlStrategy } from "./strategies/html.ts";
import { markdownStrategy } from "./strategies/markdown.ts";
import type {
  ConversionStrategy,
  ConverterOptions,
  DomParser,
} from "./types.ts";

export type {
  ConversionFormat,
  ConversionStrategy,
  ConverterOptions,
  DomParser,
} from "./types.ts";

/**
 * Locate a corresponding element in a cloned tree using index paths.
 * Used to remove excluded elements without mutating the caller's source tree.
 */
function findCorrespondingElement(
  root: Element,
  source: Element,
  target: Element
): Element | null {
  if (source === target) {
    return root;
  }
  const path: number[] = [];
  let current: Element | null = target;

  while (current && current !== source) {
    const parent: Element | null = current.parentElement;
    if (!parent) {
      return null;
    }
    const children = Array.from(parent.children);
    path.unshift(children.indexOf(current));
    current = parent;
  }

  if (current !== source) {
    return null;
  }

  let resolved: Element | null = root;
  for (const index of path) {
    if (!resolved || index < 0 || index >= resolved.children.length) {
      return null;
    }
    resolved = resolved.children[index] ?? null;
  }

  return resolved;
}

/**
 * Remove excluded elements from a cloned DOM element tree.
 */
function removeExcludedElements(
  root: Element,
  source: Element,
  exclude: Element[] | Set<Element>
): void {
  const excludedSet = exclude instanceof Set ? exclude : new Set(exclude);

  for (const target of excludedSet) {
    if (root.contains(target)) {
      target.remove();
    } else {
      const match = findCorrespondingElement(root, source, target);
      match?.remove();
    }
  }
}

/**
 * Convert an HTML string or DOM Element to the desired output format.
 *
 * When passed a string, parses it into an in-memory DOM tree once.
 * When passed an Element, clones it defensively to preserve the caller's DOM.
 * Applies the cleaning pipeline directly in memory without string re-serialization,
 * then dispatches to the selected format strategy.
 *
 * @param source  - The HTML string or DOM Element to convert.
 * @param options - Conversion configuration options.
 * @returns The converted Markdown or HTML string.
 *
 * @public
 */
export async function convert(
  source: Element | string,
  options?: ConverterOptions
): Promise<string> {
  const isStringSource = typeof source === "string";

  if (isStringSource && source.trim() === "") {
    return "";
  }

  const strategy: ConversionStrategy =
    options?.strategy ??
    (options?.format === "html" ? htmlStrategy : markdownStrategy);

  const parser: DomParser = getDomParser();
  const root: Element | Document = isStringSource
    ? parser.parse(source)
    : (source.cloneNode(true) as Element);

  // Apply exclusion removals on cloned elements
  if (!isStringSource && options?.exclude) {
    removeExcludedElements(root as Element, source, options.exclude);
  }

  // Sanitize in-memory when cleaning is enabled (default: true)
  if (options?.clean !== false) {
    cleanDocument(root, isStringSource ? options?.exclude : undefined);
  }

  return await strategy.convert(root);
}
