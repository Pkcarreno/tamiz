/**
 * Feature detection utilities for browser API availability.
 *
 * These functions check whether specific browser APIs exist at runtime
 * rather than relying on build-time environment variables. This approach
 * mirrors the pattern in `packages/html-converter/src/dom.ts`
 * (`hasNativeDomParser`) and works correctly across all browsers.
 *
 * @public
 */

/**
 * Check whether the Clipboard API (`navigator.clipboard.writeText`) is
 * available in the current context.
 *
 * Returns `false` in service workers, non-secure contexts, or when
 * the user has denied clipboard permission.
 *
 * @returns `true` when `navigator.clipboard.writeText` is a function.
 *
 * @public
 */
export function isClipboardAvailable(): boolean {
  return typeof navigator.clipboard?.writeText === "function";
}

/**
 * Check whether `URL.createObjectURL` is available in the current context.
 *
 * Chrome MV3 service workers do not support `createObjectURL` — using it
 * crashes the worker. Firefox MV2 background pages support it. This
 * function enables runtime routing instead of build-time `BROWSER` checks.
 *
 * @returns `true` when `URL.createObjectURL` is a function.
 *
 * @public
 */
export function isBlobUrlAvailable(): boolean {
  return typeof URL.createObjectURL === "function";
}
