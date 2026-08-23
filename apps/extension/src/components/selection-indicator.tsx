import { X } from "lucide-solid";
import {
  type Accessor,
  createEffect,
  createSignal,
  type JSX,
  onCleanup,
  Show,
} from "solid-js";
import { cn } from "../lib/cn.ts";
import { Button } from "./ui/button.tsx";

/**
 * Props for the {@link SelectionIndicator} component.
 *
 * @public
 */
export interface SelectionIndicatorProps {
  /** Whether the user is in exclusion mode. */
  isExclusionMode: Accessor<boolean>;
  /** Called when the user clicks the close button or presses Escape. */
  onDismiss: () => void;
  /** Whether the instruction pill should be shown. */
  visible: Accessor<boolean>;
}

/**
 * Instruction pill guiding the user during selection mode.
 *
 * Renders a centered, top-aligned pill inside the shadow root with the text
 * "Click an element to select" and an inline "or press Esc" hint. Uses an
 * entrance animation (fade + scale, 180ms) and a delayed exit animation
 * (fade out, 120ms). When `prefers-reduced-motion` is enabled, both
 * animations are skipped for instant show/hide.
 *
 * The pill stays in the DOM for 120ms after `visible` becomes false to
 * allow the exit animation to play, then is unmounted.
 *
 * @public
 */
export function SelectionIndicator(
  props: SelectionIndicatorProps
): JSX.Element {
  const [mounted, setMounted] = createSignal(props.visible());

  createEffect(() => {
    const isVisible = props.visible();
    if (isVisible && !mounted()) {
      setMounted(true);
    } else if (!isVisible && mounted()) {
      const isReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (isReducedMotion) {
        setMounted(false);
      } else {
        const timerId = setTimeout(() => setMounted(false), 120);
        onCleanup(() => clearTimeout(timerId));
      }
    }
  });

  return (
    <Show when={mounted()}>
      <div
        class={cn(
          "fixed top-6 left-1/2 z-[2147483647] flex -translate-x-1/2 items-center gap-2 rounded-pill border border-border bg-ground-raised px-4 py-2 font-sans text-sm text-text shadow-md",
          props.visible()
            ? "[animation:tz-lens-appear_var(--tz-duration-slow)_var(--tz-ease-out)]"
            : "[animation:tz-lens-disappear_var(--tz-duration-fast)_var(--tz-ease-out)]"
        )}
        data-tamiz-ui
      >
        {props.isExclusionMode() ? (
          <>
            <span>Click element to exclude</span>
            <span class="text-text-secondary">Esc to finish</span>
          </>
        ) : (
          <>
            <span>Click an element to select</span>
            <span class="text-text-secondary">or press Esc</span>
          </>
        )}
        <Button
          aria-label="Dismiss selection (Esc)"
          data-tamiz-ui
          onClick={props.onDismiss}
          size="slim"
          variant="ghost"
        >
          <X size={14} />
        </Button>
      </div>
    </Show>
  );
}
