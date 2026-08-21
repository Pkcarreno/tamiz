import type { Message } from "../../lib/messaging/types.ts";
import type { ShortcutRegistry } from "../keyboard/registry.ts";
import { createShortcutRegistry } from "../keyboard/registry.ts";
import type { PickerStateMachine } from "../machine/picker.ts";
import type { ActionDispatcher } from "./dispatcher.ts";
import { createActionDispatcher } from "./dispatcher.ts";
import type { PickerAction } from "./types.ts";

/** File extension for each output format. */
const FORMAT_EXTENSION: Record<"markdown" | "html", string> = {
  html: "html",
  markdown: "md",
};

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
  /** Current output format signal getter. */
  format: () => "markdown" | "html";
  /** HTML converter with extract and convert capabilities. */
  htmlConverter: {
    /** Convert HTML string to target format. */
    convert: (html: string, options: { strategy: unknown }) => Promise<string>;
    /** Extract clean HTML from a DOM element. */
    extractContent: (element: Element) => string;
  };
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
 * Wire all six `PickerAction` handlers onto a fresh dispatcher.
 *
 * Each handler reads state from the machine and calls the injected side-effect
 * collaborators (`htmlConverter`, `sendMessage`, `showToast`). After a
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
      const html = deps.htmlConverter.extractContent(element);
      const strategy =
        deps.format() === "markdown"
          ? await import("@tamiz/html-converter/strategies/markdown").then(
              (m) => m.markdownStrategy
            )
          : await import("@tamiz/html-converter/strategies/html").then(
              (m) => m.htmlStrategy
            );
      const content = await deps.htmlConverter.convert(html, { strategy });
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
      const html = deps.htmlConverter.extractContent(element);
      const strategy =
        deps.format() === "markdown"
          ? await import("@tamiz/html-converter/strategies/markdown").then(
              (m) => m.markdownStrategy
            )
          : await import("@tamiz/html-converter/strategies/html").then(
              (m) => m.htmlStrategy
            );
      const content = await deps.htmlConverter.convert(html, { strategy });
      const tag = element.tagName.toLowerCase();
      const timestamp = Date.now();
      const extension = FORMAT_EXTENSION[deps.format()];
      const filename = `${tag}-${timestamp}.${extension}`;
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

  const handleRestart = (): void => {
    // Dispatch RESTART to the machine — it transitions to HIGHLIGHTING
    // and clears the selected element.  Bar visibility is driven by the
    // state machine via the onStateChange callback, so we do NOT call
    // setBarVisible here.
    deps.machine.dispatch({ type: "RESTART" });
  };

  const subscriptions: Array<() => void> = [
    dispatcher.on("COPY", handleCopy),
    dispatcher.on("FORMAT_CHANGE", handleFormatChange),
    dispatcher.on("INVOKE", handleInvoke),
    dispatcher.on("DISMISS", handleDismiss),
    dispatcher.on("RESTART", handleRestart),
    dispatcher.on("DOWNLOAD", handleDownload),
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
