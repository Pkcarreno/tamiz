import type { Placement } from "@floating-ui/dom";
import type { JSX } from "solid-js";
import {
  createContext,
  createSignal,
  Show,
  splitProps,
  useContext,
} from "solid-js";

import { cn } from "../../lib/cn.ts";
import { useFloatingPosition } from "../../lib/floating-position.ts";

/** Delay before the first tooltip appears (ms). */
const SHOW_DELAY = 300;

/** Duration after which a sibling tooltip opens instantly (ms). */
const SKIP_DELAY = 300;

/**
 * Shared timestamp tracking the last tooltip close.
 * Enables skip-delay: adjacent tooltips open instantly when hovered
 * within {@link SKIP_DELAY} ms of the previous close.
 */
let lastCloseTime = 0;

/**
 * Timer ID type that works in both Node.js and browser environments.
 * Use this instead of `number` to avoid cross-runtime mismatches.
 */
type TimerId = ReturnType<typeof setTimeout>;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface TooltipContextValue {
  /** Hide the tooltip content. */
  hide: () => void;
  /** Whether the tooltip content is visible. */
  open: () => boolean;
  /** Preferred placement of the tooltip relative to the trigger. */
  placement: Placement;
  /** Show the tooltip content. */
  show: () => void;
  /** Unique ID for the tooltip content element. */
  tooltipId: string;
  /** Accessor for the trigger element. */
  triggerEl: () => Element | null;
  /** Ref to the trigger element for floating-ui positioning. */
  triggerRef: (el: Element) => void;
}

const TooltipContext = createContext<TooltipContextValue>();

/**
 * Access the Tooltip context from a child component.
 *
 * Throws when called outside a {@link Tooltip} provider.
 *
 * @public
 */
export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) {
    throw new Error(
      "[Tooltip] Components must be used within a <Tooltip> provider."
    );
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Tooltip (root provider)
// ---------------------------------------------------------------------------

/**
 * Props for the {@link Tooltip} root provider.
 *
 * @public
 */
export interface TooltipProps {
  /** Child elements — must include TooltipTrigger and TooltipContent. */
  children: JSX.Element;
  /** Preferred placement of the tooltip relative to the trigger. @default "top" */
  placement?: Placement;
}

/**
 * Root provider for the Tooltip compound component.
 *
 * Manages open state, hover timing, and context for child components.
 * Use with {@link TooltipTrigger} and {@link TooltipContent}.
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger>
 *     <Button>Click</Button>
 *   </TooltipTrigger>
 *   <TooltipContent>Tooltip text</TooltipContent>
 * </Tooltip>
 * ```
 *
 * @public
 */
export function Tooltip(props: TooltipProps) {
  const [local] = splitProps(props, ["children", "placement"]);
  const [open, setOpen] = createSignal(false);
  const [triggerEl, setTriggerEl] = createSignal<Element | null>(null);

  let showTimer: TimerId | undefined;
  let hideTimer: TimerId | undefined;
  const tooltipId = `tooltip-${Math.random().toString(36).slice(2, 9)}`;

  function clearTimers(): void {
    if (showTimer !== undefined) {
      clearTimeout(showTimer);
      showTimer = undefined;
    }
    if (hideTimer !== undefined) {
      clearTimeout(hideTimer);
      hideTimer = undefined;
    }
  }

  function show(): void {
    clearTimers();
    const elapsed = Date.now() - lastCloseTime;
    const delay = elapsed < SKIP_DELAY ? 0 : SHOW_DELAY;

    if (delay === 0) {
      setOpen(true);
    } else {
      showTimer = setTimeout(() => {
        setOpen(true);
        showTimer = undefined;
      }, delay);
    }
  }

  function hide(): void {
    clearTimers();
    setOpen(false);
    lastCloseTime = Date.now();
    hideTimer = setTimeout(() => {
      hideTimer = undefined;
    }, 0);
  }

  const ctx: TooltipContextValue = {
    hide,
    open,
    placement: local.placement ?? "top",
    show,
    tooltipId,
    triggerEl,
    triggerRef: setTriggerEl,
  };

  return (
    <TooltipContext.Provider value={ctx}>
      {local.children}
    </TooltipContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// TooltipTrigger
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TooltipTrigger} wrapper.
 *
 * @public
 */
export interface TooltipTriggerProps {
  /** The element that triggers the tooltip on hover/focus. */
  children: JSX.Element;
}

/**
 * Wrapper that attaches hover and focus handlers to its child.
 *
 * The trigger element must be a single focusable or pointer-interactive
 * element (e.g., Button). Handlers are attached via event delegation on
 * the wrapper span.
 *
 * @public
 */
export function TooltipTrigger(props: TooltipTriggerProps) {
  const [local, rest] = splitProps(props, ["children"]);
  const ctx = useTooltipContext();

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper delegates events to children
    <span
      onBlur={ctx.hide}
      onFocus={ctx.show}
      onPointerEnter={ctx.show}
      onPointerLeave={ctx.hide}
      ref={ctx.triggerRef}
      role="presentation"
      {...rest}
    >
      {local.children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TooltipContent
// ---------------------------------------------------------------------------

/**
 * Props for the {@link TooltipContent} floating element.
 *
 * @public
 */
export interface TooltipContentProps {
  /** Tooltip content. */
  children?: JSX.Element;
  /** Additional CSS class merged into the content element. */
  class?: string;
}

/**
 * Floating content element positioned relative to {@link TooltipTrigger}.
 *
 * Uses `useFloatingPosition` with the placement from {@link Tooltip} context.
 * Renders `role="tooltip"` and links to the trigger via `aria-describedby`.
 *
 * @public
 */
export function TooltipContent(props: TooltipContentProps) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  const ctx = useTooltipContext();
  const [contentRef, setContentRef] = createSignal<HTMLDivElement | null>(null);

  const { left, top } = useFloatingPosition(ctx.triggerEl, {
    floatingRef: contentRef,
    placement: ctx.placement,
    strategy: "fixed",
  });

  return (
    <Show when={ctx.open()}>
      <div
        aria-describedby={ctx.tooltipId}
        class={cn(
          "pointer-events-none fixed z-[2147483647] select-none rounded-sm border border-border bg-ground-raised px-2 py-1 font-medium font-sans text-[11px] text-text shadow-md",
          "transition-[opacity,transform] duration-fast ease-out",
          "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
          "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
          local.class
        )}
        data-tamiz-tooltip
        id={ctx.tooltipId}
        ref={setContentRef}
        role="tooltip"
        style={{
          left: `${left()}px`,
          top: `${top()}px`,
        }}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}
