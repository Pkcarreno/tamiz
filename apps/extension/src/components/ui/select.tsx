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
 * - `subtle` — compact, glass-surface appearance for dense toolbars
 * - `standard` — full-width, elevated appearance for form layouts
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
// Extracted as a pure-data lookup so getVariantClasses can be unit-tested directly.
const variantClasses: Record<SelectVariant, string> = {
  standard:
    "h-[40px] px-3 text-sm text-text bg-ground-elevated w-full hover:enabled:bg-ground-raised",
  subtle:
    "h-[28px] px-2 text-xs text-text-secondary bg-transparent rounded-sm border-border/50 hover:enabled:bg-surface-glass-hover",
};

/**
 * Returns the variant-specific CSS classes for the native `<select>` element.
 *
 * Encapsulates the height, padding, typography, background, and hover
 * behavior so they can be unit-tested independently of rendering.
 *
 * @public
 */
export function getVariantClasses(variant: SelectVariant): string {
  return variantClasses[variant];
}

// Chevron icon classes (size + text color) per variant.
// The SVG uses `currentColor` so the path inherits the color from text-utility.
const chevronClasses: Record<SelectVariant, string> = {
  standard: "size-[14px] text-text-tertiary",
  subtle: "size-[12px] text-text-tertiary",
};

/**
 * Returns the chevron icon classes (size + text color) for a given variant.
 *
 * The SVG uses `currentColor` so the path inherits the color set by the
 * returned `text-*` utility.
 *
 * @public
 */
export function getChevronClasses(variant: SelectVariant): string {
  return chevronClasses[variant];
}

/**
 * Native `<select>` with an inline chevron indicator and two visual
 * variants.
 *
 * All colors and spacing reference Tamiz design tokens. The component
 * forwards `id` and `disabled` to the native `<select>` and maps the
 * native `change` event to a typed string callback.
 *
 * @public
 */
export function Select(props: SelectProps) {
  return (
    <div class="relative inline-flex" data-tamiz-select>
      <select
        class={cn(
          // Shared base
          "color-scheme:dark relative appearance-none rounded-md border border-border pr-8 font-medium font-sans transition-[background-color,border-color,box-shadow] duration-fast ease-out focus:shadow-focus focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-[0.35]",
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
          "pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
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
