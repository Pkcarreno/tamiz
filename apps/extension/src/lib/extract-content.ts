/**
 * Clone an element and remove any tamiz floating-bar hosts, returning clean HTML
 * suitable for conversion.
 *
 * The element is cloned first so the source is never mutated, then every node
 * carrying the `data-tamiz-bar` attribute (the floating bar's shadow host or any
 * nested UI node) is stripped from the clone before serialization.
 *
 * @public
 */
export function extractContent(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  const barHosts = clone.querySelectorAll("[data-tamiz-bar]");

  for (const host of barHosts) {
    host.remove();
  }

  return clone.outerHTML;
}
