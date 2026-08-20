import type { Channel } from "../channel.ts";
import type { Message } from "../types.ts";

/**
 * Internal sentinel key marking an error response payload.
 *
 * @internal
 */
const ERROR_SENTINEL = "__error" as const;

/**
 * Error response shape sent back through the message channel when a
 * background handler fails.
 *
 * @internal
 */
interface ErrorResponse {
  [ERROR_SENTINEL]: string;
}

/**
 * Determine whether a `sendResponse` value is an error payload that should
 * cause the `send` caller to reject rather than resolve.
 *
 * A plain `undefined` (the normal success outcome for void handlers) is NOT
 * an error — this mirrors the spec that "undefined outcome = success".
 *
 * @internal
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    ERROR_SENTINEL in response &&
    typeof (response as ErrorResponse)[ERROR_SENTINEL] === "string"
  );
}

/**
 * Minimal browser runtime interface for dependency injection.
 *
 * Only the methods used by {@link RuntimeChannel} are declared.
 *
 * @internal
 */
interface RuntimePort {
  onMessage: {
    addListener: (
      listener: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => boolean
    ) => void;
    removeListener: (
      listener: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => boolean
    ) => void;
  };
  sendMessage: (message: unknown) => Promise<unknown>;
}

/**
 * Dependency-injected construction options for {@link RuntimeChannel}.
 *
 * @public
 */
export interface RuntimeChannelOptions {
  /** WXT browser API (injected for testability). Only `runtime` is used. */
  browser: { runtime: RuntimePort };
}

/**
 * Channel over `browser.runtime` messaging (content ↔ background).
 *
 * Wraps the platform-specific `browser.runtime.sendMessage` /
 * `browser.runtime.onMessage` APIs behind the generic {@link Channel}
 * interface. Handles the Firefox promise-based `sendMessage` contract
 * (the listener must `return true` to keep the channel open for async
 * `sendResponse`) and the `__error` sentinel pattern for error
 * propagation.
 *
 * @public
 */
export class RuntimeChannel implements Channel<Message, Message> {
  private readonly browser: { runtime: RuntimePort };
  private userHandler:
    | ((message: Message, sender: unknown) => Promise<unknown>)
    | null = null;
  private runtimeListener:
    | ((
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void
      ) => boolean)
    | null = null;

  constructor(options: RuntimeChannelOptions) {
    this.browser = options.browser;
  }

  async send(message: Message): Promise<void> {
    const response = await this.browser.runtime.sendMessage(message);
    if (isErrorResponse(response)) {
      throw new Error(response[ERROR_SENTINEL]);
    }
  }

  onMessage(
    handler: (message: Message, sender: unknown) => Promise<unknown>
  ): void {
    this.userHandler = handler;
    if (this.runtimeListener !== null) {
      return;
    }
    this.runtimeListener = (
      message: unknown,
      sender: unknown,
      sendResponse: (response?: unknown) => void
    ): boolean => {
      const local = this.userHandler;
      if (local === null) {
        return false;
      }
      Promise.resolve()
        .then(() => local(message as Message, sender))
        .then((result) => sendResponse(result))
        .catch((err: unknown) => {
          console.error("[tamiz] runtime message handler error:", err);
          const msg =
            err instanceof Error ? err.message : String(err ?? "Unknown error");
          sendResponse({ [ERROR_SENTINEL]: msg });
        });
      return true;
    };
    this.browser.runtime.onMessage.addListener(this.runtimeListener);
  }

  dispose(): void {
    if (this.runtimeListener !== null) {
      this.browser.runtime.onMessage.removeListener(this.runtimeListener);
      this.runtimeListener = null;
    }
    this.userHandler = null;
  }
}
