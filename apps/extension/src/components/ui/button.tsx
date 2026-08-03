import type { JSX } from "solid-js";
import { createMemo, splitProps } from "solid-js";

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

  const classes = createMemo(() => {
    const variant = local.variant ?? "primary";
    const size = local.size ?? "md";
    const isIcon = variant === "icon";

    const variantClass = isIcon ? "tz-btn-primary" : `tz-btn-${variant}`;
    const sizeClass = isIcon
      ? `tz-btn-icon tz-btn-icon-${size}`
      : `tz-btn-${size}`;

    return `tz-btn ${variantClass} ${sizeClass} ${local.class ?? ""}`.trim();
  });

  return (
    <button class={classes()} type={local.type ?? "button"} {...rest}>
      {local.children}
    </button>
  );
}
