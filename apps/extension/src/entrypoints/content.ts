import { browser } from "wxt/browser";
import { composeActions } from "../core/actions/composer.ts";
import { createHighlightController } from "../core/highlight.ts";
import { handleKeydown } from "../core/keyboard/handler.ts";
import { PickerStateMachine } from "../core/machine/picker.ts";
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
  // Hex values are hardcoded because these styles are injected into the host
  // page (not Shadow DOM), so CSS variables are unavailable. They are kept in
  // sync with design tokens defined in content.css :root:
  //   #2563eb            — --tz-accent (light)
  //   rgba(37,99,235,.12) — --tz-accent-dim (light)
  //   #3b82f6            — --tz-accent-bright (light)
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
 * Implements the element picker state machine with a floating action bar
 * rendered inside a Shadow DOM for style and event isolation.
 *
 * All SolidJS and client-only imports are deferred inside {@link main} to
 * avoid WXT's SSR-like build evaluation triggering server-side errors.
 */
export default defineContentScript({
  cssInjectionMode: "ui",
  async main(ctx) {
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
    const [barFormat, setBarFormat] = createSignal<"markdown" | "html">(
      "markdown"
    );
    const [barVisible, setBarVisible] = createSignal(false);

    // Toast API reference — set via ContentApp's onToastReady callback.
    // The getter on the composeActions deps object reads this at call time so
    // toasts fire once the Shadow DOM UI mounts and registers the toast API.
    let showToastApi: ((message: string) => void) | null = null;

    // Highlight controller — manages hover, selection, and highlight state.
    const highlight = createHighlightController();

    // State machine — created before the shadow root UI so that onMount can
    // capture `machine` in its closure.
    const machine = new PickerStateMachine({
      onElementSelected: (element) => {
        highlight.selectElement(element);
        setSelectedElement(element);
        setBarVisible(true);
      },
      onHover: (element) => {
        highlight.setHoverTarget(element);
      },
      onStateChange: (state) => {
        if (state === "IDLE") {
          highlight.clearAll();
          setBarVisible(false);
          setSelectedElement(null);
        }
      },
    });

    // Centralized action dispatcher: all user actions (UI buttons, keyboard
    // shortcuts, scroll/resize, runtime messages) route through this single
    // pipeline. The composer wires each action type to its side-effect handler.
    const { dispatcher } = composeActions({
      format: barFormat,
      htmlConverter: {
        convert: async (html, { strategy }) => {
          const { convert } = await import("@tamiz/html-converter");
          return convert(html, { strategy: strategy as never });
        },
        extractContent,
      },
      machine,
      sendMessage,
      setBarVisible,
      setFormat: setBarFormat,
      setSelectedElement,
      // Getter so the handler always sees the latest toast API once mounted.
      get showToast() {
        return showToastApi;
      },
    });

    // Create shadow root UI for the floating bar and toasts.
    //
    // WXT's createShadowRootUi returns a Promise that resolves to a UI object
    // with a `mount()` method. The onMount callback receives the container
    // div inside the shadow root and is responsible for rendering the SolidJS
    // app into it. The returned disposer is stored via onRemove for cleanup.
    //
    // "click" is intentionally excluded from isolateEvents: SolidJS uses
    // document-level event delegation for onClick, and stopPropagation on the
    // shadow root would prevent bar button clicks from reaching the delegated
    // listener. Click isolation is still handled by checking the machine state
    // (only HIGHLIGHTING processes clicks) and the shadow host being 0×0
    // during that state.
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

    // Dark mode: detect prefers-color-scheme and toggle .dark on shadow root host.
    // CSS custom properties pierce shadow DOM, so .dark on :root inside the
    // shadow root activates the dark token set from content.css.
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function applyDarkMode() {
      const host = ui.shadowHost;
      if (host) {
        host.classList.toggle("dark", darkQuery.matches);
      }
    }
    applyDarkMode();
    darkQuery.addEventListener("change", applyDarkMode);

    // Keyboard shortcuts resolved through the keyboard registry.
    ctx.addEventListener(document, "keydown", (e) => {
      handleKeydown(e as KeyboardEvent, {
        dispatcher,
        getActiveElement: () => document.activeElement,
        getCurrentFormat: barFormat,
        machine,
        shadowHost: ui.shadowHost,
      });
    });

    // Mouse events for element selection
    ctx.addEventListener(document, "mousemove", (e) => {
      if (machine.getState() === "HIGHLIGHTING") {
        const target = (e as MouseEvent).target as Element;
        if (target && target !== document.documentElement) {
          machine.dispatch({ target, type: "MOUSEMOVE" });
        }
      }
    });

    // Click events for element selection — only during HIGHLIGHTING.
    // SELECTED is excluded so clicking elsewhere does NOT re-select
    // (capture lock: first click is definitive; re-invoke to select again).
    ctx.addEventListener(document, "click", (e) => {
      if (machine.getState() === "HIGHLIGHTING") {
        const target = (e as MouseEvent).target as Element;
        if (target && target !== document.documentElement) {
          e.preventDefault();
          e.stopPropagation();
          machine.dispatch({ target, type: "CLICK" });
        }
      }
    });

    // Scroll/resize repositioning
    ctx.addEventListener(
      window,
      "scroll",
      () => {
        if (machine.getState() === "SELECTED") {
          dispatcher.dispatch({ type: "SCROLL" });
        }
      },
      { passive: true }
    );

    ctx.addEventListener(
      window,
      "resize",
      () => {
        if (machine.getState() === "SELECTED") {
          dispatcher.dispatch({ type: "RESIZE" });
        }
      },
      { passive: true }
    );

    // Listen for messages from popup/background
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

    // Announce readiness so the background can flush any pending INVOKE_PICKER
    // that arrived before the content script registered its message listener.
    // Guarded so setup failures never break the picker on tabs where the
    // background page is unavailable.
    try {
      await sendMessage({ type: "CONTENT_READY" });
    } catch {
      /* Background may be unavailable on some tabs — silently ignore. */
    }
  },
  matches: ["<all_urls>"],
});
