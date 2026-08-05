import { type ClassValue, cn as cnfast } from "cnfast";

/**
 * Concatenates class names with Tailwind conflict deduplication, filtering out
 * falsy values and supporting object syntax `{ className: condition }`.
 *
 * @public
 */
export function cn(...inputs: ClassValue[]): string {
  return cnfast(inputs);
}
