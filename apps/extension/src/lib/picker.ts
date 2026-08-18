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

  private readonly onStateChange?: (state: PickerState) => void;
  private readonly onElementSelected?: (element: Element) => void;
  private readonly onHover?: (element: Element | null) => void;
  private readonly onReposition?: () => void;

  constructor(
    callbacks: {
      onStateChange?: (state: PickerState) => void;
      onElementSelected?: (element: Element) => void;
      onHover?: (element: Element | null) => void;
      onReposition?: () => void;
    } = {}
  ) {
    this.onStateChange = callbacks.onStateChange;
    this.onElementSelected = callbacks.onElementSelected;
    this.onHover = callbacks.onHover;
    this.onReposition = callbacks.onReposition;
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
      this.onHover?.(null);
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
    }
    // COPY and DOWNLOAD are intentionally no-ops here: side effects are
    // handled by action handlers in the centralized dispatcher pipeline.
    // CLICK events in SELECTED are intentionally ignored — the first click
    // is definitive; re-invoke to select a new element.
  }

  private transition(newState: PickerState): void {
    this.state = newState;
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
