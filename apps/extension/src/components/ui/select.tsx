import { For } from "solid-js";

import { cn } from "../../lib/cn.ts";

/**
 * A single option in the Select component.
 *
 * @public
 */
export interface SelectOption {
  label: string;
  value: string;
}

/**
 * Available sizes for the Select component.
 *
 * @public
 */
export type SelectSize = "sm" | "md";

/**
 * Props for the {@link Select} component.
 *
 * @public
 */
export interface SelectProps {
  /** Additional CSS class for the container. */
  class?: string;
  /** HTML id attribute for the container. */
  id?: string;
  /** Callback invoked with the new value when an option is selected. */
  onChange: (value: string) => void;
  /** The available options to choose from. */
  options: SelectOption[];
  /** Size of the option buttons. @default "md" */
  size?: SelectSize;
  /** The currently selected value. */
  value: string;
}

/**
 * Toggle-group selector that renders a set of connected buttons.
 *
 * The active option is highlighted with the primary color. All colors and
 * spacing reference Tamiz design tokens defined in `content.css`.
 *
 * @public
 */
export function Select(props: SelectProps) {
  return (
    <div
      class={cn(
        "inline-flex overflow-hidden rounded-md border border-border bg-surface-glass",
        props.class
      )}
      data-tamiz-select
      id={props.id}
    >
      <For each={props.options}>
        {(option, index) => (
          <button
            class={cn(
              // Base
              "inline-flex cursor-pointer items-center justify-center whitespace-nowrap border-none bg-transparent font-medium font-sans text-sm text-text-secondary transition-[background-color,color] duration-fast ease-out",
              // Size
              {
                "h-[28px] px-2 text-xs": props.size === "sm",
                "h-[34px] px-3": props.size !== "sm",
              },
              // Active / hover (active excludes hover to preserve original CSS priority)
              {
                "bg-focus text-text-on-focus": props.value === option.value,
                "hover:enabled:bg-surface-glass-hover hover:enabled:text-text":
                  props.value !== option.value,
              },
              // Disabled
              "disabled:cursor-not-allowed disabled:opacity-[0.35]",
              // Structural (index-based to mirror :first-child / :last-child / :not(:last-child))
              {
                "border-border border-r": index() !== props.options.length - 1,
                "rounded-l-md": index() === 0,
                "rounded-r-md": index() === props.options.length - 1,
              }
            )}
            onClick={[props.onChange, option.value]}
            type="button"
          >
            {option.label}
          </button>
        )}
      </For>
    </div>
  );
}
