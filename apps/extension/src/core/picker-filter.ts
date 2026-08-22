import { TAMIZ_UI_MARKER } from "../lib/messaging/constants.ts";

/** Tags that should never be highlighted or selected by the picker. @public */
export const OMITTED_TAGS: ReadonlySet<string> = new Set([
  "html",
  "body",
  "head",
]);

/**
 * Attributes that disqualify an element from picker interaction.
 * Elements carrying any of these attributes are silently ignored.
 *
 * @public
 */
export const OMITTED_ATTRIBUTES: ReadonlySet<string> = new Set([
  TAMIZ_UI_MARKER,
]);

/**
 * Determine whether a DOM element can be highlighted or selected by the
 * picker. Returns `false` for document-root containers (`html`, `body`,
 * `head`) and for elements that carry an omitted attribute.
 *
 * @param element - The DOM element to test.
 * @returns `true` if the element is eligible for picker interaction.
 *
 * @public
 */
export function isSelectable(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (OMITTED_TAGS.has(tag)) {
    return false;
  }
  for (const attr of OMITTED_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      return false;
    }
  }
  return true;
}
