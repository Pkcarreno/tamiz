import { createSignal, type JSX, onMount } from "solid-js";
import { render } from "solid-js/web";

import { RadioGroup } from "../components/ui/radio-group.tsx";
import type { Format } from "../core/keyboard/types.ts";
import { readDefaultFormat, writeDefaultFormat } from "../lib/storage.ts";
import "../styles/options.css";

/**
 * Format options presented in the settings RadioGroup.
 */
const FORMAT_OPTIONS = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

/**
 * Root component for the options page.
 *
 * Reads the stored default format on mount, renders a RadioGroup to let
 * the user change it, and writes the selection back to storage on change.
 * The RadioGroup is disabled until the initial read completes.
 *
 * @public
 */
export function OptionsApp(): JSX.Element {
  const [format, setFormat] = createSignal<Format>("markdown");
  const [loaded, setLoaded] = createSignal(false);

  onMount(async () => {
    const stored = await readDefaultFormat();
    setFormat(stored);
    setLoaded(true);
  });

  async function handleChange(value: string): Promise<void> {
    const next = value as Format;
    setFormat(next);
    await writeDefaultFormat(next);
  }

  return (
    <div class="tz-options">
      <div class="flex flex-col gap-4 rounded-md border border-border/60 bg-ground-raised p-6 shadow-md">
        <h1 class="font-semibold text-[14px] text-text">
          Default Export Format
        </h1>
        <p class="text-[12px] text-text-secondary">
          Choose the format used when grabbing elements.
        </p>
        <RadioGroup
          disabled={!loaded()}
          name="default-format"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onChange={handleChange}
          options={FORMAT_OPTIONS}
          value={format()}
        />
      </div>
    </div>
  );
}

// Mount into the DOM
const root = document.getElementById("app");
if (root) {
  render(() => <OptionsApp />, root);
}
