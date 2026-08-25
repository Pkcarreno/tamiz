import type { Channel } from "../channel.ts";
import { CROSS_WORLD_MESSAGE_TYPES } from "../constants.ts";
import type { CrossWorldMessage } from "../types.ts";

/**
 * Channel over `window.postMessage` for cross-world communication
 * (content isolated world ↔ main world).
 *
 * Uses only DOM APIs — safe for main-world scripts that run via
 * `injectScript` and have no access to WXT or `browser.*` APIs.
 *
 * All messages are posted with `targetOrigin: "*"` because the
 * counterpart lives in a different world with no verifiable origin.
 *
 * @public
 */
export class PostMessageChannel
  implements Channel<CrossWorldMessage, CrossWorldMessage>
{
  private disposed = false;
  private userHandler:
    | ((message: CrossWorldMessage, sender: unknown) => Promise<unknown>)
    | null = null;
  private domListener: ((event: MessageEvent) => void) | null = null;

  send(message: CrossWorldMessage): void {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard — disposed can be true after dispose()
    if (this.disposed) {
      throw new Error("PostMessageChannel: send after dispose");
    }
    window.postMessage(message, "*");
  }

  onMessage(
    handler: (message: CrossWorldMessage, sender: unknown) => Promise<unknown>
  ): void {
    // biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard — disposed can be true after dispose()
    if (this.disposed) {
      throw new Error("PostMessageChannel: onMessage after dispose");
    }
    this.userHandler = handler;
    if (this.domListener !== null) {
      return;
    }
    this.domListener = (event: MessageEvent): void => {
      const data = event.data as { type?: unknown } | null;
      if (
        data === null ||
        typeof data !== "object" ||
        typeof data.type !== "string"
      ) {
        return;
      }
      if (
        !(CROSS_WORLD_MESSAGE_TYPES as readonly string[]).includes(data.type)
      ) {
        return;
      }
      const local = this.userHandler;
      if (local === null) {
        return;
      }
      local(data as CrossWorldMessage, event.source);
    };
    window.addEventListener("message", this.domListener);
  }

  dispose(): void {
    if (this.domListener !== null) {
      window.removeEventListener("message", this.domListener);
      this.domListener = null;
    }
    this.userHandler = null;
    this.disposed = true;
  }
}
