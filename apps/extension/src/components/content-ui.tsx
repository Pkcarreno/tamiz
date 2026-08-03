import type { Accessor, JSX } from "solid-js";
import { FloatingActionBar } from "../components/floating-bar.tsx";
import { ToastProvider, useToast } from "../components/ui/toast.tsx";

/**
 * Props for the ContentApp component.
 *
 * @public
 */
export interface ContentAppProps {
  /** The currently selected DOM element. */
  element: Accessor<Element | null>;
  /** Current output format. */
  format: Accessor<"markdown" | "raw">;
  /** Callback when cancel is clicked. */
  onCancel: () => void;
  /** Callback when copy is requested. */
  onCopy: () => void;
  /** Callback when download is requested. */
  onDownload: () => void;
  /** Callback when format changes. */
  onFormatChange: (format: "markdown" | "raw") => void;
  /** Callback when ignore is clicked (placeholder). */
  onIgnore: () => void;
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
  const element = props.element();
  return (
    <ToastProvider>
      <ToastMount
        // biome-ignore lint/performance/noJsxPropsBind: mounted once in shadow root
        onReady={(api) => {
          // Expose toast API to parent scope
          (globalThis as Record<string, unknown>).__tamizShowToast =
            api.showToast;
        }}
      />
      {props.visible() && element && (
        <FloatingActionBar
          element={element}
          format={props.format()}
          onCancel={props.onCancel}
          onCopy={props.onCopy}
          onDownload={props.onDownload}
          onFormatChange={props.onFormatChange}
          onIgnore={props.onIgnore}
        />
      )}
    </ToastProvider>
  );
}
