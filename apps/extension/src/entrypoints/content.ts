import { browser } from "@wxt-dev/browser";
import {
  clearHighlights,
  clearHoverHighlight,
  convertElement,
  highlight,
  hoverHighlight,
  injectHighlightStyles,
} from "../lib/content-callbacks.ts";
import { sendMessage } from "../lib/messaging.ts";
import { PickerStateMachine } from "../lib/picker.ts";

/**
 * Content script entry point.
 *
 * Implements the element picker state machine with a floating action bar
 * rendered inside a Shadow DOM for style and event isolation.
 *
 * All SolidJS and client-only imports are deferred inside {@link main} to
 * avoid WXT's SSR-like build evaluation triggering server-side errors.
 */
export default defineContentScript({
  async main() {
    const [{ createSignal }, { render }, { ContentApp }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("../components/content-ui.tsx"),
    ]);

    await import("../styles/content.css");

    // Inject highlight styles into the main document (shadow DOM CSS won't reach it)
    injectHighlightStyles();

    // State for the floating bar
    const [selectedElement, setSelectedElement] = createSignal<Element | null>(
      null
    );
    const [barFormat, setBarFormat] = createSignal<"markdown" | "raw">(
      "markdown"
    );
    const [barVisible, setBarVisible] = createSignal(false);

    // Toast API reference
    let showToast: ((message: string) => void) | null = null;

    // Create shadow root UI for the floating bar and toasts
    const _ui = createShadowRootUi({
      isolateEvents: ["click", "mousemove", "keydown"],
      onMount: (container) => {
        // Mount SolidJS app into shadow root
        render(
          () =>
            ContentApp({
              element: selectedElement,
              format: barFormat,
              onCancel: () => {
                machine.dispatch({ type: "DISMISS" });
              },
              onCopy: async () => {
                const el = selectedElement();
                if (!el) {
                  return;
                }
                const { content } = await convertElement(el, barFormat());
                await sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
                showToast?.("Copied to clipboard");
              },
              onDownload: async () => {
                const el = selectedElement();
                if (!el) {
                  return;
                }
                const { content, filename } = await convertElement(
                  el,
                  barFormat()
                );
                await sendMessage({ content, filename, type: "DOWNLOAD_FILE" });
                showToast?.("Element downloaded");
              },
              onFormatChange: setBarFormat,
              onIgnore: () => {
                // Placeholder — no action assigned yet
              },
              visible: barVisible,
            }),
          container
        );
      },
      position: "overlay",
    });

    // State machine
    let lastHoveredElement: Element | null = null;

    const machine = new PickerStateMachine({
      onCopy: async (content) => {
        await sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
        showToast?.("Copied to clipboard");
      },
      onDownload: (content, filename) => {
        sendMessage({ content, filename, type: "DOWNLOAD_FILE" });
        showToast?.("Element downloaded");
      },
      onElementSelected: (element) => {
        clearHighlights();
        clearHoverHighlight(lastHoveredElement);
        lastHoveredElement = null;
        highlight(element);
        setSelectedElement(element);
        setBarVisible(true);
      },
      onHover: (element) => {
        clearHoverHighlight(lastHoveredElement);
        if (element) {
          hoverHighlight(element);
        }
        lastHoveredElement = element;
      },
      onStateChange: (state) => {
        if (state === "IDLE") {
          clearHighlights();
          clearHoverHighlight(lastHoveredElement);
          lastHoveredElement = null;
          setBarVisible(false);
          setSelectedElement(null);
        }
      },
    });

    // Keyboard shortcut to dismiss picker
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        machine.dispatch({ type: "DISMISS" });
      }
    });

    // Mouse events for element selection
    document.addEventListener("mousemove", (e) => {
      if (machine.getState() === "HIGHLIGHTING") {
        const target = e.target as Element;
        if (target && target !== document.documentElement) {
          machine.dispatch({ target, type: "MOUSEMOVE" });
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (
        machine.getState() === "HIGHLIGHTING" ||
        machine.getState() === "SELECTED"
      ) {
        const target = e.target as Element;
        if (target && target !== document.documentElement) {
          // Check if click is inside the shadow root (bar buttons)
          const path = e.composedPath();
          const isInsideShadow = path.some(
            (node) => node instanceof ShadowRoot
          );
          if (isInsideShadow) {
            return; // Let shadow root handle the click
          }
          e.preventDefault();
          e.stopPropagation();
          machine.dispatch({ target, type: "CLICK" });
        }
      }
    });

    // Scroll/resize repositioning
    window.addEventListener(
      "scroll",
      () => {
        if (machine.getState() === "SELECTED") {
          machine.dispatch({ type: "SCROLL" });
        }
      },
      { passive: true }
    );

    window.addEventListener(
      "resize",
      () => {
        if (machine.getState() === "SELECTED") {
          machine.dispatch({ type: "RESIZE" });
        }
      },
      { passive: true }
    );

    // Listen for messages from popup/background
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as { type: string; format?: "markdown" | "raw" };
      if (msg.type === "INVOKE_PICKER") {
        if (msg.format) {
          setBarFormat(msg.format);
        }
        machine.dispatch({ type: "INVOKE" });
      }
    });

    // Capture toast API after mount
    setTimeout(() => {
      showToast = (globalThis as Record<string, unknown>).__tamizShowToast as (
        msg: string
      ) => void;
    }, 100);
  },
  matches: ["<all_urls>"],
});
