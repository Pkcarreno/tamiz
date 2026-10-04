import { isSelectable } from "../picker-filter.ts";
import type { PickerSessionSnapshot } from "../session/types.ts";

/**
 * Host page visual adornment and feedback controller.
 *
 * Encapsulates the host document visual effects:
 * - Scrim overlay injection, display, and cleanup.
 * - Element selection and hover outlines.
 * - Exclusion indicators and hover outlines.
 * - Crosshair cursor on the root document element.
 * - Consolidated stylesheet injection and teardown.
 *
 * @module
 */

/** Identifier of the consolidated style element in document head. */
export const ADORNMENT_STYLE_ID = "tamiz-adornment-styles";

/** CSS class applied to the selected element. */
export const HIGHLIGHT_CLASS = "tamiz-highlight";

/** CSS class applied to the hovered element during selection mode. */
export const HOVER_CLASS = "tamiz-hover";

/** CSS class applied to excluded elements. */
export const EXCLUDED_CLASS = "tamiz-excluded";

/** CSS class applied to the hovered element during exclusion mode. */
export const EXCLUSION_HOVER_CLASS = "tamiz-exclusion-hover";

/** CSS class applied to the root document element for crosshair cursor. */
export const EXCLUSION_CURSOR_CLASS = "tamiz-exclusion-cursor";

/** CSS z-index of the scrim overlay (one below shadow-root UI 2147483647). */
const SCRIM_Z_INDEX = "2147483646";

/** Attribute marker that excludes the scrim from click blocking. */
const SCRIM_ATTR = "data-tamiz-ui";

/** Scrim opacity as a CSS rgba alpha value. */
const SCRIM_OPACITY = "0.35";

/** Consolidated CSS rules for host page adornments. */
const ADORNMENT_STYLES = `
  .${HIGHLIGHT_CLASS} {
    outline: 2px solid #2563eb !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
    z-index: 2147483647 !important;
  }
  .${HOVER_CLASS} {
    outline: 2px dashed #3b82f6 !important;
    outline-offset: 2px !important;
    z-index: 2147483647 !important;
  }
  .${EXCLUDED_CLASS} {
    opacity: 0.3 !important;
    filter: grayscale(100%) !important;
    outline: 2px dashed #ef4444 !important;
    outline-offset: 1px !important;
  }
  .${EXCLUSION_HOVER_CLASS} {
    outline: 2px dashed #f97316 !important;
    outline-offset: 2px !important;
  }
  .${EXCLUSION_CURSOR_CLASS}, .${EXCLUSION_CURSOR_CLASS} * {
    cursor: crosshair !important;
  }
`;

/**
 * Dependencies for creating a PageAdornment controller.
 *
 * @public
 */
export interface PageAdornmentDeps {
  /** Target document instance (defaults to global document). */
  readonly documentRef?: Document;
}

/**
 * Declarative interface for host page adornment.
 *
 * @public
 */
export interface PageAdornment {
  /** Remove all injected styles, scrim, outlines, and cursor classes. */
  dispose: () => void;
  /** Set or clear the current hover target based on mouse position. */
  setHoverTarget: (target: Element | null) => void;
  /** Synchronize host DOM visual state with a session snapshot. */
  update: (snapshot: PickerSessionSnapshot) => void;
}

/**
 * Create a PageAdornment controller to manage all host page visual effects.
 *
 * Injects consolidated CSS styles on initialization and encapsulates
 * scrim overlay, element outlines, exclusion styles, and cursor state.
 *
 * @param deps - Optional dependencies such as a custom Document reference.
 * @returns Stateful controller implementing {@link PageAdornment}.
 *
 * @public
 */
