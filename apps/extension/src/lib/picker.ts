/**
 * Element picker state machine.
 *
 * Manages the lifecycle of visual element selection:
 * IDLE → HIGHLIGHTING → SELECTED
 *
 * Copy, download, scroll, and resize are handled inline without leaving the
 * SELECTED state. DISMISS from any state returns to IDLE with full teardown.
 *
 * @public
 */
export type PickerState = "IDLE" | "HIGHLIGHTING" | "SELECTED";

/**
 * Events that trigger state transitions.
 *
 * @public
 */
export type PickerEvent =
  | { type: "INVOKE"; format?: "markdown" | "raw" }
  | { type: "MOUSEMOVE"; target: Element }
  | { type: "CLICK"; target: Element }
  | { type: "COPY" }
  | { type: "DOWNLOAD" }
  | { type: "FORMAT_CHANGE"; format: "markdown" | "raw" }
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
  private format: "markdown" | "raw" = "markdown";

  private readonly onStateChange?: (state: PickerState) => void;
  private readonly onElementSelected?: (element: Element) => void;
  private readonly onHover?: (element: Element | null) => void;
  private readonly onCopy?: (content: string) => void;
  private readonly onDownload?: (content: string, filename: string) => void;
  private readonly onReposition?: () => void;
  private readonly onTeardown?: () => void;

  constructor(
    callbacks: {
      onStateChange?: (state: PickerState) => void;
      onElementSelected?: (element: Element) => void;
      onHover?: (element: Element | null) => void;
      onCopy?: (content: string) => void;
      onDownload?: (content: string, filename: string) => void;
      onReposition?: () => void;
      onTeardown?: () => void;
    } = {}
  ) {
    this.onStateChange = callbacks.onStateChange;
    this.onElementSelected = callbacks.onElementSelected;
    this.onHover = callbacks.onHover;
    this.onCopy = callbacks.onCopy;
    this.onDownload = callbacks.onDownload;
    this.onReposition = callbacks.onReposition;
    this.onTeardown = callbacks.onTeardown;
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
  getFormat(): "markdown" | "raw" {
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
    if (event.type === "COPY") {
      this.onCopy?.(this.getSelectedContent());
    } else if (event.type === "DOWNLOAD") {
      const content = this.getSelectedContent();
      const filename = this.generateFilename();
      this.onDownload?.(content, filename);
    } else if (event.type === "FORMAT_CHANGE") {
      this.format = event.format;
    } else if (event.type === "CLICK") {
      // Re-select a different element and reposition the bar.
      this.selectedElement = event.target;
      this.onElementSelected?.(event.target);
      this.onReposition?.();
    } else if (event.type === "SCROLL" || event.type === "RESIZE") {
      this.onReposition?.();
    } else if (event.type === "DISMISS") {
      this.transition("IDLE");
    }
  }

  private transition(newState: PickerState): void {
    this.state = newState;
    if (newState === "IDLE") {
      this.teardown();
    }
    this.onStateChange?.(newState);
  }

  /**
   * Clear the selected element and invoke the teardown callback, used when
   * transitioning to IDLE (whether from DISMISS or a state change).
   */
  private teardown(): void {
    this.selectedElement = null;
    this.onTeardown?.();
  }

  private getSelectedContent(): string {
    return this.selectedElement?.outerHTML ?? "";
  }

  private generateFilename(): string {
    const tag = this.selectedElement?.tagName.toLowerCase() ?? "content";
    const timestamp = Date.now();
    return `${tag}-${timestamp}`;
  }
}
