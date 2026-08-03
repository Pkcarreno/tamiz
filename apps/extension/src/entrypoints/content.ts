import "../styles/content.css";
import { browser } from "@wxt-dev/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { sendMessage } from "../lib/messaging.ts";
import { PickerStateMachine } from "../lib/picker.ts";

/** CSS class applied to highlighted elements */
const HIGHLIGHT_CLASS = "tamiz-highlight";

/**
 * Highlight an element.
 */
function highlight(element: Element): void {
  element.classList.add(HIGHLIGHT_CLASS);
}

/**
 * Unhighlight an element.
 */
function _unhighlight(element: Element): void {
  element.classList.remove(HIGHLIGHT_CLASS);
}

/**
 * Clear all highlights.
 */
function clearHighlights(): void {
  for (const el of document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)) {
    el.classList.remove(HIGHLIGHT_CLASS);
  }
}

/**
 * Content script entry point.
 *
 * Implements the element picker state machine and communicates
 * with the background script for clipboard/file operations.
 */
export default defineContentScript({
  main() {
    const machine = new PickerStateMachine({
      onCopy: async (content) => {
        await sendMessage({ content, type: "COPY_TO_CLIPBOARD" });
      },
      onDownload: (content, filename) => {
        sendMessage({ content, filename, type: "DOWNLOAD_FILE" });
      },
      onElementSelected: (element) => {
        clearHighlights();
        highlight(element);
      },
      onStateChange: (state) => {
        if (state === "IDLE") {
          clearHighlights();
        }
      },
    });

    // Keyboard shortcut to invoke picker
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
          e.preventDefault();
          e.stopPropagation();
          machine.dispatch({ target, type: "CLICK" });
        }
      }
    });

    // Listen for messages from popup/background
    browser.runtime.onMessage.addListener((message: unknown) => {
      const msg = message as { type: string };
      if (msg.type === "INVOKE_PICKER") {
        machine.dispatch({ type: "INVOKE" });
      }
    });
  },
  matches: ["<all_urls>"],
});
