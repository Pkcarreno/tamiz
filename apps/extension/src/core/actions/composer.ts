import type { ConvertedContent } from "../../lib/content-callbacks.ts";
import type { Message } from "../../lib/messaging.ts";
import type { PickerStateMachine } from "../../lib/picker.ts";
import type { ActionDispatcher } from "./dispatcher.ts";
import { createActionDispatcher } from "./dispatcher.ts";
import type { ShortcutRegistry } from "./registry.ts";
import { createShortcutRegistry } from "./registry.ts";
import type { PickerAction } from "./types.ts";

/**
 * Runtime dependencies for the {@link composeActions} action handlers.
 *
 * All side-effecting collaborators (element conversion, message passing,
 * toast display, SolidJS signal setters) are injected so that the composer
 * can be unit-tested with `vi.fn()` stubs — no module mocking required.
 *
 * @public
 */
export interface ActionHandlerDeps {
  /** Convert a selected element into markdown or HTML content. */
  convertElement: (
    element: Element,
    format: "markdown" | "html"
  ) => Promise<ConvertedContent>;
  /** Current output format signal getter. */
  format: () => "markdown" | "html";
  /** The picker state machine for reading state and dispatching transitions. */
  machine: PickerStateMachine;
  /** Send a message to the background script. */
  sendMessage: (message: Message) => Promise<void>;
  /** Show or hide the floating action bar. */
  setBarVisible: (visible: boolean) => void;
  /** Update the bar format signal. */
  setFormat: (format: "markdown" | "html") => void;
  /** Update the selected element signal. */
  setSelectedElement: (el: Element | null) => void;
  /** Display a toast notification, or null if unavailable. */
  showToast: ((msg: string) => void) | null;
}

/**
 * Result of {@link composeActions} — the wired dispatcher, registry, and a
 * `dispose` function that tears down all handler subscriptions.
 *
 * @public
 */
export interface ComposedActions {
  dispatcher: ActionDispatcher;
  dispose: () => void;
  registry: ShortcutRegistry;
}

/**
 * Wire all seven `PickerAction` handlers onto a fresh dispatcher.
 *
 * Each handler reads state from the machine and calls the injected side-effect
 * collaborators (`convertElement`, `sendMessage`, `showToast`).  After a
 * successful COPY or DOWNLOAD the handler dispatches DISMISS to close the
 * picker — the keyboard handler never needs to dispatch DISMISS itself.
 *
 * @param deps - Injected runtime dependencies.
 * @returns The dispatcher, shortcut registry, and a dispose function.
 *
 * @public
 */
export function composeActions(deps: ActionHandlerDeps): ComposedActions {
  const dispatcher = createActionDispatcher();
  const registry = createShortcutRegistry();

  const handleCopy = async (): Promise<void> => {
    const element = deps.machine.getSelectedElement();
    if (!element) {
      return;
    }
    try {
      const { content } = await deps.convertElement(element, deps.format());
      await deps.sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
      deps.showToast?.("Copied to clipboard");
      dispatcher.dispatch({ type: "DISMISS" });
    } catch {
      deps.showToast?.("Copy failed");
    }
  };

  const handleDownload = async (): Promise<void> => {
    const element = deps.machine.getSelectedElement();
    if (!element) {
      return;
    }
    try {
      const { content, filename } = await deps.convertElement(
        element,
        deps.format()
      );
      await deps.sendMessage({ content, filename, type: "DOWNLOAD_FILE" });
      deps.showToast?.("Element downloaded");
      dispatcher.dispatch({ type: "DISMISS" });
    } catch (err) {
      deps.showToast?.(
        `Download failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };

  const handleFormatChange = (
    action: Extract<PickerAction, { type: "FORMAT_CHANGE" }>
  ): void => {
    deps.setFormat(action.format);
    deps.machine.dispatch(action);
  };

  const handleInvoke = (
    action: Extract<PickerAction, { type: "INVOKE" }>
  ): void => {
    if (action.format !== undefined) {
      deps.setFormat(action.format);
    }
    deps.machine.dispatch(action);
  };

  const handleDismiss = (): void => {
    deps.machine.dispatch({ type: "DISMISS" });
    deps.setBarVisible(false);
  };

  const handleScroll = (): void => {
    deps.machine.dispatch({ type: "SCROLL" });
  };

  const handleResize = (): void => {
    deps.machine.dispatch({ type: "RESIZE" });
  };

  const subscriptions: Array<() => void> = [
    dispatcher.on("COPY", handleCopy),
    dispatcher.on("FORMAT_CHANGE", handleFormatChange),
    dispatcher.on("INVOKE", handleInvoke),
    dispatcher.on("DISMISS", handleDismiss),
    dispatcher.on("DOWNLOAD", handleDownload),
    dispatcher.on("RESIZE", handleResize),
    dispatcher.on("SCROLL", handleScroll),
  ];

  return {
    dispatcher,
    dispose: () => {
      for (const unsubscribe of subscriptions) {
        unsubscribe();
      }
    },
    registry,
  };
}
