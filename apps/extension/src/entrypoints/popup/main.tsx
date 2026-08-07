import Crosshair from "lucide-solid/icons/crosshair";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { browser } from "wxt/browser";
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
 * Compact configuration panel with format selector and Capture button.
 * Paper & Ink visual world: warm ground, ghost buttons, macOS density.
 */
function App() {
  const [format, setFormat] = createSignal<"markdown" | "raw">("markdown");

  const handleCapture = async () => {
    await invokePicker(format());
    window.close();
  };

  return (
    <div class="w-[280px] bg-ground p-3 font-sans text-text">
      <h1 class="mb-0.5 font-semibold text-[14px] text-text">Tamiz</h1>
      <p class="mb-3 text-[11px] text-text-secondary leading-[1.4]">
        Select an element to capture clean content.
      </p>

      <div class="mb-3">
        <label
          class="mb-1 block font-medium text-[10px] text-text-tertiary uppercase tracking-[0.06em]"
          for="format-select"
        >
          Format
        </label>
        <Select
          id="format-select"
          // biome-ignore lint/performance/noJsxPropsBind: popup renders once
          onChange={(value) => setFormat(value as "markdown" | "raw")}
          options={FORMAT_OPTIONS}
          value={format()}
          variant="standard"
        />
      </div>

      {/* biome-ignore lint/performance/noJsxPropsBind: popup renders once */}
      <Button class="w-full gap-1.5" onClick={handleCapture} size="sm">
        <Crosshair size={13} />
        Capture
      </Button>
    </div>
  );
}

const root = document.getElementById("app");
if (root) {
  render(() => <App />, root);
}
