import { browser } from "@wxt-dev/browser";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Button } from "../../components/ui/button.tsx";
import { Select } from "../../components/ui/select.tsx";
import "../../styles/content.css";

const FORMAT_OPTIONS = [
  { label: "Markdown", value: "markdown" },
  { label: "Raw HTML", value: "raw" },
];

/**
 * Send INVOKE_PICKER to the active tab's content script via background relay.
 */
async function invokePicker(format: "markdown" | "raw"): Promise<void> {
  await browser.runtime.sendMessage({ format, type: "INVOKE_PICKER" });
}

/**
 * Popup entry point.
 *
 * Provides format configuration and a Capture button.
 * The Capture button sends INVOKE_PICKER through the background relay
 * and closes the popup.
 */
function App() {
  const [format, setFormat] = createSignal<"markdown" | "raw">("markdown");

  const handleCapture = async () => {
    await invokePicker(format());
    window.close();
  };

  return (
    <div class="tz-popup">
      <h1 class="tz-popup__title">Tamiz</h1>
      <p class="tz-popup__description">
        Configure your capture settings, then click Capture to select an
        element.
      </p>

      <div class="tz-popup__field">
        <label class="tz-popup__label" for="format-select">
          Output format
        </label>
        <Select
          id="format-select"
          // biome-ignore lint/performance/noJsxPropsBind: popup renders once
          onChange={(value) => setFormat(value as "markdown" | "raw")}
          options={FORMAT_OPTIONS}
          value={format()}
        />
      </div>

      {/* biome-ignore lint/performance/noJsxPropsBind: popup renders once */}
      <Button class="tz-popup__capture-btn" onClick={handleCapture}>
        Capture
      </Button>
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(() => <App />, root);
}
