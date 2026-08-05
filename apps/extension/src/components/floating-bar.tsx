import { type Accessor, createMemo } from "solid-js";

import { computeBarPosition } from "../lib/position.ts";
import { Button } from "./ui/button.tsx";
import { Select, type SelectOption } from "./ui/select.tsx";

/** Estimated width of the floating bar used for viewport clamping. */
const BAR_WIDTH = 280;

/** Estimated height of the floating bar used for viewport clamping. */
const BAR_HEIGHT = 100;

/** Format options presented in the bar's Select toggle. */
const FORMAT_OPTIONS: SelectOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "Raw HTML", value: "raw" },
];

/**
 * Props for the {@link FloatingActionBar} component.
 *
 * @public
 */
export interface FloatingActionBarProps {
  /** The selected DOM element the bar is anchored to. */
  element: Accessor<Element | null>;
  /** Currently selected output format. */
  format: Accessor<"markdown" | "raw">;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
  /** Called when the user clicks Copy. */
  onCopy: () => void;
  /** Called when the user clicks Download. */
  onDownload: () => void;
  /** Called when the user selects a different format. */
  onFormatChange: (format: "markdown" | "raw") => void;
}

/**
 * Floating action bar rendered inside a Shadow DOM host.
 *
 * Two-row layout anchored around the selected element via
 * {@link computeBarPosition}. All colors, spacing, and radii reference
 * Tamiz design tokens defined in `content.css`.
 *
 * The root element carries `data-tamiz-bar` so that {@link extractContent}
 * can strip it from cloned HTML during copy/download.
 *
 * @public
 */
export function FloatingActionBar(props: FloatingActionBarProps) {
  const position = createMemo(() => {
    const el = props.element();
    if (!el) {
      return { left: 0, top: 0 };
    }
    const rect = el.getBoundingClientRect();
    return computeBarPosition(
      rect,
      BAR_WIDTH,
      BAR_HEIGHT,
      window.innerWidth,
      window.innerHeight
    );
  });

  function handleFormatChange(value: string) {
    props.onFormatChange(value as "markdown" | "raw");
  }

  return (
    <div
      class="fixed z-[2147483647] flex flex-col gap-1 rounded-lg border border-border bg-ground-raised p-2 shadow-lg backdrop-blur-[16px] [animation:tz-lens-appear_var(--tz-duration-slow)_var(--tz-ease-out)]"
      data-tamiz-bar
      style={{
        left: `${position().left}px`,
        top: `${position().top}px`,
      }}
    >
      <div class="flex items-center gap-1">
        <Select
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onChange={handleFormatChange}
          options={FORMAT_OPTIONS}
          value={props.format()}
          variant="subtle"
        />
        <Button disabled variant="secondary">
          Preview
        </Button>
      </div>
      <div class="flex items-center gap-1">
        <Button onClick={props.onCopy}>Copy</Button>
        <Button onClick={props.onDownload}>Download</Button>
        <Button onClick={props.onCancel} variant="secondary">
          Cancel
        </Button>
      </div>
    </div>
  );
}
