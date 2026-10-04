import type { Message } from "../../lib/messaging/types.ts";
import type { ShortcutRegistry } from "../keyboard/registry.ts";

/**
 * Lifecycle states of a picker session.
 *
 * - `IDLE`: Picker is inactive.
 * - `HIGHLIGHTING`: User hovers over elements to pick a target.
 * - `SELECTED`: An element is locked in; the user can format, copy, download, or exclude child elements.
 *
 * @public
 */
export type PickerSessionState = "IDLE" | "HIGHLIGHTING" | "SELECTED";

/**
 * Output format supported by the converter.
 *
 * @public
 */
export type OutputFormat = "markdown" | "html";

/**
 * Discriminated union of all actions dispatched to a {@link PickerSession}.
 *
 * Consolidates user commands (copy, download, format change, dismiss)
 * and selection interaction events (select, exclude toggle).
 *
 * @public
 */
export type PickerAction =
  | { type: "INVOKE"; format?: OutputFormat }
  | { type: "SELECT"; target: Element }
  | { type: "EXCLUDE_TOGGLE" }
  | { type: "TOGGLE_EXCLUSION_ELEMENT"; target: Element }
  | { type: "FORMAT_CHANGE"; format: OutputFormat }
  | { type: "COPY" }
  | { type: "DOWNLOAD" }
  | { type: "RESTART" }
  | { type: "DISMISS" }
  | { type: "OPEN_OPTIONS" };

/**
 * Union of action type strings across all {@link PickerAction} variants.
 *
 * @public
 */
export type PickerActionType = PickerAction["type"];

/**
 * Immutable snapshot of the picker session state at a point in time.
 *
 * Consumed by the SolidJS UI to observe atomic state updates without
 * synchronizing separate signals.
 *
 * @public
 */
export interface PickerSessionSnapshot {
  /** Elements marked for exclusion from conversion. */
  readonly excludedElements: ReadonlySet<Element>;
  /** Active output format for conversion. */
  readonly format: OutputFormat;
  /** Whether the user is currently clicking child elements to exclude them. */
  readonly isExclusionMode: boolean;
  /** Currently selected target element, or null if unselected. */
  readonly selectedElement: Element | null;
  /** Current lifecycle phase of the picker. */
  readonly state: PickerSessionState;
}

/**
 * HTML converter dependency with extract and convert capabilities.
 *
 * @public
 */
export interface HtmlConverterAdapter {
  /** Convert DOM element or HTML string to target format. */
  convert: (
    source: Element | string,
    options?: { format?: OutputFormat }
  ) => Promise<string>;
  /** Extract clean Element clone from a DOM element, omitting excluded children. */
  extractContent: (
    element: Element,
    excludedElements?: ReadonlySet<Element>
  ) => Element;
}

/**
 * Runtime adapters and collaborators injected into {@link PickerSession}.
 *
 * @public
 */
export interface PickerSessionDeps {
  /** Check if the Clipboard API is available for direct writes. */
  clipboardAvailable?: () => boolean;
  /** Custom document reference for title resolution and element queries. */
  documentRef?: Document;
  /** HTML converter adapter. */
  htmlConverter: HtmlConverterAdapter;
  /** Shortcut registry for keyboard matching and tooltips. */
  registry?: ShortcutRegistry;
  /** Send a message to the background service worker. */
  sendMessage: (message: Message) => Promise<void>;
  /** Toast notification callback, or null if toasts are unavailable. */
  showToast?: ((message: string) => void) | null;
  /** Direct clipboard write implementation (defaults to navigator.clipboard.writeText). */
  writeClipboard?: (text: string) => Promise<void>;
}
