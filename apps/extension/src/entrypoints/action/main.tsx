import { convert } from "@tamiz/html-converter";
import { markdownStrategy } from "@tamiz/html-converter/strategies/markdown";
import { rawStrategy } from "@tamiz/html-converter/strategies/raw";
import { browser } from "@wxt-dev/browser";
import { render } from "solid-js/web";
import { ActionBar } from "../../components/action-bar";

/**
 * Popup entry point.
 *
 * Provides the action bar UI for format selection and copy/download.
 */
function App() {
  let selectedFormat: "markdown" | "raw" = "markdown";

  const handleCopy = async () => {
    // Get selected element from active tab
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      return;
    }

    const results = await browser.scripting.executeScript({
      func: () => {
        const el = document.querySelector(".tamiz-highlight");
        return el?.outerHTML ?? "";
      },
      target: { tabId: tab.id },
    });

    const html = results[0]?.result as string;
    if (!html) {
      return;
    }

    const strategy =
      selectedFormat === "markdown" ? markdownStrategy : rawStrategy;
    const content = await convert(html, { strategy });

    await navigator.clipboard.writeText(content);
  };

  const handleDownload = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) {
      return;
    }

    const results = await browser.scripting.executeScript({
      func: () => {
        const el = document.querySelector(".tamiz-highlight");
        return el?.outerHTML ?? "";
      },
      target: { tabId: tab.id },
    });

    const html = results[0]?.result as string;
    if (!html) {
      return;
    }

    const strategy =
      selectedFormat === "markdown" ? markdownStrategy : rawStrategy;
    const content = await convert(html, { strategy });

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content.${selectedFormat === "markdown" ? "md" : "html"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFormatChange = (format: "markdown" | "raw") => {
    selectedFormat = format;
  };

  const handleDismiss = () => {
    window.close();
  };

  const actionBarProps = {
    onCopy: handleCopy,
    onDismiss: handleDismiss,
    onDownload: handleDownload,
    onFormatChange: handleFormatChange,
  };

  return (
    <div class="p-4">
      <h1 class="mb-4 font-bold text-lg">Tamiz</h1>
      <ActionBar {...actionBarProps} />
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(() => <App />, root);
}
