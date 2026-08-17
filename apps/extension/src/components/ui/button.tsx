import { cva } from "class-variance-authority";
import type { JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "../../lib/cn.ts";

/**
 * Button visual variants.
 *
 * - `ghost` — transparent, text-only. Hover changes text color (link-like).
 * - `icon` — transparent, icon-only square. Hover changes icon color.
 *
 * @public
 */
export type ButtonVariant = "ghost" | "icon";

/**
 * Button sizes.
 *
 * @public
 */
export type ButtonSize = "xs" | "sm";

/**
 * Props for the {@link Button} component.
 *
 * @public
 */
export interface ButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: JSX.Element;
  /** Height and padding of the button. @default "xs" */
  size?: ButtonSize;
  /** Visual style of the button. @default "ghost" */
  variant?: ButtonVariant;
}

/**
 * CVA variant configuration for the {@link Button} component.
 *
 * Base classes (always applied) + variant × size matrix with compound variants
 * that override sizing for icon buttons. `defaultVariants` ensures a sensible
 * rendering when no variant/size is provided.
 */
const buttonVariants = cva(
  "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-sm border border-transparent font-medium font-sans transition-[color,box-shadow,transform] duration-fast ease-out focus-visible:shadow-focus focus-visible:outline-none active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.35]",
  {
    compoundVariants: [
      { class: "size-[32px]", size: "xs", variant: "icon" },
      { class: "size-[32px]", size: "sm", variant: "icon" },
    ],
    defaultVariants: { size: "xs", variant: "ghost" },
    variants: {
      size: {
        sm: "h-[32px] px-2 text-[12px]",
        xs: "h-[32px] px-1.5 text-[11px]",
      },
      variant: {
        ghost: "bg-transparent text-text-secondary hover:enabled:text-accent",
        icon: "bg-transparent p-0 text-text-tertiary hover:enabled:text-accent",
      },
    },
  }
);

/**
 * Ghost-only button component for the Precision Tool visual world.
 *
 * All buttons render as transparent surfaces with text/icon color hover
 * (link-like behavior). No background emphasis, no border. macOS-native
 * density: compact, accessible, not oversized.
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
        buttonVariants({
          size: local.size ?? "xs",
          variant: local.variant ?? "ghost",
        }),
        local.class
      )}
      type={local.type ?? "button"}
      {...rest}
    >
      {local.children}
    </button>
  );
}
