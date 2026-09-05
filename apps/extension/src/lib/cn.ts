import { type ClassValue, cn as shadcn } from "cn";

/**
 * Concatenates class names with Tailwind conflict deduplication, filtering out
 * falsy values and supporting object syntax `{ className: condition }`.
 *
 * @public
 */
export function cn(...inputs: ClassValue[]): string {
  return shadcn(inputs);
}
