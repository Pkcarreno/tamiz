import Copy from "lucide-solid/icons/copy";
import Download from "lucide-solid/icons/download";
import X from "lucide-solid/icons/x";
import { type Accessor, createMemo } from "solid-js";

import { computeBarPosition } from "../lib/position.ts";
import { Button } from "./ui/button.tsx";
import { Select, type SelectOption } from "./ui/select.tsx";

/** Estimated width of the floating bar used for viewport clamping. */
const BAR_WIDTH = 260;

/** Estimated height of the floating bar used for viewport clamping. */
const BAR_HEIGHT = 32;

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
 * Thin vertical separator between interaction zones.
 */
function Separator() {
  return (
    <div
      aria-hidden="true"
      class="mx-0.5 h-3 w-px bg-border transition-colors duration-fast group-hover/bar:bg-text-tertiary"
    />
  );
}

/**
 * Floating action bar rendered inside a Shadow DOM host.
 *
 * Single-row, compact layout with no container gaps or padding.
 * All buttons are ghost (text-only, hover changes text color).
 * Thin vertical separators divide interaction zones.
 * Format selector fills available width. macOS-native density.
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
      class="group/bar fixed z-[2147483647] flex items-center rounded-md border border-border bg-ground-raised px-1 shadow-md backdrop-blur-[12px] [animation:tz-lens-appear_var(--tz-duration-slow)_var(--tz-ease-out)]"
      data-tamiz-bar
      style={{
        left: `${position().left}px`,
        top: `${position().top}px`,
      }}
    >
      {/* Format selector — fills available width */}
      <div class="min-w-0 flex-1">
        <Select
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onChange={handleFormatChange}
          options={FORMAT_OPTIONS}
          value={props.format()}
          variant="subtle"
        />
      </div>

      <Separator />

      {/* Action icons */}
      <Button aria-label="Copy" onClick={props.onCopy} size="xs" variant="icon">
        <Copy size={14} />
      </Button>
      <Button
        aria-label="Download"
        onClick={props.onDownload}
        size="xs"
        variant="icon"
      >
        <Download size={14} />
      </Button>

      <Separator />

      {/* Cancel */}
      <Button
        aria-label="Cancel"
        onClick={props.onCancel}
        size="xs"
        variant="ghost"
      >
        <X size={12} />
      </Button>
    </div>
  );
}
