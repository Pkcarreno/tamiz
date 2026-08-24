import type { Placement } from "@floating-ui/dom";
import CircleMinus from "lucide-solid/icons/circle-minus";
import Copy from "lucide-solid/icons/copy";
import Download from "lucide-solid/icons/download";
import RotateCcw from "lucide-solid/icons/rotate-ccw";
import X from "lucide-solid/icons/x";
import { type Accessor, createSignal, type JSX, splitProps } from "solid-js";

import type { PickerAction } from "../core/actions/types.ts";
import type { ShortcutRegistry } from "../core/keyboard/registry.ts";
import { useFloatingPosition } from "../lib/floating-position.ts";
import { Button } from "./ui/button.tsx";
import { Kbd } from "./ui/kbd.tsx";
import { Select, type SelectOption } from "./ui/select.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip.tsx";

/** Format options presented in the bar's Select toggle. */
const FORMAT_OPTIONS: SelectOption[] = [
  { label: "Markdown", value: "markdown" },
  { label: "HTML", value: "html" },
];

// ---------------------------------------------------------------------------
// BarTooltip — thin wrapper for floating-bar button tooltips
// ---------------------------------------------------------------------------

/**
 * Props for the {@link BarTooltip} component.
 *
 * @public
 */
export interface BarTooltipProps {
  /** The trigger element (typically a Button). */
  children: JSX.Element;
  /** Human-readable label displayed in the tooltip. */
  label: string;
  /** Preferred placement of the tooltip relative to the trigger. @default "top" */
  placement?: Placement;
  /** Keyboard shortcut text displayed as a `<kbd>` element. */
  shortcut: string;
}

/**
 * Floating-bar specific tooltip that composes {@link Tooltip} compound
 * components with consistent label + shortcut styling.
 *
 * Reduces boilerplate for the common pattern: trigger → label + kbd shortcut.
 *
 * @example
 * ```tsx
 * <BarTooltip label="Copy" shortcut="C" placement="bottom">
 *   <Button onClick={handleCopy} size="xs" variant="icon">
 *     <Copy size={16} />
 *   </Button>
 * </BarTooltip>
 * ```
 *
 * @public
 */
export function BarTooltip(props: BarTooltipProps) {
  const [local] = splitProps(props, [
    "children",
    "label",
    "placement",
    "shortcut",
  ]);

  return (
    <Tooltip placement={local.placement}>
      <TooltipTrigger>{local.children}</TooltipTrigger>
      <TooltipContent>
        {local.label} <Kbd>{local.shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// FloatingActionBar
// ---------------------------------------------------------------------------

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
  /** Whether exclusion mode is active. */
  isExclusionMode: Accessor<boolean>;
  /** Dispatched when the user clicks Copy, Download, Cancel, or changes format. */
  onAction: (action: PickerAction) => void;
  /** Shortcut registry for dynamic label lookup. */
  registry?: ShortcutRegistry;
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

  /** Resolve a shortcut label from the registry, falling back to a static key. */
  function shortcutLabel(
    actionType: Parameters<ShortcutRegistry["getLabelByActionType"]>[0],
    fallback: string
  ): string {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: registry is optional; ?? fallback needed
    return props.registry?.getLabelByActionType(actionType) ?? fallback;
  }

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

  function handleExcludeToggle(): void {
    props.onAction({ type: "EXCLUDE_TOGGLE" });
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
          <BarTooltip
            label="Format"
            shortcut={shortcutLabel("FORMAT_CHANGE", "F")}
          >
            <Select
              // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
              onChange={handleFormatChange}
              options={FORMAT_OPTIONS}
              value={props.format()}
              variant="subtle"
            />
          </BarTooltip>
        </div>
      </div>

      {/* Row separator */}
      <div
        aria-hidden="true"
        class="h-px w-full border-border border-t border-solid"
      />

      {/* Row 2: Action buttons */}
      <div class="flex h-[32px] items-center justify-center px-1">
        <BarTooltip
          label="Copy"
          placement="bottom"
          shortcut={shortcutLabel("COPY", "C")}
        >
          <Button
            aria-label="Copy"
            disabled={props.isExclusionMode()}
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onClick={handleCopy}
            size="xs"
            variant="icon"
          >
            <Copy size={16} />
          </Button>
        </BarTooltip>
        <BarTooltip
          label="Download"
          placement="bottom"
          shortcut={shortcutLabel("DOWNLOAD", "S")}
        >
          <Button
            aria-label="Download"
            disabled={props.isExclusionMode()}
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onClick={handleDownload}
            size="xs"
            variant="icon"
          >
            <Download size={16} />
          </Button>
        </BarTooltip>
        <BarTooltip
          label="Exclude"
          placement="bottom"
          shortcut={shortcutLabel("EXCLUDE_TOGGLE", "E")}
        >
          <Button
            aria-label="Toggle exclusion mode"
            class={props.isExclusionMode() ? "text-accent" : ""}
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onClick={handleExcludeToggle}
            size="xs"
            variant="icon"
          >
            <CircleMinus size={16} />
          </Button>
        </BarTooltip>
        <BarTooltip
          label="Restart"
          placement="bottom"
          shortcut={shortcutLabel("RESTART", "R")}
        >
          <Button
            aria-label="Restart selection"
            disabled={props.isExclusionMode()}
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onClick={handleRestart}
            size="xs"
            variant="icon"
          >
            <RotateCcw size={16} />
          </Button>
        </BarTooltip>
        <BarTooltip
          label="Dismiss"
          placement="bottom"
          shortcut={shortcutLabel("DISMISS", "Esc")}
        >
          <Button
            aria-label="Cancel"
            // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
            onClick={handleDismiss}
            size="xs"
            variant="ghost"
          >
            <X size={14} />
          </Button>
        </BarTooltip>
      </div>
    </div>
  );
}
