import Crosshair from "lucide-solid/icons/crosshair";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { browser } from "wxt/browser";
import IconRaw from "../../assets/icon.svg?raw";
import { Button } from "../../components/ui/button.tsx";
import { Select } from "../../components/ui/select.tsx";
import "../../styles/content.css";

// Strip the outer <svg> wrapper — attributes are applied on the JSX element
// below. Single source of truth remains src/assets/icon.svg.
const iconInner = IconRaw.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

/**
 * Inline SVG icon component.
 *
 * Uses ?raw import + innerHTML instead of Vite's ?component suffix because
 * vite-plugin-solid does not resolve ?component SVG imports in the vitest
 * environment. The ?component suffix works in production builds (Vite/Rollup)
 * but returns a data-URL string in vitest, causing "Comp is not a function".
 * This approach works in both environments while keeping icon.svg as the
 * single source of truth.
 */
const Icon = (props: {
  class?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) => (
  <svg
    aria-hidden={props["aria-hidden"]}
    class={props.class}
    fill="none"
    height="1024"
    innerHTML={iconInner}
    viewBox="0 0 1024 1024"
    width="1024"
    xmlns="http://www.w3.org/2000/svg"
  />
);

const FORMAT_OPTIONS = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

/**
 * Send INVOKE_PICKER to the active tab's content script via background relay.
 */
async function invokePicker(format: "markdown" | "html"): Promise<void> {
  await browser.runtime.sendMessage({ format, type: "INVOKE_PICKER" });
}

/**
 * Popup entry point.
 *
 * Compact configuration panel with format selector and Capture button.
 * Paper & Ink visual world: warm ground, ghost buttons, macOS density.
 */
export function App() {
  const [format, setFormat] = createSignal<"markdown" | "html">("markdown");

  const handleCapture = async () => {
    await invokePicker(format());
    window.close();
  };

  return (
    <div class="w-[280px] bg-ground p-3 font-sans text-text">
      <div class="mb-0.5 flex items-center gap-1.5">
        <Icon aria-hidden="true" class="size-[18px]" />
        <h1 class="font-semibold text-[14px] text-text">Tamiz</h1>
      </div>
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
          onChange={(value) => setFormat(value as "markdown" | "html")}
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
