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
 * Ghost-only button component for the Paper & Ink visual world.
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

  const variant = () => local.variant ?? "ghost";
  const size = () => local.size ?? "xs";

  return (
    <button
      class={cn(
        // Base
        "inline-flex cursor-pointer select-none items-center justify-center gap-1.5 border border-transparent font-medium font-sans transition-[color,box-shadow,transform] duration-fast ease-out",
        // Focus + active (all variants)
        "focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 active:enabled:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-[0.35]",
        // Ghost: text-only, hover changes text color (link-like)
        variant() === "ghost" &&
          "bg-transparent text-text-secondary hover:enabled:text-focus",
        // Icon: icon-only, hover changes icon color
        variant() === "icon" &&
          "bg-transparent p-0 text-text-tertiary hover:enabled:text-focus",
        // Sizes
        size() === "xs" &&
          variant() !== "icon" &&
          "h-[24px] px-1.5 text-[11px]",
        size() === "sm" && variant() !== "icon" && "h-[26px] px-2 text-[12px]",
        // Icon sizes
        size() === "xs" && variant() === "icon" && "size-[24px]",
        size() === "sm" && variant() === "icon" && "size-[26px]",
        local.class
      )}
      type={local.type ?? "button"}
      {...rest}
    >
      {local.children}
    </button>
  );
}
