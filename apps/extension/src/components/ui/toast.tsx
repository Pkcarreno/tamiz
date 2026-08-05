import type { JSX } from "solid-js";
import {
  createContext,
  createSignal,
  For,
  onCleanup,
  useContext,
} from "solid-js";

/**
 * A single toast notification item.
 *
 * @public
 */
export interface ToastItem {
  id: string;
  message: string;
}

/**
 * Toast context API — provides the `showToast` function.
 *
 * @public
 */
export interface ToastAPI {
  showToast: (message: string, duration?: number) => void;
}

/**
 * Props for the {@link ToastProvider} component.
 *
 * @public
 */
export interface ToastProviderProps {
  children: JSX.Element;
}

/** Default auto-dismiss delay in milliseconds. */
const DEFAULT_TOAST_DURATION = 2000;

const ToastContext = createContext<ToastAPI>();

/**
 * Provider component for the toast notification system.
 *
 * Wraps the application and renders a toast container fixed to the
 * bottom-center of the viewport. Use {@link useToast} to trigger toasts.
 *
 * @public
 */
export function ToastProvider(props: ToastProviderProps) {
  const [toasts, setToasts] = createSignal<ToastItem[]>([]);
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const showToast = (message: string, duration = DEFAULT_TOAST_DURATION) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.delete(id);
    }, duration);
    timers.set(id, timer);
  };

  const ctxValue: ToastAPI = { showToast };

  onCleanup(() => {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
  });

  return (
    <ToastContext.Provider value={ctxValue}>
      {props.children}
      <div class="pointer-events-none fixed bottom-5 left-1/2 z-[2147483000] flex -translate-x-1/2 flex-col items-center gap-2">
        <For each={toasts()}>
          {(toast) => (
            <div
              class="pointer-events-auto min-w-[180px] rounded-pill border border-border bg-ground-elevated px-4 py-2 text-center font-medium font-sans text-sm text-text shadow-lg backdrop-blur-[12px]"
              data-testid="tz-toast"
            >
              {toast.message}
            </div>
          )}
        </For>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to trigger toast notifications.
 *
 * Must be called within a {@link ToastProvider}. Returns an object with a
 * `showToast` function that accepts a message and an optional duration
 * (default 2000ms).
 *
 * @public
 */
export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
