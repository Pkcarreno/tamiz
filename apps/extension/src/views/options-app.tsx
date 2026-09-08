import { createEffect, createSignal, type JSX, onMount } from "solid-js";
import { render } from "solid-js/web";

import { RadioGroup } from "../components/ui/radio-group.tsx";
import type { Format } from "../core/keyboard/types.ts";
import type { ThemePreference } from "../lib/storage.ts";
import {
  readDefaultFormat,
  readThemePreference,
  writeDefaultFormat,
  writeThemePreference,
} from "../lib/storage.ts";
import "../styles/options.css";

/**
 * Format options presented in the settings RadioGroup.
 */
const FORMAT_OPTIONS = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

/**
 * Theme options presented in the settings RadioGroup.
 */
const THEME_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "Auto", value: "auto" },
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
  const [theme, setTheme] = createSignal<ThemePreference>("auto");
  const [loaded, setLoaded] = createSignal(false);

  onMount(async () => {
    const [storedFormat, storedTheme] = await Promise.all([
      readDefaultFormat(),
      readThemePreference(),
    ]);
    setFormat(storedFormat);
    setTheme(storedTheme);
    setLoaded(true);
  });

  createEffect(() => {
    const root = document.documentElement;
    if (theme() === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  });

  async function handleFormatChange(value: string): Promise<void> {
    const next = value as Format;
    setFormat(next);
    await writeDefaultFormat(next);
  }

  async function handleThemeChange(value: string): Promise<void> {
    const next = value as ThemePreference;
    setTheme(next);
    await writeThemePreference(next);
  }

  return (
    <div class="tz-options">
      <h1 class="mb-6 font-semibold text-[16px] text-text">Settings</h1>
      <div class="flex flex-col gap-4">
        <h2 class="font-semibold text-[14px] text-text">
          Default Export Format
        </h2>
        <p class="text-[12px] text-text-secondary">
          Choose the format used when grabbing elements.
        </p>
        <RadioGroup
          disabled={!loaded()}
          name="default-format"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onChange={handleFormatChange}
          options={FORMAT_OPTIONS}
          value={format()}
        />
      </div>

      <div class="mt-2 flex flex-col gap-4 border-border border-t pt-4">
        <h2 class="font-semibold text-[14px] text-text">Theme</h2>
        <p class="text-[12px] text-text-secondary">
          Choose the theme for the extension. Auto follows your system setting.
        </p>
        <RadioGroup
          disabled={!loaded()}
          name="theme-preference"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onChange={handleThemeChange}
          options={THEME_OPTIONS}
          value={theme()}
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
