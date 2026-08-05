import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button variant definitions.
 *
 * @public
 */
export const buttonVariants = cva("tz-btn", {
  compoundVariants: [
    { class: "tz-btn-icon tz-btn-icon-sm", size: "sm", variant: "icon" },
    { class: "tz-btn-icon tz-btn-icon-md", size: "md", variant: "icon" },
  ],
  defaultVariants: { size: "md", variant: "primary" },
  variants: {
    size: {
      md: "tz-btn-md",
      sm: "tz-btn-sm",
    },
    variant: {
      ghost: "tz-btn-ghost",
      icon: "tz-btn-primary",
      primary: "tz-btn-primary",
      secondary: "tz-btn-secondary",
    },
  },
});

/** @public */
export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

/**
 * Select variant definitions.
 *
 * @public
 */
export const selectVariants = cva("tz-select", {
  defaultVariants: { size: "md" },
  variants: {
    size: {
      md: "",
      sm: "tz-select-sm",
    },
  },
});

/** @public */
export type SelectVariantProps = VariantProps<typeof selectVariants>;

/**
 * Toast variant definitions (currently single variant, future-proof).
 *
 * @public
 */
export const toastVariants = cva("tz-toast");

/** @public */
export type ToastVariantProps = VariantProps<typeof toastVariants>;
