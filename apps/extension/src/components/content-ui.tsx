import type { Accessor, JSX } from "solid-js";
import { FloatingActionBar } from "../components/floating-bar.tsx";
import { ToastProvider, useToast } from "../components/ui/toast.tsx";
import type { PickerAction } from "../core/actions/types.ts";

/**
 * Props for the ContentApp component.
 *
 * @public
 */
export interface ContentAppProps {
  /** The currently selected DOM element. */
  element: Accessor<Element | null>;
  /** Current output format. */
  format: Accessor<"markdown" | "html">;
  /** Whether exclusion mode is active. */
  isExclusionMode: Accessor<boolean>;
  /** Dispatched when the user clicks a bar button or changes format. */
  onAction: (action: PickerAction) => void;
  /** Called when the toast API is ready. */
  onToastReady: (showToast: (msg: string) => void) => void;
  /** Whether the floating bar is visible. */
  visible: Accessor<boolean>;
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
 * inside a Shadow DOM.
 *
 * @public
 */
export function ContentApp(props: ContentAppProps): JSX.Element {
  return (
    <ToastProvider>
      <ToastMount
        // biome-ignore lint/performance/noJsxPropsBind: mounted once in shadow root
        onReady={(api) => {
          props.onToastReady(api.showToast);
        }}
      />
      {props.visible() && props.element() && (
        <FloatingActionBar
          element={props.element}
          format={props.format}
          isExclusionMode={props.isExclusionMode}
          onAction={props.onAction}
        />
      )}
    </ToastProvider>
  );
}
