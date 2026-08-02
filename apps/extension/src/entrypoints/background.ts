import { defineBackground } from "wxt/utils/define-background";
import { onMessage } from "../lib/messaging";

/**
 * Background script entry point.
 *
 * Handles clipboard operations and file downloads
 * requested by the content script.
 */
export default defineBackground({
  main() {
    onMessage(async (message, _sender) => {
      switch (message.type) {
        case "COPY_TO_CLIPBOARD":
          try {
            await navigator.clipboard.writeText(message.content);
          } catch (err) {
            console.error("Failed to copy to clipboard:", err);
          }
          break;

        case "DOWNLOAD_FILE": {
          const blob = new Blob([message.content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${message.filename}.md`;
          a.click();
          URL.revokeObjectURL(url);
          break;
        }

        default:
          break;
      }
    });
  },
});
