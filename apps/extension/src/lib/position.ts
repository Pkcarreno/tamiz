/**
 * Result of computing the floating action bar's top-left position.
 *
 * @public
 */
export interface PositionResult {
  left: number;
  top: number;
}

/**
 * Compute the top-left position for the floating action bar relative to a
 * target element's bounding rect.
 *
 * Default placement is top-right of the element. The bar flips below when it
 * would overflow the top of the viewport, and is clamped to viewport margins.
 *
 * @public
 */
export function computeBarPosition(
  targetRect: DOMRect,
  barWidth: number,
  barHeight: number,
  viewportWidth: number,
  viewportHeight: number
): PositionResult {
  const GAP = 8;
  const MARGIN = 8;

  // If the bar is taller than the available viewport height, pin to top-left.
  if (barHeight >= viewportHeight - 2 * MARGIN) {
    return { left: MARGIN, top: MARGIN };
  }

  // Default: top-right of the element.
  let top = targetRect.top - barHeight - GAP;
  let left = targetRect.right + GAP;

  // Flip below the element if the bar would overflow the top.
  if (top < MARGIN) {
    top = targetRect.bottom + GAP;
  }

  // Clamp to the bottom of the viewport if below also overflows.
  if (top + barHeight > viewportHeight - MARGIN) {
    top = viewportHeight - barHeight - MARGIN;
  }

  // Clamp horizontally to the viewport margins.
  if (left + barWidth > viewportWidth - MARGIN) {
    left = viewportWidth - barWidth - MARGIN;
  }

  if (left < MARGIN) {
    left = MARGIN;
  }

  return { left, top };
}
