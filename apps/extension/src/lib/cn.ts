import { cn as cnfast } from "cnfast";

/**
 * Concatenates class names, filtering out falsy values.
 *
 * @public
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return cnfast(inputs);
}
