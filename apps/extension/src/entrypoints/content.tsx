import { browser } from "wxt/browser";
import { injectScript } from "wxt/utils/inject-script";
import { composeActions } from "../core/actions/composer.ts";
import { createPickerCore } from "../core/index.ts";
import { handleKeydown } from "../core/keyboard/handler.ts";
import type { PickerStateMachine } from "../core/machine/picker.ts";
import type { ScrimController } from "../core/scrim.ts";
import { extractContent } from "../lib/extract-content.ts";
import { PostMessageChannel } from "../lib/messaging/adapters/postmessage.ts";
import { RuntimeChannel } from "../lib/messaging/adapters/runtime.ts";
import {
  READY_TIMEOUT_MS,
  TAMIZ_BLOCKING_CLICK,
  TAMIZ_BLOCKING_DISABLE,
  TAMIZ_BLOCKING_ENABLE,
  TAMIZ_BLOCKING_READY,
  TAMIZ_BLOCKING_SHUTDOWN,
  TAMIZ_UI_MARKER,
} from "../lib/messaging/constants.ts";
import type { BlockingClickMessage } from "../lib/messaging/types.ts";

// ---------------------------------------------------------------------------
// Content-script helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Process a relayed click from the main-world blocker.
 *
 * Resolves the target element via `elementFromPoint` using the coordinates
 * carried by the `tamiz:blocking-click` message, then dispatches a `CLICK`
 * event to the picker state machine.
 *
 * @param event   - The `tamiz:blocking-click` message with `{ clientX, clientY }`.
 * @param machine - The picker state machine instance.
 *
 * @public
 */
export function handleRelayedClick(
  event: BlockingClickMessage,
  machine: PickerStateMachine
): void {
  if (machine.getState() !== "HIGHLIGHTING") {
    return;
  }

  const { clientX, clientY } = event;
  const target = document.elementFromPoint(clientX, clientY);

  // Ignore clicks on the document root (background, outside viewport, etc.)
  if (!target || target === document.documentElement) {
    return;
  }

  machine.dispatch({ target, type: "CLICK" });
}

/**
 * Synchronize main-world blocking state with the picker state machine.
 *
 * Dispatches `tamiz:blocking-enable` on HIGHLIGHTING, `tamiz:blocking-disable`
 * on IDLE, and nothing on SELECTED (blocking stays as-is).
 *
 * @param state    - The new picker state.
 * @param channel  - The postMessage channel to the main world.
 *
 * @public
 */
export function syncBlockingState(
  state: string,
  channel: PostMessageChannel
): void {
  if (state === "HIGHLIGHTING") {
    channel.send({ type: TAMIZ_BLOCKING_ENABLE });
  } else if (state === "IDLE") {
    channel.send({ type: TAMIZ_BLOCKING_DISABLE });
  }
  // SELECTED: no-op — blocking remains active through selection.
}

/**
 * Synchronize visual feedback (scrim overlay and instruction pill) with
 * the picker state machine.
 *
 * HIGHLIGHTING shows both scrim and pill. SELECTED hides the pill but
 * keeps the scrim to maintain visual focus on the selected element.
 * IDLE hides both.
 *
 * @param state              - The new picker state.
 * @param scrim              - The scrim controller for the overlay.
 * @param setIndicatorVisible - Signal setter for the instruction pill.
 *
 * @public
 */
export function syncVisualFeedback(
  state: string,
  scrim: ScrimController,
  setIndicatorVisible: (value: boolean) => void
): void {
  if (state === "HIGHLIGHTING") {
    scrim.show();
    setIndicatorVisible(true);
  } else if (state === "SELECTED") {
    setIndicatorVisible(false);
  } else if (state === "IDLE") {
    scrim.hide();
    setIndicatorVisible(false);
  }
}

/**
 * Inject highlight and hover CSS into the main document.
 *
 * Shadow DOM styles don't reach the host document, so we need to inject
 * the highlight classes directly into the page's `<head>`.
 *
 * @public
 */
