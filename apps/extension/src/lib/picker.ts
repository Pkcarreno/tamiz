/**
 * Element picker state machine.
 *
 * Manages the lifecycle of visual element selection:
 * IDLE → HIGHLIGHTING → SELECTED → ACTION
 *
 * @public
 */
export type PickerState = "IDLE" | "HIGHLIGHTING" | "SELECTED" | "ACTION";

/**
 * Events that trigger state transitions.
 *
 * @public
 */
export type PickerEvent =
  | { type: "INVOKE" }
  | { type: "MOUSEMOVE"; target: Element }
  | { type: "CLICK"; target: Element }
  | { type: "COPY" }
  | { type: "DOWNLOAD" }
  | { type: "DISMISS" }
  | { type: "FORMAT_CHANGE"; format: "markdown" | "raw" };

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
  private readonly onCopy?: (content: string) => void;
  private readonly onDownload?: (content: string, filename: string) => void;

  constructor(
    callbacks: {
      onStateChange?: (state: PickerState) => void;
      onElementSelected?: (element: Element) => void;
      onCopy?: (content: string) => void;
      onDownload?: (content: string, filename: string) => void;
    } = {}
  ) {
    this.onStateChange = callbacks.onStateChange;
    this.onElementSelected = callbacks.onElementSelected;
    this.onCopy = callbacks.onCopy;
    this.onDownload = callbacks.onDownload;
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
        if (event.type === "INVOKE") {
          this.transition("HIGHLIGHTING");
        }
        break;

      case "HIGHLIGHTING":
        if (event.type === "CLICK") {
          this.selectedElement = event.target;
          this.transition("SELECTED");
          this.onElementSelected?.(event.target);
        } else if (event.type === "DISMISS") {
          this.transition("IDLE");
        }
        break;

      case "SELECTED":
        if (event.type === "COPY") {
          this.transition("ACTION");
          this.onCopy?.(this.getSelectedContent());
          this.transition("SELECTED");
        } else if (event.type === "DOWNLOAD") {
          this.transition("ACTION");
          const content = this.getSelectedContent();
          const filename = this.generateFilename();
          this.onDownload?.(content, filename);
          this.transition("SELECTED");
        } else if (event.type === "FORMAT_CHANGE") {
          this.format = event.format;
        } else if (event.type === "DISMISS") {
          this.transition("IDLE");
        } else if (event.type === "CLICK") {
          // Re-select different element
          this.selectedElement = event.target;
          this.onElementSelected?.(event.target);
        }
        break;

      case "ACTION":
        // Auto-return to SELECTED after action
        this.transition("SELECTED");
        break;

      default:
        break;
    }
  }

  private transition(newState: PickerState): void {
    this.state = newState;
    this.onStateChange?.(newState);
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
