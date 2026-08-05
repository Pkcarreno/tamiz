import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../../lib/cn.ts";

/**
 * Button visual variants.
 *
 * @public
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

/**
 * Button sizes.
 *
 * @public
 */
export type ButtonSize = "sm" | "md";

/**
 * Props for the {@link Button} component.
 *
 * @public
 */
export interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: JSX.Element;
  /** Height and padding of the button. @default "md" */
  size?: ButtonSize;
  /** Visual style of the button. @default "primary" */
  variant?: ButtonVariant;
}

/**
 * Reusable button component with primary, secondary, ghost, and icon variants.
 *
 * All colors, spacing, and radii reference Tamiz design tokens defined in
 * `content.css` via the `var(--tz-*)` custom properties. Variant logic that was
 * previously handled by CVA recipes is now expressed as conditional Tailwind
 * utility classes composed through {@link cn}.
 *
 * @public
 */
export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "class",
    "children",
    "type",
  ]);

  return (
    <button
      class={cn(
        // Base
        "inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-md border border-transparent font-medium font-sans transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out",
        // Disabled + active + focus (apply to all variants)
        "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.35]",
        // Variants
        {
          "border-border bg-surface-glass text-text hover:enabled:border-[rgba(255,255,255,0.12)] hover:enabled:bg-surface-glass-hover hover:enabled:text-text":
            local.variant === "secondary",
          "border-focus bg-focus text-text-on-focus hover:enabled:border-focus-bright hover:enabled:bg-focus-bright hover:enabled:shadow-focus":
            local.variant !== "secondary" && local.variant !== "ghost",
          "border-transparent bg-transparent text-text-secondary hover:enabled:bg-surface-glass hover:enabled:text-text":
            local.variant === "ghost",
        },
        // Sizes
        {
          "h-[28px] rounded-sm px-2 text-xs": local.size === "sm",
          "h-[34px] px-4 text-sm": local.size !== "sm",
        },
        // Icon compound: resets padding, sets square dimensions
        {
          "h-[28px] w-[28px] p-0":
            local.variant === "icon" && local.size === "sm",
          "h-[34px] w-[34px] p-0":
            local.variant === "icon" && local.size !== "sm",
        },
        local.class
      )}
      type={local.type ?? "button"}
      {...rest}
    >
      {local.children}
    </button>
  );
}