export function createPageAdornment(
  deps: PageAdornmentDeps = {}
): PageAdornment {
  const doc =
    deps.documentRef ?? (typeof document === "undefined" ? null : document);

  let currentSnapshot: PickerSessionSnapshot | null = null;
  let scrimElement: HTMLDivElement | null = null;
  let selectedElement: Element | null = null;
  let hoveredElement: Element | null = null;
  let hoveredClass: string | null = null;
  let trackedExcludedElements = new Set<Element>();
  let isCursorActive = false;

  // Inject consolidated styles into document head.
  injectStyles();

  function injectStyles(): void {
    if (!doc?.head) {
      return;
    }
    if (doc.getElementById(ADORNMENT_STYLE_ID)) {
      return;
    }
    try {
      const style = doc.createElement("style");
      style.id = ADORNMENT_STYLE_ID;
      style.textContent = ADORNMENT_STYLES;
      doc.head.appendChild(style);
    } catch {
      // Fail-open: continue without injected styles if blocked by CSP.
    }
  }

  function removeStyles(): void {
    if (!doc) {
      return;
    }
    const style = doc.getElementById(ADORNMENT_STYLE_ID);
    style?.remove();
  }

  function showScrim(): void {
    if (scrimElement || !doc?.body) {
      return;
    }
    try {
      const div = doc.createElement("div");
      div.setAttribute(SCRIM_ATTR, "");
      div.style.position = "fixed";
      div.style.inset = "0";
      div.style.backgroundColor = `rgba(0, 0, 0, ${SCRIM_OPACITY})`;
      div.style.zIndex = SCRIM_Z_INDEX;
      div.style.pointerEvents = "none";
      doc.body.appendChild(div);
      scrimElement = div;
    } catch {
      // Fail-open: continue without scrim if blocked by CSP or DOM error.
      scrimElement = null;
    }
  }

  function hideScrim(): void {
    if (scrimElement) {
      scrimElement.remove();
      scrimElement = null;
    }
  }

  function clearHover(): void {
    if (hoveredElement && hoveredClass) {
      try {
        hoveredElement.classList.remove(hoveredClass);
      } catch {
        // Element may have been detached from DOM.
      }
    }
    hoveredElement = null;
    hoveredClass = null;
  }

  function applyHover(target: Element, className: string): void {
    if (hoveredElement === target && hoveredClass === className) {
      return;
    }
    clearHover();
    try {
      target.classList.add(className);
      hoveredElement = target;
      hoveredClass = className;
    } catch {
      clearHover();
    }
  }

  function syncCursor(active: boolean): void {
    if (!doc?.documentElement) {
      return;
    }
    if (active === isCursorActive) {
      return;
    }
    isCursorActive = active;
    if (active) {
      doc.documentElement.classList.add(EXCLUSION_CURSOR_CLASS);
    } else {
      doc.documentElement.classList.remove(EXCLUSION_CURSOR_CLASS);
    }
  }

  function syncSelection(target: Element | null): void {
    if (selectedElement === target) {
      return;
    }
    if (selectedElement) {
      try {
        selectedElement.classList.remove(HIGHLIGHT_CLASS);
      } catch {
        // Element may have been detached from DOM.
      }
    }
    selectedElement = target;
    if (selectedElement) {
      try {
        selectedElement.classList.add(HIGHLIGHT_CLASS);
      } catch {
        selectedElement = null;
      }
    }
  }

  function syncExcludedElements(nextSet: ReadonlySet<Element>): void {
    // Remove class from elements no longer in the set.
    for (const el of trackedExcludedElements) {
      if (!nextSet.has(el)) {
        try {
          el.classList.remove(EXCLUDED_CLASS);
        } catch {
          // Element may have been detached.
        }
      }
    }

    // Add class to newly excluded elements.
    for (const el of nextSet) {
      if (!trackedExcludedElements.has(el)) {
        try {
          el.classList.add(EXCLUDED_CLASS);
        } catch {
          // Element may have been detached.
        }
      }
    }

    trackedExcludedElements = new Set(nextSet);
  }

  function resolveHoverTarget(
    target: Element | null
  ): { target: Element; className: string } | null {
    if (!(target && doc) || target === doc.documentElement) {
      return null;
    }
    if (!isSelectable(target)) {
      return null;
    }

    const snap = currentSnapshot;
    if (!snap) {
      return null;
    }

    if (snap.state === "HIGHLIGHTING") {
      return { className: HOVER_CLASS, target };
    }

    if (snap.state === "SELECTED" && snap.isExclusionMode) {
      const selected = snap.selectedElement;
      if (selected && target !== selected && selected.contains(target)) {
        return { className: EXCLUSION_HOVER_CLASS, target };
      }
    }

    return null;
  }

  function setHoverTarget(target: Element | null): void {
    const resolved = resolveHoverTarget(target);
    if (!resolved) {
      clearHover();
      return;
    }
    applyHover(resolved.target, resolved.className);
  }

  function update(snapshot: PickerSessionSnapshot): void {
    currentSnapshot = snapshot;

    // 1. Scrim synchronization.
    if (snapshot.state === "HIGHLIGHTING" || snapshot.state === "SELECTED") {
      showScrim();
    } else {
      hideScrim();
    }

    // 2. Selection highlight.
    if (snapshot.state === "SELECTED") {
      syncSelection(snapshot.selectedElement);
    } else {
      syncSelection(null);
    }

    // 3. Exclusion mode cursor and markers.
    syncCursor(snapshot.isExclusionMode);
    syncExcludedElements(snapshot.excludedElements);

    // 4. Re-evaluate current hover with new state.
    if (hoveredElement) {
      const resolved = resolveHoverTarget(hoveredElement);
      if (!resolved) {
        clearHover();
      } else if (resolved.className !== hoveredClass) {
        applyHover(resolved.target, resolved.className);
      }
    }
  }

  function dispose(): void {
    hideScrim();
    clearHover();
    syncSelection(null);
    syncCursor(false);
    syncExcludedElements(new Set());
    removeStyles();
    currentSnapshot = null;
  }

  return {
    dispose,
    setHoverTarget,
    update,
  };
}
