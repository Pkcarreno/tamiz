import { cva } from "class-variance-authority";
import type { JSX } from "solid-js";
import { For, splitProps } from "solid-js";

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
 * Visual style of the Select component.
 *
 * - `subtle` — compact, borderless, full-width for toolbars (floating bar)
 * - `standard` — bordered, for form layouts (popup)
 *
 * @public
 */
export type SelectVariant = "subtle" | "standard";

/**
 * Props for the {@link Select} component.
 *
 * Extends native `<select>` attributes (minus onChange/value/children/class which
 * are re-declared with custom signatures). All remaining HTML attributes —
 * `name`, `aria-*`, `data-*`, `tabIndex`, `onFocus`, etc. — are forwarded to
 * the native `<select>` via `{...rest}`.
 *
 * @public
 */
export interface SelectProps
  extends Omit<
    JSX.SelectHTMLAttributes<HTMLSelectElement>,
    "onChange" | "value" | "children" | "class"
  > {
  /** Additional CSS class merged into the native `<select>` element. */
  class?: string;
  /** HTML `disabled` attribute forwarded to the native `<select>` element. */
  disabled?: boolean;
  /** HTML `id` attribute forwarded to the native `<select>` element. */
  id?: string;
  /** Callback invoked with the new value when an option is selected. */
  onChange: (value: string) => void;
  /** The available options to choose from. */
  options: SelectOption[];
  /** The currently selected value. */
  value: string;
  /** Visual style of the select. */
  variant: SelectVariant;
}

/**
 * CVA variant configuration for the native `<select>` element.
 *
 * Base classes (always applied) + `subtle` / `standard` variant classes.
 */
const selectVariants = cva(
  "relative w-full appearance-none rounded-sm border border-transparent pr-6 font-medium font-sans transition-[color,border-color,box-shadow] duration-fast ease-out focus-visible:shadow-focus focus-visible:outline-none focus-visible:ring-0 active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.35]",
  {
    defaultVariants: { variant: "standard" },
    variants: {
      variant: {
        standard:
          "h-[32px] w-full border-border/60 bg-transparent px-2 text-[12px] text-text hover:enabled:text-accent",
        subtle:
          "h-[32px] border-transparent bg-transparent px-1 text-[11px] text-text-secondary hover:enabled:text-accent",
      },
    },
  }
);

/**
 * CVA variant configuration for the chevron SVG indicator.
 */
const chevronVariants = cva("", {
  defaultVariants: { variant: "standard" },
  variants: {
    variant: {
      standard: "size-[12px] text-text-tertiary",
      subtle: "size-[10px] text-text-tertiary",
    },
  },
});

/**
 * Native `<select>` with inline chevron indicator and two visual variants.
 *
 * Subtle variant: borderless, full-width, ghost-like for floating bar.
 * Standard variant: minimal border, for popup/form layouts.
 *
 * @public
 */
export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "disabled",
    "id",
    "onChange",
    "options",
    "value",
    "variant",
  ]);

  function handleChange(e: Event) {
    local.onChange((e.currentTarget as HTMLSelectElement).value);
  }

  return (
    <div class="relative inline-flex w-full" data-tamiz-select>
      <select
        {...rest}
        class={cn(selectVariants({ variant: local.variant }), local.class)}
        disabled={local.disabled}
        id={local.id}
        // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
        onChange={handleChange}
      >
        <For each={local.options}>
          {(option) => (
            <option
              selected={option.value === local.value}
              value={option.value}
            >
              {option.label}
            </option>
          )}
        </For>
      </select>
      <svg
        aria-hidden="true"
        class={cn(
          chevronVariants({ variant: local.variant }),
          "pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2"
        )}
        fill="currentColor"
        height="24"
        viewBox="0 0 24 24"
        width="24"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