export function injectHighlightStyles(): void {
  if (document.getElementById("tamiz-highlight-styles")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "tamiz-highlight-styles";
  style.textContent = `
    .tamiz-highlight {
      z-index: 2147483647 !important;
      box-shadow: 0 0 0 2px #2563eb !important;
      background-color: rgba(37, 99, 235, 0.12) !important;
    }
    .tamiz-hover {
      z-index: 2147483647 !important;
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
    // 1. Configure channels.
    const runtimeChannel = new RuntimeChannel({ browser });
    const blockingChannel = new PostMessageChannel();

    // 2. Inject main-world blocker (fail-open: log and continue if CSP blocks).
    let blockingAvailable = false;
    try {
      await injectScript("/main-world.js");
      // Wait for ready signal via postMessage; mark unavailable after timeout.
      const readyPromise = new Promise<boolean>((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data?.type === TAMIZ_BLOCKING_READY) {
            window.removeEventListener("message", handler);
            resolve(true);
          }
        };
        window.addEventListener("message", handler);
        setTimeout(() => {
          window.removeEventListener("message", handler);
          resolve(false);
        }, READY_TIMEOUT_MS);
      });
      blockingAvailable = await readyPromise;
    } catch {
      console.warn(
        "[tamiz] main-world script injection failed — operating without event blocking"
      );
    }

    // 3. Import SolidJS and UI.
    const [
      { createSignal },
      { render },
      { ContentApp },
      { SelectionIndicator },
    ] = await Promise.all([
      import("solid-js"),
      import("solid-js/web"),
      import("../components/content-ui.tsx"),
      import("../components/selection-indicator.tsx"),
    ]);

    await import("../styles/content.css");

    // 4. Inject highlight CSS into host document.
    injectHighlightStyles();

    // 5. Create UI signals.
    const [selectedElement, setSelectedElement] = createSignal<Element | null>(
      null
    );
    const [barFormat, setBarFormat] = createSignal<"markdown" | "html">(
      "markdown"
    );
    const [barVisible, setBarVisible] = createSignal(false);
    const [indicatorVisible, setIndicatorVisible] = createSignal(false);
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
        // Synchronize visual feedback with picker state.
        syncVisualFeedback(state, core.scrim, setIndicatorVisible);
        // Synchronize main-world blocking with picker state.
        if (blockingAvailable) {
          syncBlockingState(state, blockingChannel);
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
      sendMessage: (msg) => runtimeChannel.send(msg),
      setBarVisible,
      setFormat: setBarFormat,
      setSelectedElement,
      get showToast() {
        return showToastApi;
      },
    });

    // 7. Mount shadow root UI.
    const handleDismiss = () => dispatcher.dispatch({ type: "DISMISS" });
    const ui = await createShadowRootUi(ctx, {
      isolateEvents: ["mousemove", "keydown"],
      name: "tamiz-picker",
      onMount: (container) =>
        render(
          () => (
            <>
              {ContentApp({
                element: selectedElement,
                format: barFormat,
                onAction: (action) => dispatcher.dispatch(action),
                onToastReady: (api) => {
                  showToastApi = api;
                },
                visible: barVisible,
              })}
              <SelectionIndicator
                onDismiss={handleDismiss}
                visible={indicatorVisible}
              />
            </>
          ),
          container
        ),
      onRemove: (dispose) => {
        dispose?.();
      },
      position: "overlay",
    });

    ui.mount();

    // Mark shadow host so the main-world blocker excludes UI clicks.
    ui.shadowHost?.setAttribute(TAMIZ_UI_MARKER, "");

    // Disable blocking and clean up scrim when the content script unloads.
    ctx.onInvalidated(() => {
      core.scrim.dispose();
      if (blockingAvailable) {
        // Send shutdown to clear the install guard — allows fresh re-injection
        // when the extension is reloaded without a page refresh.
        blockingChannel.send({ type: TAMIZ_BLOCKING_SHUTDOWN });
        blockingChannel.send({ type: TAMIZ_BLOCKING_DISABLE });
      }
    });

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

    // Relay blocked clicks from the main-world blocker. The main-world script
    // intercepts clicks during HIGHLIGHTING and posts coordinate payloads;
    // we resolve the target via elementFromPoint and dispatch CLICK to the machine.
    if (blockingAvailable) {
      blockingChannel.onMessage((msg) => {
        if (msg.type === TAMIZ_BLOCKING_CLICK) {
          handleRelayedClick(msg as BlockingClickMessage, core.machine);
        }
        return Promise.resolve();
      });
    }

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
    runtimeChannel.onMessage((message) => {
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
      await runtimeChannel.send({ type: "CONTENT_READY" });
    } catch {
      /* Background may be unavailable on some tabs — silently ignore. */
    }
  },
  matches: ["<all_urls>"],
});
