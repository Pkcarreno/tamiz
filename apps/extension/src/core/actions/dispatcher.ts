import type { PickerAction, PickerActionType } from "./types.ts";

/**
 * A single subscription handler for a specific action type.
 *
 * @internal
 */
type ActionHandler = (action: PickerAction) => void;

/**
 * Centralized pub/sub dispatcher for {@link PickerAction} objects.
 *
 * Event sources — UI buttons, keyboard shortcuts, runtime messages — call
 * `dispatch`. Action handlers (registered via `on`) contain the side effects
 * (clipboard writes, file downloads, toasts, state-machine transitions).
 *
 * Unknown or unhandled action types are silently dropped; the dispatcher
 * never throws when no handler is registered.
 *
 * @public
 */
export interface ActionDispatcher {
  /**
   * Dispatch an action to all registered handlers of that action type.
   *
   * If no handler is registered for the action's `type`, the call is a
   * no-op — it does not throw.
   *
   * @param action - The action to dispatch.
   */
  dispatch: (action: PickerAction) => void;

  /**
   * Register a handler for a specific action type and return an
   * unsubscribe function.
   *
   * @param actionType - The action `type` to listen for.
   * @param handler    - Called synchronously whenever an action of `actionType` is dispatched.
   * @returns A function that removes the handler when called.
   */
  on: <T extends PickerActionType>(
    actionType: T,
    handler: (action: Extract<PickerAction, { type: T }>) => void
  ) => () => void;
}

/**
 * Create a new {@link ActionDispatcher} instance.
 *
 * Each dispatcher maintains its own independent handler registry; calling
 * `dispose` is unnecessary because handlers are removed via the unsubscribe
 * functions returned by `on`.
 *
 * @returns A fresh `ActionDispatcher`.
 *
 * @public
 */
export function createActionDispatcher(): ActionDispatcher {
  const handlers: Map<PickerActionType, Set<ActionHandler>> = new Map();

  return {
    dispatch(action) {
      const actionHandlers = handlers.get(action.type);
      if (actionHandlers) {
        for (const handler of actionHandlers) {
          handler(action);
        }
      }
    },

    on(actionType, handler) {
      let set = handlers.get(actionType);
      if (!set) {
        set = new Set<ActionHandler>();
        handlers.set(actionType, set);
      }
      // The dispatcher only invokes handlers registered for the matching
      // action type, so narrowing to ActionHandler is safe at the call site.
      set.add(handler as ActionHandler);

      return () => {
        handlers.get(actionType)?.delete(handler as ActionHandler);
      };
    },
  };
}
