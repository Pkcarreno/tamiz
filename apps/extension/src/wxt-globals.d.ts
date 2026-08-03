/**
 * WXT auto-imported globals for content scripts.
 *
 * These are provided by WXT at build time and don't need explicit imports.
 * Type declarations mirror the real WXT API exported from
 * `wxt/utils/content-script-ui/shadow-root` and
 * `wxt/utils/define-content-script` to ensure correct usage at compile time.
 */

import type { ContentScriptContext } from "wxt/utils/content-script-context";
import type {
  ShadowRootContentScriptUi,
  ShadowRootContentScriptUiOptions,
} from "wxt/utils/content-script-ui/shadow-root";

declare global {
  function defineContentScript(definition: {
    main: (ctx: ContentScriptContext) => void | Promise<void>;
    matches: string[];
  }): void;

  function createShadowRootUi<TMounted>(
    ctx: ContentScriptContext,
    options: ShadowRootContentScriptUiOptions<TMounted>
  ): Promise<ShadowRootContentScriptUi<TMounted>>;
}
