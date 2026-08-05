import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../../lib/cn.ts";
import { buttonVariants } from "../../lib/variants.ts";

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
 * `content.css` via the `var(--tz-*)` custom properties.
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
        buttonVariants({ size: local.size, variant: local.variant }),
        local.class
      )}
      type={local.type ?? "button"}
      {...rest}
    >
      {local.children}
    </button>
  );
}
