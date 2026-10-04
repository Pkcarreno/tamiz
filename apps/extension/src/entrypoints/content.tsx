import { browser } from "wxt/browser";
import { injectScript } from "wxt/utils/inject-script";
import { createPageAdornment } from "../core/adornment/adornment.ts";
import { handleKeydown } from "../core/keyboard/handler.ts";
import { isSelectable } from "../core/picker-filter.ts";
import {
  createPickerSession,
  type PickerSession,
} from "../core/session/session.ts";
import { extractContent } from "../lib/extract-content.ts";
import { isClipboardAvailable } from "../lib/feature-detection.ts";
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
import { readThemePreference } from "../lib/storage.ts";

// ---------------------------------------------------------------------------
// Content-script helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Process a relayed click from the main-world blocker.
 *
 * Resolves the target element via `elementFromPoint` using the coordinates
 * carried by the `tamiz:blocking-click` message, then dispatches a `SELECT`
 * action to the picker session.
 *
 * @param event   - The `tamiz:blocking-click` message with `{ clientX, clientY }`.
 * @param session - The picker session instance.
 *
 * @public
 */
export function handleRelayedClick(
  event: BlockingClickMessage,
  session: PickerSession
): void {
  if (session.getSnapshot().state !== "HIGHLIGHTING") {
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

  session.dispatch({ target, type: "SELECT" });
}

/**
 * Synchronize main-world blocking state with the picker session state.
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
 * Wait for the main-world blocker to signal ready via postMessage.
 *
 * Resolves true if `tamiz:blocking-ready` is received within `timeoutMs`.
 * Resolves false on timeout (e.g. CSP blocked the injected script).
 *
 * @param channel   - The postMessage channel to listen on.
 * @param timeoutMs - Max time to wait in milliseconds.
 * @returns Whether the blocker signaled readiness.
 */
function waitForBlockerReady(
  channel: PostMessageChannel,
  timeoutMs = READY_TIMEOUT_MS
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    channel.onMessage((msg) => {
      if (msg.type === TAMIZ_BLOCKING_READY && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(true);
      }
      return Promise.resolve();
    });
  });
}

/**
 * Apply user theme preference to the shadow host element.
 *
 * @public
 */
export function applyThemePreference(
  preference: "auto" | "dark" | "light",
  host: HTMLElement | undefined
): void {
  if (!host) {
    return;
  }
  host.classList.toggle("dark", preference === "dark");
}

