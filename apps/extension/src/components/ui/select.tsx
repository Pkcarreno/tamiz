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
 * @public
 */
export interface SelectProps {
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

// Variant-specific classes for the native `<select>` element.
const variantClasses: Record<SelectVariant, string> = {
  standard:
    "h-[28px] px-2 text-[12px] text-text bg-transparent w-full border-border/60 hover:enabled:bg-surface-glass-hover",
  subtle:
    "h-[24px] px-1 text-[11px] text-text-secondary bg-transparent border-transparent hover:enabled:text-focus",
};

/**
 * Returns the variant-specific CSS classes for the native `<select>` element.
 *
 * @public
 */
export function getVariantClasses(variant: SelectVariant): string {
  return variantClasses[variant];
}

// Chevron icon classes per variant.
const chevronClasses: Record<SelectVariant, string> = {
  standard: "size-[12px] text-text-tertiary",
  subtle: "size-[10px] text-text-tertiary",
};

/**
 * Returns the chevron icon classes for a given variant.
 *
 * @public
 */
export function getChevronClasses(variant: SelectVariant): string {
  return chevronClasses[variant];
}

/**
 * Native `<select>` with inline chevron indicator and two visual variants.
 *
 * Subtle variant: borderless, full-width, ghost-like for floating bar.
 * Standard variant: minimal border, for popup/form layouts.
 *
 * @public
 */
export function Select(props: SelectProps) {
  return (
    <div class="relative inline-flex w-full" data-tamiz-select>
      <select
        class={cn(
          // Shared base
          "color-scheme:light relative w-full appearance-none rounded-sm border border-transparent pr-6 font-medium font-sans transition-[color,border-color] duration-fast ease-out focus:shadow-focus focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-[0.35]",
          // Variant-specific
          getVariantClasses(props.variant),
          // User-supplied
          props.class
        )}
        disabled={props.disabled}
        id={props.id}
        // biome-ignore lint/performance/noJsxPropsBind: SolidJS component body runs once; handler is stable
        onChange={(e: Event) =>
          props.onChange((e.currentTarget as HTMLSelectElement).value)
        }
        value={props.value}
      >
        <For each={props.options}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
      <svg
        aria-hidden="true"
        class={cn(
          getChevronClasses(props.variant),
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
