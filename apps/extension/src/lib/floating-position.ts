import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  type Placement,
  type Strategy,
  shift,
} from "@floating-ui/dom";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

/**
 * Options for the {@link useFloatingPosition} primitive.
 *
 * @public
 */
export interface FloatingPositionOptions {
  /** The floating element to position. */
  floatingRef: Accessor<Element | null>;
  /** Preferred placement of the floating element relative to the reference. */
  placement: Placement;
  /** CSS position strategy for the floating element. */
  strategy: Strategy;
}

/**
 * Result returned by {@link useFloatingPosition}.
 *
 * @public
 */
export interface FloatingPositionResult {
  /** The left offset for the floating element. */
  left: Accessor<number>;
  /** The top offset for the floating element. */
  top: Accessor<number>;
  /** Recompute the floating element's position immediately. */
  update: () => void;
}

/**
 * SolidJS primitive that positions a floating element relative to a reference
 * element using @floating-ui/dom.
 *
 * Wraps `computePosition` and `autoUpdate`: a `createEffect` re-runs whenever
 * the reference element or floating element changes, setting up a fresh
 * `autoUpdate` subscription on each run.
 *
 * @public
 */
export function useFloatingPosition(
  element: Accessor<Element | null>,
  options: FloatingPositionOptions
): FloatingPositionResult {
  const [left, setLeft] = createSignal(0);
  const [top, setTop] = createSignal(0);

  const update = (): void => {
    const reference = element();
    const floating = options.floatingRef();
    if (!(reference && floating)) {
      return;
    }

    computePosition(reference, floating as HTMLElement, {
      middleware: [offset(8), flip(), shift({ padding: 8 })],
      placement: options.placement,
      strategy: options.strategy,
    }).then(({ x, y }) => {
      setLeft(x);
      setTop(y);
    });
  };

  createEffect(() => {
    const reference = element();
    const floating = options.floatingRef();
    if (!(reference && floating)) {
      return;
    }

    update();
    const cleanup = autoUpdate(reference, floating as HTMLElement, update, {
      ancestorScroll: true,
    });
    onCleanup(cleanup);
  });

  return { left, top, update };
}
