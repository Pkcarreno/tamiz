/**
 * Highlight controller for DOM element selection and hover feedback.
 *
 * Encapsulates highlight, hover, and selection state management.
 * Wraps stateless DOM helpers in a stateful controller.
 *
 * @module
 */

/** CSS class applied to highlighted elements. */
const HIGHLIGHT_CLASS = "tamiz-highlight";

/** CSS class applied to hovered elements. */
const HOVER_CLASS = "tamiz-hover";

/**
 * Stateful controller managing hover, selection, and highlight lifecycle.
 *
 * @public
 */
export interface HighlightController {
  /** Remove all hover, selection, and highlight styles. */
  clearAll: () => void;
  /** Apply highlight style to an element. */
  highlightElement: (element: Element) => void;
  /** Fix an element as selected. Clears hover, highlights selected. */
  selectElement: (element: Element) => void;
  /** Set or clear the hover target. Removes previous hover, applies new. */
  setHoverTarget: (element: Element | null) => void;
}

/**
 * Create a highlight controller managing DOM highlight state.
 *
 * @public
 */
export function createHighlightController(): HighlightController {
  let hoveredElement: Element | null = null;

  function highlightElement(element: Element): void {
    element.classList.add(HIGHLIGHT_CLASS);
  }

  function clearHighlights(): void {
    for (const el of document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)) {
      el.classList.remove(HIGHLIGHT_CLASS);
    }
  }

  function setHoverTarget(element: Element | null): void {
    if (hoveredElement) {
      hoveredElement.classList.remove(HOVER_CLASS);
    }
    if (element) {
      element.classList.add(HOVER_CLASS);
    }
    hoveredElement = element;
  }

  function selectElement(element: Element): void {
    clearHighlights();
    if (hoveredElement) {
      hoveredElement.classList.remove(HOVER_CLASS);
      hoveredElement = null;
    }
    highlightElement(element);
  }

  function clearAll(): void {
    clearHighlights();
    if (hoveredElement) {
      hoveredElement.classList.remove(HOVER_CLASS);
      hoveredElement = null;
    }
  }

  return { clearAll, highlightElement, selectElement, setHoverTarget };
}
