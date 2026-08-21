import Copy from "lucide-solid/icons/copy";
import Download from "lucide-solid/icons/download";
import RotateCcw from "lucide-solid/icons/rotate-ccw";
import X from "lucide-solid/icons/x";
import { type Accessor, createSignal } from "solid-js";

import type { PickerAction } from "../core/actions/types.ts";
import { useFloatingPosition } from "../lib/floating-position.ts";
import { Button } from "./ui/button.tsx";
import { Select, type SelectOption } from "./ui/select.tsx";

/** Format options presented in the bar's Select toggle. */
const FORMAT_OPTIONS: SelectOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
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
  format: Accessor<"markdown" | "html">;
  /** Dispatched when the user clicks Copy, Download, Cancel, or changes format. */
  onAction: (action: PickerAction) => void;
}

/**
 * Floating action bar rendered inside a Shadow DOM host.
 *
 * Two-row layout: Row 1 (top) has the format selector. Row 2 (bottom) has
 * copy, download, and cancel buttons. Container width is `fit-content`,
 * determined by the widest row. Zero visual gap between elements —
 * separation is implicit via hover/focus accent color.
 *
 * @public
 */
export function FloatingActionBar(props: FloatingActionBarProps) {
  const [barRef, setBarRef] = createSignal<HTMLDivElement | null>(null);

  const { left, top } = useFloatingPosition(props.element, {
    floatingRef: barRef,
    placement: "right-start",
    strategy: "fixed",
  });

  function handleCopy(): void {
    props.onAction({ type: "COPY" });
  }

  function handleDownload(): void {
    props.onAction({ type: "DOWNLOAD" });
  }

  function handleDismiss(): void {
    props.onAction({ type: "DISMISS" });
  }

  function handleRestart(): void {
    props.onAction({ type: "RESTART" });
  }

  function handleFormatChange(value: string): void {
    props.onAction({
      format: value as "markdown" | "html",
      type: "FORMAT_CHANGE",
    });
  }

  return (
    <div
      class="group/bar fixed z-[2147483647] flex w-fit flex-col rounded-md border border-border bg-ground-raised shadow-md [animation:tz-lens-appear_var(--tz-duration-slow)_var(--tz-ease-out)]"
      data-tamiz-bar
      ref={setBarRef}
      style={{
        left: `${left()}px`,
        top: `${top()}px`,
      }}
    >
      {/* Row 1: Format selector */}
      <div class="flex h-[32px] items-center px-1">
        <div class="min-w-0 flex-1">
          <Select
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onChange={handleFormatChange}
            options={FORMAT_OPTIONS}
            value={props.format()}
            variant="subtle"
          />
        </div>
      </div>

      {/* Row separator */}
      <div
        aria-hidden="true"
        class="h-px w-full border-border border-t border-solid"
      />

      {/* Row 2: Action buttons */}
      <div class="flex h-[32px] items-center justify-center px-1">
        <Button
          aria-label="Copy"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onClick={handleCopy}
          size="xs"
          variant="icon"
        >
          <Copy size={16} />
        </Button>
        <Button
          aria-label="Download"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onClick={handleDownload}
          size="xs"
          variant="icon"
        >
          <Download size={16} />
        </Button>
        <Button
          aria-label="Restart selection"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onClick={handleRestart}
          size="xs"
          variant="icon"
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          aria-label="Cancel"
          // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
          onClick={handleDismiss}
          size="xs"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
