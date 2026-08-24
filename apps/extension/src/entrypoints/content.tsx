import { browser } from "wxt/browser";
import { injectScript } from "wxt/utils/inject-script";
import { composeActions } from "../core/actions/composer.ts";
import { createPickerCore } from "../core/index.ts";
import { handleKeydown } from "../core/keyboard/handler.ts";
import type { PickerStateMachine } from "../core/machine/picker.ts";
import { isSelectable } from "../core/picker-filter.ts";
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
 * Remove `.tamiz-excluded` CSS class from all elements that carry it.
 *
 * Called when the picker flow ends or exclusion mode is deactivated to
 * prevent stale visual artifacts on the page.
 *
 * @public
 */
export function clearExcludedClasses(): void {
  for (const el of document.querySelectorAll(".tamiz-excluded")) {
    el.classList.remove("tamiz-excluded");
  }
}

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

  if (!isSelectable(target)) {
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
      outline: 2px solid var(--tz-accent, #2563eb) !important;
      outline-offset: 2px;
      background-color: rgba(37, 99, 235, 0.12) !important;
    }
    .tamiz-hover {
      z-index: 2147483647 !important;
      outline: 2px dashed var(--tz-accent-bright, #3b82f6) !important;
      outline-offset: 2px;
      background-color: rgba(59, 130, 246, 0.08) !important;
    }
    .tamiz-excluded {
      outline: 2px solid var(--tz-state-error, #dc2626) !important;
      outline-offset: 2px;
      opacity: 0.4 !important;
      transition:
        opacity var(--tz-duration-fast, 120ms) var(--tz-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
        outline-color var(--tz-duration-fast, 120ms) var(--tz-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
    }
    .tamiz-exclusion-hover {
      outline: 2px dashed var(--tz-state-error, #dc2626) !important;
      outline-offset: 2px;
      opacity: 0.6 !important;
    }
    .tamiz-exclusion-cursor,
    .tamiz-exclusion-cursor *,
    .tamiz-exclusion-cursor *::before,
    .tamiz-exclusion-cursor *::after {
      cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Synchronize the crosshair cursor class on `document.documentElement`
 * with the current exclusion mode state.
 *
 * When exclusion mode is active, all elements on the page receive a
 * `crosshair` cursor via the `.tamiz-exclusion-cursor` CSS class.
 * The class is removed when exclusion mode deactivates.
 *
 * @param isExclusion - Whether exclusion mode is currently active.
 *
 * @public
 */
export function syncExclusionCursor(isExclusion: boolean): void {
  if (isExclusion) {
    document.documentElement.classList.add("tamiz-exclusion-cursor");
  } else {
    document.documentElement.classList.remove("tamiz-exclusion-cursor");
  }
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
      { createEffect, createMemo, createSignal },
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
    const [isExclusionMode, setExclusionMode] = createSignal(false);
    const [excludedElements, setExcludedElements] = createSignal<Set<Element>>(
      new Set<Element>()
    );
    let showToastApi: ((message: string) => void) | null = null;
    let exclusionHoverTarget: Element | null = null;
    const pillVisible = createMemo(
      () => indicatorVisible() || isExclusionMode()
    );

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
          setExclusionMode(false);
          clearExcludedClasses();
          setExcludedElements(new Set<Element>());
          // Clean up exclusion hover feedback.
          if (exclusionHoverTarget) {
            exclusionHoverTarget.classList.remove("tamiz-exclusion-hover");
            exclusionHoverTarget = null;
          }
        } else if (state === "HIGHLIGHTING") {
          // RESTART transitions to HIGHLIGHTING — clear the selected element
          // signal so the bar disappears and the user can hover freely.
          setSelectedElement(null);
          setExclusionMode(false);
          clearExcludedClasses();
          setExcludedElements(new Set<Element>());
          // Clean up exclusion hover feedback.
          if (exclusionHoverTarget) {
            exclusionHoverTarget.classList.remove("tamiz-exclusion-hover");
            exclusionHoverTarget = null;
          }
        }
        // Synchronize visual feedback with picker state.
        syncVisualFeedback(state, core.scrim, setIndicatorVisible);
        // Synchronize main-world blocking with picker state.
        if (blockingAvailable) {
          syncBlockingState(state, blockingChannel);
        }
      },
    });

    // Disable the main-world blocker while exclusion mode is active so
    // clicks reach the content-script click handler instead of being
    // intercepted. Re-enable when exclusion mode is turned off.
    if (blockingAvailable) {
      createEffect(() => {
        if (isExclusionMode()) {
          blockingChannel.send({ type: TAMIZ_BLOCKING_DISABLE });
        } else {
          // Clean up exclusion hover feedback when exiting exclusion mode.
          if (exclusionHoverTarget) {
            exclusionHoverTarget.classList.remove("tamiz-exclusion-hover");
            exclusionHoverTarget = null;
          }
          if (core.machine.getState() === "SELECTED") {
            blockingChannel.send({ type: TAMIZ_BLOCKING_ENABLE });
          }
        }
      });
    }

    // Apply crosshair cursor during exclusion mode.
    createEffect(() => {
      syncExclusionCursor(isExclusionMode());
    });

    // 6. Compose action handlers (wires SolidJS signal setters).
    const { dispatcher } = composeActions({
      format: barFormat,
      getExcludedElements: excludedElements,
      getExclusionMode: isExclusionMode,
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
      setExcludedElements,
      setExclusionMode,
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
                isExclusionMode,
                onAction: (action) => dispatcher.dispatch(action),
                onToastReady: (api) => {
                  showToastApi = api;
                },
                registry: core.registry,
                visible: barVisible,
              })}
              <SelectionIndicator
                isExclusionMode={isExclusionMode}
                onDismiss={handleDismiss}
                visible={pillVisible}
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
        isExclusionMode,
        machine: core.machine,
        registry: core.registry,
        shadowHost: ui.shadowHost,
      });
    });

    ctx.addEventListener(document, "mousemove", (e) => {
      const state = core.machine.getState();
      const target = (e as MouseEvent).target as Element;
      const selectable =
        target && target !== document.documentElement && isSelectable(target);

      if (selectable && state === "HIGHLIGHTING") {
        core.machine.dispatch({ target, type: "MOUSEMOVE" });
      } else if (
        selectable &&
        state === "SELECTED" &&
        isExclusionMode() &&
        target !== selectedElement() &&
        selectedElement()?.contains(target)
      ) {
        // Track hover directly during exclusion mode since the machine
        // ignores MOUSEMOVE in SELECTED state.
        if (exclusionHoverTarget !== target && exclusionHoverTarget) {
          exclusionHoverTarget.classList.remove("tamiz-exclusion-hover");
        }
        if (exclusionHoverTarget !== target) {
          exclusionHoverTarget = target;
          target.classList.add("tamiz-exclusion-hover");
        }
      }

      // Clear exclusion hover when the mouse is not over a valid excludable element.
      if (exclusionHoverTarget) {
        const isExcludable =
          selectable &&
          state === "SELECTED" &&
          isExclusionMode() &&
          target !== selectedElement() &&
          selectedElement()?.contains(target);

        if (!isExcludable) {
          exclusionHoverTarget.classList.remove("tamiz-exclusion-hover");
          exclusionHoverTarget = null;
        }
      }
    });

    // Exclusion-mode click: when in exclusion mode, clicks toggle elements.
    ctx.addEventListener(document, "click", (e) => {
      if (!isExclusionMode()) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const mouse = e as MouseEvent;
      const target = document.elementFromPoint(mouse.clientX, mouse.clientY);
      if (
        target &&
        target !== document.documentElement &&
        target !== selectedElement() &&
        isSelectable(target) &&
        selectedElement()?.contains(target)
      ) {
        const prev = excludedElements();
        const next = new Set(prev);
        if (next.has(target)) {
          next.delete(target);
          target.classList.remove("tamiz-excluded");
        } else {
          next.add(target);
          target.classList.add("tamiz-excluded");
        }
        setExcludedElements(next);
        setExclusionMode(false);
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
    } else {
      // Fallback: when the main-world blocker is unavailable (e.g. CSP blocks
      // script injection), intercept clicks directly from the content script.
      // This does NOT block page interactions (links still navigate), but
      // allows the picker to function for element selection.
      ctx.addEventListener(document, "click", (e) => {
        if (core.machine.getState() !== "HIGHLIGHTING") {
          return;
        }
        const mouse = e as MouseEvent;
        const target = document.elementFromPoint(mouse.clientX, mouse.clientY);
        if (
          target &&
          target !== document.documentElement &&
          isSelectable(target)
        ) {
          core.machine.dispatch({ target, type: "CLICK" });
        }
      });
    }

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
