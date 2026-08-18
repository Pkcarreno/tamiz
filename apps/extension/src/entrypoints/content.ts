import { browser } from "wxt/browser";
import { composeActions } from "../core/actions/composer.ts";
import {
  clearHighlights,
  clearHoverHighlight,
  convertElement,
  highlight,
  hoverHighlight,
  injectHighlightStyles,
} from "../lib/content-callbacks.ts";
import { handleKeydown } from "../lib/keyboard/handler.ts";
import {
  type Message,
  onMessage,
  sendMessage,
  setTransport,
} from "../lib/messaging.ts";
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

    // State machine — created before the shadow root UI so that onMount can
    // capture `machine` in its closure.
    let lastHoveredElement: Element | null = null;

    const machine = new PickerStateMachine({
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

    // Centralized action dispatcher: all user actions (UI buttons, keyboard
    // shortcuts, scroll/resize, runtime messages) route through this single
    // pipeline. The composer wires each action type to its side-effect handler.
    const { dispatcher } = composeActions({
      convertElement,
      format: barFormat,
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
