/**
 * Element picker state machine.
 *
 * Manages the lifecycle of visual element selection:
 * IDLE → HIGHLIGHTING → SELECTED
 *
 * The machine handles ONLY state transitions.  Side effects (clipboard copy,
 * file download, toasts) are dispatched through the centralized
 * {@link ActionDispatcher} and executed by action handlers outside the
 * machine.
 *
 * @public
 */
export type PickerState = "IDLE" | "HIGHLIGHTING" | "SELECTED";

/**
 * Events that trigger state transitions.
 *
 * `COPY` and `DOWNLOAD` are accepted for API compatibility but are no-ops
 * inside the machine — the actual side effects live in action handlers.
 * `MOUSEMOVE` and `CLICK` are internal events never dispatched through
 * the action pipeline.
 *
 * @public
 */
export type PickerEvent =
  | { type: "INVOKE"; format?: "markdown" | "html" }
  | { type: "MOUSEMOVE"; target: Element }
  | { type: "CLICK"; target: Element }
  | { type: "COPY" }
  | { type: "DOWNLOAD" }
  | { type: "FORMAT_CHANGE"; format: "markdown" | "html" }
  | { type: "DISMISS" }
  | { type: "RESTART" }
  | { type: "SCROLL" }
  | { type: "RESIZE" };

/**
 * State machine for the element picker.
 *
 * @public
 */
export class PickerStateMachine {
  private state: PickerState = "IDLE";
  private selectedElement: Element | null = null;
  private format: "markdown" | "html" = "markdown";

  private readonly onDeselect?: (element: Element) => void;
  private readonly onElementSelected?: (element: Element) => void;
  private readonly onHover?: (element: Element | null) => void;
  private readonly onReposition?: () => void;
  private readonly onStateChange?: (state: PickerState) => void;

  constructor(
    callbacks: {
      onDeselect?: (element: Element) => void;
      onElementSelected?: (element: Element) => void;
      onHover?: (element: Element | null) => void;
      onReposition?: () => void;
      onStateChange?: (state: PickerState) => void;
    } = {}
  ) {
    this.onDeselect = callbacks.onDeselect;
    this.onElementSelected = callbacks.onElementSelected;
    this.onHover = callbacks.onHover;
    this.onReposition = callbacks.onReposition;
    this.onStateChange = callbacks.onStateChange;
  }

  /**
   * Get current state.
   */
  getState(): PickerState {
    return this.state;
  }

  /**
   * Get selected element.
   */
  getSelectedElement(): Element | null {
    return this.selectedElement;
  }

  /**
   * Get current format.
   */
  getFormat(): "markdown" | "html" {
    return this.format;
  }

  /**
   * Dispatch an event to the state machine.
   *
   * @public
   */
  dispatch(event: PickerEvent): void {
    switch (this.state) {
      case "IDLE":
        this.handleIdle(event);
        break;
      case "HIGHLIGHTING":
        this.handleHighlighting(event);
        break;
      case "SELECTED":
        this.handleSelected(event);
        break;
      default:
        break;
    }
  }

  private handleIdle(event: PickerEvent): void {
    if (event.type === "INVOKE") {
      this.format = event.format ?? "markdown";
      this.transition("HIGHLIGHTING");
    } else if (event.type === "DISMISS") {
      // Already idle — still tear down any residual resources.
      this.teardown();
    }
  }

  private handleHighlighting(event: PickerEvent): void {
    if (event.type === "CLICK") {
      this.selectedElement = event.target;
      this.transition("SELECTED");
      this.onElementSelected?.(event.target);
    } else if (event.type === "MOUSEMOVE") {
      this.onHover?.(event.target);
    } else if (event.type === "DISMISS") {
      this.transition("IDLE");
    }
  }

  private handleSelected(event: PickerEvent): void {
    if (event.type === "FORMAT_CHANGE") {
      this.format = event.format;
    } else if (event.type === "SCROLL" || event.type === "RESIZE") {
      this.onReposition?.();
    } else if (event.type === "DISMISS") {
      this.transition("IDLE");
    } else if (event.type === "RESTART") {
      this.transition("HIGHLIGHTING");
    }
    // COPY and DOWNLOAD are intentionally no-ops here: side effects are
    // handled by action handlers in the centralized dispatcher pipeline.
    // CLICK events in SELECTED are intentionally ignored — the first click
    // is definitive; re-invoke to select a new element.
  }

  /**
   * Centralized state transition with cleanup.
   *
   * All side effects that depend on the source or target state live here:
   * - Leaving SELECTED: deselect element (onDeselect) and clear reference.
   * - Leaving HIGHLIGHTING: clear hover state.
   * - Entering IDLE: full teardown.
   *
   * Handlers only specify the target state; this method owns the cleanup.
   */
  private transition(newState: PickerState): void {
    const prev = this.state;
    this.state = newState;

    // Leaving SELECTED: clear the selected element and notify.
    if (prev === "SELECTED" && newState !== "SELECTED") {
      if (this.selectedElement) {
        this.onDeselect?.(this.selectedElement);
      }
      this.selectedElement = null;
    }

    // Leaving HIGHLIGHTING: clear hover feedback.
    if (prev === "HIGHLIGHTING" && newState !== "HIGHLIGHTING") {
      this.onHover?.(null);
    }

    // Entering IDLE: full teardown (redundant if prev was SELECTED, but
    // covers HIGHLIGHTING → IDLE and residual IDLE → IDLE calls).
    if (newState === "IDLE") {
      this.teardown();
    }

    this.onStateChange?.(newState);
  }

  /**
   * Clear the selected element. Invoked when transitioning to IDLE so that
   * stale references are not retained across capture cycles.
   */
  private teardown(): void {
    this.selectedElement = null;
  }
}
