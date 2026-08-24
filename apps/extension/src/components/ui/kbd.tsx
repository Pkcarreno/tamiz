import type { JSX } from "solid-js";
import { cn } from "../../lib/cn.ts";

/**
 * Keyboard shortcut badge rendered as a `<kbd>` element.
 *
 * Extracts the `<kbd>` styling from floating-bar tooltips into a
 * reusable UI primitive. Uses the same visual treatment as the
 * original inline markup: monospace font, rounded border, ground
 * background, and compact sizing.
 *
 * @public
 */
export function Kbd(props: { children: JSX.Element }): JSX.Element {
  return (
    <kbd
      class={cn(
        "ml-1 inline-flex h-[15px] items-center rounded-[3px] border border-border/60 bg-ground px-1 font-mono text-[9px] text-text"
      )}
    >
      {props.children}
    </kbd>
  );
}
