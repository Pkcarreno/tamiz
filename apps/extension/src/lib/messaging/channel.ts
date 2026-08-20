/**
 * Generic bidirectional message channel.
 *
 * `send` dispatches a message to the counterpart and resolves when the
 * counterpart handler completes (or rejects on transport / handler error).
 * `onMessage` registers a single inbound handler. `dispose` releases
 * resources held by the channel.
 *
 * @typeParam TSend    - Message type emitted by this side of the channel.
 * @typeParam TReceive - Message type accepted from the counterpart.
 *                       Defaults to `TSend` for symmetric channels.
 *
 * @public
 */
export interface Channel<TSend, TReceive = TSend> {
  /**
   * Release resources held by the channel.
   *
   * Safe to call multiple times (idempotent). After disposal, `send`
   * and `onMessage` behave according to the adapter contract:
   * runtime channels clear the handler reference; postMessage channels
   * throw on `send`/`onMessage`.
   */
  dispose: () => void;

  /**
   * Register the handler invoked for each inbound message.
   *
   * The handler receives the typed message and an opaque sender reference
   * (platform-specific: `Browser.runtime.MessageSender` for runtime,
   * `window` for postMessage). The handler returns a value that the
   * transport sends back to the sender (runtime channels) or ignores
   * (postMessage channels).
   */
  onMessage: (
    handler: (message: TReceive, sender: unknown) => Promise<unknown>
  ) => void;

  /**
   * Send `message` to the counterpart and await its handler result.
   *
   * For runtime channels this is request/response (resolves on success,
   * rejects on error sentinel). For postMessage channels this is
   * fire-and-forget (always resolves).
   */
  send: (message: TSend) => Promise<void> | void;
}
