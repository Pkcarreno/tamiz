import { browser } from "wxt/browser";
import { composeActions } from "../core/actions/composer.ts";
import { createPickerCore } from "../core/index.ts";
import { handleKeydown } from "../core/keyboard/handler.ts";
import { extractContent } from "../lib/extract-content.ts";
import {
  type Message,
  onMessage,
  sendMessage,
  setTransport,
} from "../lib/messaging.ts";

/**
 * Inject highlight and hover CSS into the main document.
 *
 * Shadow DOM styles don't reach the host document, so we need to inject
 * the highlight classes directly into the page's `<head>`.
 */
function injectHighlightStyles(): void {
  if (document.getElementById("tamiz-highlight-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "tamiz-highlight-styles";
  style.textContent = `
    .tamiz-highlight {
      box-shadow: 0 0 0 2px #2563eb !important;
      background-color: rgba(37, 99, 235, 0.12) !important;
    }
    .tamiz-hover {
      box-shadow: inset 0 0 0 2px #3b82f6 !important;
      background-color: rgba(59, 130, 246, 0.08) !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Content script entry point.
 *
 * Thin shell: transport setup, core creation, shadow root mount, event
 * delegation. All domain logic lives in `core/`.
 */
export default defineContentScript({
  cssInjectionMode: "ui",
  async main(ctx) {
    // 1. Configure transport (browser API bridge).
    setTransport({
      onMessage: (handler) => {
        browser.runtime.onMessage.addListener(
          (
            message: unknown,
            sender: unknown,
            sendResponse: (response?: unknown) => void
          ) => {
            handler(message as Message, sender)
              .then((result) => sendResponse(result))
              .catch((err) => {
                console.error("[tamiz] message handler error:", err);
                const errorMsg =
                  err instanceof Error
                    ? err.message
                    : String(err ?? "Unknown error");
                sendResponse({ __error: errorMsg });
              });
            return true;
          }
        );
      },
      sendMessage: (msg) => browser.runtime.sendMessage(msg),
    });

    // 2. Import SolidJS and UI.
    const [{ createSignal }, { render }, { ContentApp }] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("../components/content-ui.tsx"),
    ]);

    await import("../styles/content.css");

    // 3. Inject highlight CSS into host document.
    injectHighlightStyles();

    // 4. Create UI signals.
    const [selectedElement, setSelectedElement] = createSignal<Element | null>(
      null
    );
    const [barFormat, setBarFormat] = createSignal<"markdown" | "html">(
      "markdown"
    );
    const [barVisible, setBarVisible] = createSignal(false);
    let showToastApi: ((message: string) => void) | null = null;

    // 5. Create core (domain collaborators wired together).
    const core = createPickerCore({
      onElementSelected: (element) => {
        setSelectedElement(element);
        setBarVisible(true);
      },
      onHover: () => {
        // Hover feedback handled by highlight controller via machine callbacks.
      },
      onStateChange: (state) => {
        if (state === "IDLE") {
          setBarVisible(false);
          setSelectedElement(null);
        } else if (state === "HIGHLIGHTING") {
          // RESTART transitions to HIGHLIGHTING — clear the selected element
          // signal so the bar disappears and the user can hover freely.
          setSelectedElement(null);
        }
      },
    });

    // 6. Compose action handlers (wires SolidJS signal setters).
    const { dispatcher } = composeActions({
      format: barFormat,
      htmlConverter: {
        convert: async (html, { strategy }) => {
          const { convert } = await import("@tamiz/html-converter");
          return convert(html, { strategy: strategy as never });
        },
        extractContent,
      },
      machine: core.machine,
      sendMessage,
      setBarVisible,
      setFormat: setBarFormat,
      setSelectedElement,
      get showToast() {
        return showToastApi;
      },
    });

    // 7. Mount shadow root UI.
    const ui = await createShadowRootUi(ctx, {
      isolateEvents: ["mousemove", "keydown"],
      name: "tamiz-picker",
      onMount: (container) =>
        render(
          () =>
            ContentApp({
              element: selectedElement,
              format: barFormat,
              onAction: (action) => dispatcher.dispatch(action),
              onToastReady: (api) => {
                showToastApi = api;
              },
              visible: barVisible,
            }),
          container
        ),
      onRemove: (dispose) => {
        dispose?.();
      },
      position: "overlay",
    });

    ui.mount();

    // 8. Dark mode.
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function applyDarkMode() {
      const host = ui.shadowHost;
      if (host) {
        host.classList.toggle("dark", darkQuery.matches);
      }
    }
    applyDarkMode();
    darkQuery.addEventListener("change", applyDarkMode);

    // 9. Event listeners — thin delegation to core.
    ctx.addEventListener(document, "keydown", (e) => {
      handleKeydown(e as KeyboardEvent, {
        dispatcher,
        getActiveElement: () => document.activeElement,
        getCurrentFormat: barFormat,
        machine: core.machine,
        registry: core.registry,
        shadowHost: ui.shadowHost,
      });
    });

    ctx.addEventListener(document, "mousemove", (e) => {
      if (core.machine.getState() === "HIGHLIGHTING") {
        const target = (e as MouseEvent).target as Element;
        if (target && target !== document.documentElement) {
          core.machine.dispatch({ target, type: "MOUSEMOVE" });
        }
      }
    });

    ctx.addEventListener(document, "click", (e) => {
      if (core.machine.getState() === "HIGHLIGHTING") {
        const target = (e as MouseEvent).target as Element;
        if (target && target !== document.documentElement) {
          e.preventDefault();
          e.stopPropagation();
          core.machine.dispatch({ target, type: "CLICK" });
        }
      }
    });

    ctx.addEventListener(
      window,
      "scroll",
      () => {
        if (core.machine.getState() === "SELECTED") {
          dispatcher.dispatch({ type: "SCROLL" });
        }
      },
      { passive: true }
    );

    ctx.addEventListener(
      window,
      "resize",
      () => {
        if (core.machine.getState() === "SELECTED") {
          dispatcher.dispatch({ type: "RESIZE" });
        }
      },
      { passive: true }
    );

    // 10. Runtime messages.
    onMessage((message) => {
      if (message.type === "INVOKE_PICKER") {
        dispatcher.dispatch(
          message.format
            ? { format: message.format, type: "INVOKE" }
            : { type: "INVOKE" }
        );
      }
      return Promise.resolve();
    });

    // 11. Announce readiness.
    try {
      await sendMessage({ type: "CONTENT_READY" });
    } catch {
      /* Background may be unavailable on some tabs — silently ignore. */
    }
  },
  matches: ["<all_urls>"],
});
