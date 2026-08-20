/**
 * Scrim controller for the visual feedback overlay.
 *
 * Encapsulates the host-document scrim lifecycle: injection, removal,
 * and fail-open degradation when CSP blocks DOM mutations.
 *
 * @module
 */

/** CSS z-index of the scrim overlay. One below the shadow-root UI (2147483647). */
const SCRIM_Z_INDEX = "2147483646";

/** Attribute marker that excludes the scrim from main-world click blocking. */
const SCRIM_ATTR = "data-tamiz-ui";

/** Scrim opacity as a CSS rgba alpha channel. */
const SCRIM_OPACITY = "0.35";

/**
 * Stateful controller managing the scrim overlay lifecycle.
 *
 * @public
 */
export interface ScrimController {
  /** Alias for {@link ScrimController.hide} — cleans up all DOM references. */
  dispose: () => void;
  /** Remove the scrim from the DOM. No-op if not visible. */
  hide: () => void;
  /** Inject the scrim into document.body. No-op if already visible. */
  show: () => void;
}

/**
 * Create a scrim controller managing the host-document overlay.
 *
 * The scrim is a semi-transparent div injected into `document.body` that
 * dims the page during selection mode. It uses `pointer-events: none` so
 * the main-world blocker continues intercepting clicks on underlying elements.
 *
 * @public
 */
export function createScrimController(): ScrimController {
  let scrimElement: HTMLDivElement | null = null;

  function show(): void {
    if (scrimElement) {
      return;
    }
    try {
      const div = document.createElement("div");
      div.setAttribute(SCRIM_ATTR, "");
      div.style.position = "fixed";
      div.style.inset = "0";
      div.style.backgroundColor = `rgba(0, 0, 0, ${SCRIM_OPACITY})`;
      div.style.zIndex = SCRIM_Z_INDEX;
      div.style.pointerEvents = "none";
      document.body.appendChild(div);
      scrimElement = div;
    } catch {
      // Fail-open: if document.body.appendChild is blocked by CSP or
      // another DOM error, continue operating without the scrim.
      // The picker state machine operates normally — the scrim is a
      // purely visual aid, not a functional dependency.
      scrimElement = null;
    }
  }

  function hide(): void {
    if (scrimElement) {
      scrimElement.remove();
      scrimElement = null;
    }
  }

  function dispose(): void {
    hide();
  }

  return { dispose, hide, show };
}
