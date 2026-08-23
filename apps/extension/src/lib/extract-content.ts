import { computeIndexPath, resolveIndexPath } from "./index-path.ts";

/**
 * Clone an element and remove any tamiz floating-bar hosts, returning clean HTML
 * suitable for conversion.
 *
 * The element is cloned first so the source is never mutated, then every node
 * carrying the `data-tamiz-bar` attribute (the floating bar's shadow host or any
 * nested UI node) is stripped from the clone before serialization.
 *
 * When `excludedElements` is provided, matching source elements are stamped with
 * `data-tamiz-excluded` on the clone and then removed — the source DOM is never
 * modified.
 *
 * @param element          - The DOM element to extract content from.
 * @param excludedElements - Optional set of source elements to exclude from output.
 * @public
 */
export function extractContent(
  element: Element,
  excludedElements?: Set<Element>
): string {
  const clone = element.cloneNode(true) as Element;

  // Strip floating bar hosts.
  const barHosts = clone.querySelectorAll("[data-tamiz-bar]");
  for (const host of barHosts) {
    host.remove();
  }

  // Stamp and strip excluded elements.
  if (excludedElements && excludedElements.size > 0) {
    for (const source of excludedElements) {
      const path = computeIndexPath(element, source);
      if (!path) {
        continue;
      }
      const target = resolveIndexPath(clone, path);
      if (!target) {
        continue;
      }
      target.setAttribute("data-tamiz-excluded", "");
      target.remove();
    }
  }

  return clone.outerHTML;
}