export default defineContentScript({
  cssInjectionMode: "ui",

  async main(ctx) {
    // 1. Set up messaging channels.
    const runtimeChannel = new RuntimeChannel({ browser });
    const blockingChannel = new PostMessageChannel();

    // 2. Inject main-world click blocker script and wait for readiness.
    let blockingAvailable = false;
    try {
      const readyPromise = waitForBlockerReady(blockingChannel);
      await injectScript("/main-world.js", { keepInDom: true });
      blockingAvailable = await readyPromise;
    } catch {
      // CSP blocked script injection (or another error occurred).
      // Fallback: blockingAvailable stays false; content-script click listener
      // handles element selection.
      blockingAvailable = false;
    }

    // 3. Dynamically import heavy UI libraries in parallel.
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

    // 4. Create host page adornment module.
    const adornment = createPageAdornment();

    let showToastApi: ((message: string) => void) | null = null;

    // 5. Create deep session module.
    const session = createPickerSession({
      clipboardAvailable: isClipboardAvailable,
      htmlConverter: {
        convert: async (source, options) => {
          const { convert } = await import("@tamiz/html-converter");
          return convert(source, options);
        },
        extractContent,
      },
      sendMessage: (msg) => runtimeChannel.send(msg),
      get showToast() {
        return showToastApi;
      },
    });

    // 6. Connect reactive UI signals and adornment from atomic session snapshots.
    const [snapshot, setSnapshot] = createSignal(session.getSnapshot());
    session.subscribe((snap) => {
      setSnapshot(snap);
      adornment.update(snap);
    });
    adornment.update(session.getSnapshot());

    const isExclusionMode = () => snapshot().isExclusionMode;
    const pillVisible = createMemo(
      () => snapshot().state === "HIGHLIGHTING" || snapshot().isExclusionMode
    );

    // Synchronize main-world blocker state with session.
    if (blockingAvailable) {
      createEffect(() => {
        const snap = snapshot();
        if (snap.isExclusionMode) {
          blockingChannel.send({ type: TAMIZ_BLOCKING_DISABLE });
        } else if (snap.state === "SELECTED" || snap.state === "HIGHLIGHTING") {
          blockingChannel.send({ type: TAMIZ_BLOCKING_ENABLE });
        } else if (snap.state === "IDLE") {
          blockingChannel.send({ type: TAMIZ_BLOCKING_DISABLE });
        }
      });
    }

    // 7. Mount shadow root UI.
    const handleDismiss = () => {
      session.dispatch({ type: "DISMISS" });
    };
    const ui = await createShadowRootUi(ctx, {
      isolateEvents: ["mousemove", "keydown"],
      name: "tamiz-picker",
      onMount: (container) =>
        render(
          () => (
            <>
              {ContentApp({
                onAction: (action) => {
                  session.dispatch(action);
                },
                onToastReady: (api) => {
                  showToastApi = api;
                },
                registry: session.registry,
                snapshot,
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

    // Disable blocking and clean up adornment when the content script unloads.
    ctx.onInvalidated(() => {
      adornment.dispose();
      if (blockingAvailable) {
        // Send shutdown to clear the install guard — allows fresh re-injection
        // when the extension is reloaded without a page refresh.
        blockingChannel.send({ type: TAMIZ_BLOCKING_SHUTDOWN });
        blockingChannel.send({ type: TAMIZ_BLOCKING_DISABLE });
      }
    });

    // 8. Dark mode — read user preference, fall back to system detection.
    const preference = await readThemePreference();
    const host = ui.shadowHost;

    if (preference === "auto") {
      const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
      function applyDarkMode() {
        if (host) {
          host.classList.toggle("dark", darkQuery.matches);
        }
      }
      applyDarkMode();
      darkQuery.addEventListener("change", applyDarkMode);
    } else {
      applyThemePreference(preference, host);
    }

    // 9. Event listeners — thin delegation to session and adornment.
    ctx.addEventListener(document, "keydown", (e) => {
      handleKeydown(e as KeyboardEvent, {
        getActiveElement: () => document.activeElement,
        session,
      });
    });

    ctx.addEventListener(document, "mousemove", (e) => {
      adornment.setHoverTarget((e as MouseEvent).target as Element);
    });

    // Exclusion-mode click and fallback selection click.
    ctx.addEventListener(document, "click", (e) => {
      const snap = session.getSnapshot();
      if (snap.isExclusionMode) {
        e.preventDefault();
        e.stopPropagation();
        const mouse = e as MouseEvent;
        const target = document.elementFromPoint(mouse.clientX, mouse.clientY);
        if (target) {
          session.dispatch({ target, type: "TOGGLE_EXCLUSION_ELEMENT" });
        }
        return;
      }

      if (!blockingAvailable && snap.state === "HIGHLIGHTING") {
        const mouse = e as MouseEvent;
        const target = document.elementFromPoint(mouse.clientX, mouse.clientY);
        if (
          target &&
          target !== document.documentElement &&
          isSelectable(target)
        ) {
          session.dispatch({ target, type: "SELECT" });
        }
      }
    });

    // Relay blocked clicks from the main-world blocker.
    if (blockingAvailable) {
      blockingChannel.onMessage((msg) => {
        if (msg.type === TAMIZ_BLOCKING_CLICK) {
          handleRelayedClick(msg as BlockingClickMessage, session);
        }
        return Promise.resolve();
      });
    }

    // 10. Runtime messages.
    runtimeChannel.onMessage((message) => {
      if (message.type === "INVOKE_PICKER") {
        session.dispatch(
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
