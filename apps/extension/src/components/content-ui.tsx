import type { Accessor, JSX } from "solid-js";
import { FloatingActionBar } from "../components/floating-bar.tsx";
import { ToastProvider, useToast } from "../components/ui/toast.tsx";
import type { ShortcutRegistry } from "../core/keyboard/registry.ts";
import type {
  PickerAction,
  PickerSessionSnapshot,
} from "../core/session/types.ts";

/**
 * Props for the ContentApp component.
 *
 * @public
 */
export interface ContentAppProps {
  /** Dispatched when the user clicks a bar button or changes format. */
  onAction: (action: PickerAction) => void;
  /** Called when the toast API is ready. */
  onToastReady: (showToast: (msg: string) => void) => void;
  /** Shortcut registry for dynamic label lookup. */
  registry?: ShortcutRegistry;
  /** Reactive session snapshot accessor. */
  snapshot: Accessor<PickerSessionSnapshot>;
}

/**
 * Toast mount helper that exposes the toast API to the parent.
 *
 * @public
 */
export function ToastMount(props: {
  onReady: (api: { showToast: (msg: string) => void }) => void;
}): JSX.Element {
  const toast = useToast();
  props.onReady(toast);
  return null;
}

/**
 * Main content app component that renders the floating action bar
 * inside a Shadow DOM based on session snapshot state.
 *
 * @public
 */
export function ContentApp(props: ContentAppProps): JSX.Element {
  const isBarVisible = () =>
    props.snapshot().state === "SELECTED" &&
    props.snapshot().selectedElement !== null;

  return (
    <ToastProvider>
      <ToastMount
        onReady={(api) => {
          props.onToastReady(api.showToast);
        }}
      />
      {isBarVisible() && (
        <FloatingActionBar
          onAction={props.onAction}
          registry={props.registry}
          snapshot={props.snapshot}
        />
      )}
    </ToastProvider>
  );
}
